import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './schemas/order.schema';

type StatsGroupBy = 'day' | 'week' | 'month' | 'quarter';
type StatsRangeInput = {
  days?: number;
  weeks?: number;
  months?: number;
  quarters?: number;
};
type TopSortBy = 'quantity' | 'revenue' | 'profit';

@Injectable()
export class OrdersAnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  private normalizeStatsGroupBy(groupBy?: string): StatsGroupBy {
    if (groupBy === 'week' || groupBy === 'month' || groupBy === 'quarter')
      return groupBy;
    return 'day';
  }

  private clampPositiveInt(value: any, fallback: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), max);
  }

  private resolveStatsRangeValue(
    groupBy: StatsGroupBy,
    range?: StatsRangeInput,
  ) {
    if (groupBy === 'quarter')
      return this.clampPositiveInt(range?.quarters, 4, 20);
    if (groupBy === 'week') return this.clampPositiveInt(range?.weeks, 12, 104);
    if (groupBy === 'month')
      return this.clampPositiveInt(range?.months, 12, 60);
    return this.clampPositiveInt(range?.days, 30, 366);
  }

  private buildComparisonDates(groupBy: StatsGroupBy, range?: StatsRangeInput) {
    const value = this.resolveStatsRangeValue(groupBy, range);
    const currentStart = new Date();
    const previousStart = new Date();

    currentStart.setHours(0, 0, 0, 0);
    previousStart.setHours(0, 0, 0, 0);

    if (groupBy === 'day') {
      currentStart.setDate(currentStart.getDate() - (value - 1));
      previousStart.setDate(currentStart.getDate() - value);
    } else if (groupBy === 'week') {
      const dayOffset = (currentStart.getDay() + 6) % 7;
      currentStart.setDate(
        currentStart.getDate() - dayOffset - (value - 1) * 7,
      );
      previousStart.setDate(currentStart.getDate() - value * 7);
    } else if (groupBy === 'month') {
      currentStart.setDate(1);
      currentStart.setMonth(currentStart.getMonth() - (value - 1));
      previousStart.setDate(1);
      previousStart.setMonth(currentStart.getMonth() - value);
    } else if (groupBy === 'quarter') {
      const currentMonth = currentStart.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      currentStart.setDate(1);
      currentStart.setMonth(quarterStartMonth - (value - 1) * 3);
      previousStart.setDate(1);
      previousStart.setMonth(currentStart.getMonth() - value * 3);
    }

    return { previousStart, currentStart, value };
  }

  private buildPeriodGroupExpr(field: string, groupBy: StatsGroupBy) {
    const dateRef = `$${field}`;
    if (groupBy === 'day') {
      return {
        $dateToString: {
          format: '%Y-%m-%d',
          date: dateRef,
          timezone: 'Asia/Ho_Chi_Minh',
        },
      };
    }
    if (groupBy === 'week') {
      return { year: { $isoWeekYear: dateRef }, week: { $isoWeek: dateRef } };
    }
    if (groupBy === 'quarter') {
      return {
        year: { $year: { date: dateRef, timezone: 'Asia/Ho_Chi_Minh' } },
        quarter: {
          $ceil: {
            $divide: [
              { $month: { date: dateRef, timezone: 'Asia/Ho_Chi_Minh' } },
              3,
            ],
          },
        },
      };
    }
    return {
      $dateToString: {
        format: '%Y-%m',
        date: dateRef,
        timezone: 'Asia/Ho_Chi_Minh',
      },
    };
  }

  private buildPeriodProjectExpr(
    groupBy: StatsGroupBy,
    sourcePath = '$_id',
  ): Record<string, any> {
    if (groupBy === 'day' || groupBy === 'month') return { period: sourcePath };
    if (groupBy === 'quarter') {
      return {
        period: {
          $concat: [
            { $toString: `${sourcePath}.year` },
            '-Q',
            { $toString: `${sourcePath}.quarter` },
          ],
        },
      };
    }
    return {
      period: {
        $concat: [
          { $toString: `${sourcePath}.year` },
          '-W',
          {
            $cond: [
              { $lt: [`${sourcePath}.week`, 10] },
              { $concat: ['0', { $toString: `${sourcePath}.week` }] },
              { $toString: `${sourcePath}.week` },
            ],
          },
        ],
      },
    };
  }

  private calculateGrowth(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private getTrend(current: number, previous: number) {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'flat';
  }

  private normalizeTopSortBy(sortBy?: string): TopSortBy {
    if (sortBy === 'revenue' || sortBy === 'profit') return sortBy;
    return 'quantity';
  }

  async getProductsSoldByDay(days = 7) {
    const safeDays = this.clampPositiveInt(days, 7, 366);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    return this.orderModel.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: start } } },
      { $addFields: { soldAt: '$completedAt' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$soldAt',
                timezone: 'Asia/Ho_Chi_Minh',
              },
            },
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.lineTotal' },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: { day: 1 } },
    ]);
  }

  async getRevenueStats(
    groupBy: StatsGroupBy = 'day',
    range?: StatsRangeInput,
  ) {
    const normalizedGroupBy = this.normalizeStatsGroupBy(groupBy);
    const { previousStart, currentStart, value } = this.buildComparisonDates(
      normalizedGroupBy,
      range,
    );

    const rawItems = await this.orderModel.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: previousStart } } },
      {
        $addFields: {
          soldAt: '$completedAt',
          grossRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: { $ifNull: ['$$item.lineTotal', 0] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: this.buildPeriodGroupExpr('soldAt', normalizedGroupBy),
          firstDate: { $min: '$soldAt' },
          orderCount: { $sum: 1 },
          grossRevenue: { $sum: '$grossRevenue' },
          discountAmount: { $sum: { $ifNull: ['$discountAmount', 0] } },
          netRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          ...this.buildPeriodProjectExpr(normalizedGroupBy),
          firstDate: 1,
          orderCount: 1,
          grossRevenue: 1,
          discountAmount: 1,
          netRevenue: 1,
        },
      },
      { $sort: { firstDate: 1 } },
    ]);

    const currentItems: any[] = [];
    const currentSummary = {
      orderCount: 0,
      grossRevenue: 0,
      discountAmount: 0,
      netRevenue: 0,
    };
    const previousSummary = {
      orderCount: 0,
      grossRevenue: 0,
      discountAmount: 0,
      netRevenue: 0,
    };

    for (const item of rawItems) {
      const isCurrent = new Date(item.firstDate) >= currentStart;
      delete item.firstDate;
      if (isCurrent) {
        currentItems.push(item);
        currentSummary.orderCount += item.orderCount || 0;
        currentSummary.grossRevenue += item.grossRevenue || 0;
        currentSummary.discountAmount += item.discountAmount || 0;
        currentSummary.netRevenue += item.netRevenue || 0;
      } else {
        previousSummary.orderCount += item.orderCount || 0;
        previousSummary.grossRevenue += item.grossRevenue || 0;
        previousSummary.discountAmount += item.discountAmount || 0;
        previousSummary.netRevenue += item.netRevenue || 0;
      }
    }

    return {
      groupBy: normalizedGroupBy,
      range: value,
      summary: {
        current: currentSummary,
        previous: previousSummary,
        growth: {
          netRevenue: this.calculateGrowth(
            currentSummary.netRevenue,
            previousSummary.netRevenue,
          ),
          trend: this.getTrend(
            currentSummary.netRevenue,
            previousSummary.netRevenue,
          ),
        },
      },
      chartData: currentItems,
    };
  }

  async getProfitStats(groupBy: StatsGroupBy = 'day', range?: StatsRangeInput) {
    const normalizedGroupBy = this.normalizeStatsGroupBy(groupBy);
    const { previousStart, currentStart, value } = this.buildComparisonDates(
      normalizedGroupBy,
      range,
    );

    const rawItems = await this.orderModel.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: previousStart } } },
      {
        $addFields: {
          soldAt: '$completedAt',
          grossRevenue: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: { $ifNull: ['$$item.lineTotal', 0] },
              },
            },
          },
          cogs: {
            $sum: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $cond: [
                    {
                      $gt: [
                        { $size: { $ifNull: ['$$item.lotAllocations', []] } },
                        0,
                      ],
                    },
                    {
                      $sum: {
                        $map: {
                          input: '$$item.lotAllocations',
                          as: 'alloc',
                          in: {
                            $multiply: [
                              { $ifNull: ['$$alloc.unitCost', 0] },
                              { $ifNull: ['$$alloc.quantity', 0] },
                            ],
                          },
                        },
                      },
                    },
                    {
                      $multiply: [
                        { $ifNull: ['$$item.unitCostSnapshot', 0] },
                        { $ifNull: ['$$item.quantity', 0] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: this.buildPeriodGroupExpr('soldAt', normalizedGroupBy),
          firstDate: { $min: '$soldAt' },
          orderCount: { $sum: 1 },
          grossRevenue: { $sum: '$grossRevenue' },
          netRevenue: { $sum: { $ifNull: ['$totalAmount', 0] } },
          cogs: { $sum: '$cogs' },
          shippingCost: { $sum: { $ifNull: ['$shipping.fee', 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          ...this.buildPeriodProjectExpr(normalizedGroupBy),
          firstDate: 1,
          orderCount: 1,
          grossRevenue: 1,
          netRevenue: 1,
          cogs: 1,
          grossProfit: { $subtract: ['$grossRevenue', '$cogs'] },
          netProfit: {
            $subtract: ['$netRevenue', { $add: ['$cogs', '$shippingCost'] }],
          },
        },
      },
      { $sort: { firstDate: 1 } },
    ]);

    const currentItems: any[] = [];
    const currentSummary = {
      netRevenue: 0,
      cogs: 0,
      shippingCost: 0,
      netProfit: 0,
    };
    const previousSummary = {
      netRevenue: 0,
      cogs: 0,
      shippingCost: 0,
      netProfit: 0,
    };

    for (const item of rawItems) {
      const isCurrent = new Date(item.firstDate) >= currentStart;
      delete item.firstDate;
      if (isCurrent) {
        currentItems.push(item);
        currentSummary.netRevenue += item.netRevenue || 0;
        currentSummary.cogs += item.cogs || 0;
        currentSummary.shippingCost += item.shippingCost || 0;
        currentSummary.netProfit += item.netProfit || 0;
      } else {
        previousSummary.netRevenue += item.netRevenue || 0;
        previousSummary.cogs += item.cogs || 0;
        previousSummary.shippingCost += item.shippingCost || 0;
        previousSummary.netProfit += item.netProfit || 0;
      }
    }
    return {
      groupBy: normalizedGroupBy,
      range: value,
      summary: {
        current: currentSummary,
        previous: previousSummary,
        growth: {
          netProfit: this.calculateGrowth(
            currentSummary.netProfit,
            previousSummary.netProfit,
          ),
          trend: this.getTrend(
            currentSummary.netProfit,
            previousSummary.netProfit,
          ),
        },
      },
      chartData: currentItems,
    };
  }

  async getTopSkus(days = 30, limit = 10, sortBy: TopSortBy = 'quantity') {
    const safeDays = this.clampPositiveInt(days, 30, 366);
    const safeLimit = this.clampPositiveInt(limit, 10, 100);
    const safeSortBy = this.normalizeTopSortBy(sortBy);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    const sortStage: Record<string, 1 | -1> =
      safeSortBy === 'revenue'
        ? { grossRevenue: -1, quantitySold: -1, grossProfit: -1, sku: 1 }
        : safeSortBy === 'profit'
          ? { grossProfit: -1, grossRevenue: -1, quantitySold: -1, sku: 1 }
          : { quantitySold: -1, grossRevenue: -1, grossProfit: -1, sku: 1 };

    const items = await this.orderModel.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: start } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.sku',
          productId: { $first: '$items.productId' },
          sku: { $first: '$items.sku' },
          name: { $first: '$items.name' },
          imageUrl: { $first: '$items.imageUrl' },
          attributes: { $first: '$items.attributes' },
          quantitySold: { $sum: '$items.quantity' },
          grossRevenue: { $sum: '$items.lineTotal' },
          estimatedCost: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $size: { $ifNull: ['$items.lotAllocations', []] } },
                    0,
                  ],
                },
                {
                  $sum: {
                    $map: {
                      input: '$items.lotAllocations',
                      as: 'alloc',
                      in: {
                        $multiply: [
                          { $ifNull: ['$$alloc.unitCost', 0] },
                          { $ifNull: ['$$alloc.quantity', 0] },
                        ],
                      },
                    },
                  },
                },
                {
                  $multiply: [
                    { $ifNull: ['$items.unitCostSnapshot', 0] },
                    { $ifNull: ['$items.quantity', 0] },
                  ],
                },
              ],
            },
          },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          productId: 1,
          sku: 1,
          name: 1,
          imageUrl: 1,
          attributes: 1,
          quantitySold: 1,
          grossRevenue: 1,
          estimatedCost: 1,
          grossProfit: { $subtract: ['$grossRevenue', '$estimatedCost'] },
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: sortStage },
      { $limit: safeLimit },
    ]);

    return { days: safeDays, limit: safeLimit, sortBy: safeSortBy, items };
  }

  async getTopProducts(days = 30, limit = 10, sortBy: TopSortBy = 'quantity') {
    const safeDays = this.clampPositiveInt(days, 30, 366);
    const safeLimit = this.clampPositiveInt(limit, 10, 100);
    const safeSortBy = this.normalizeTopSortBy(sortBy);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (safeDays - 1));

    const sortStage: Record<string, 1 | -1> =
      safeSortBy === 'revenue'
        ? { grossRevenue: -1, quantitySold: -1, grossProfit: -1, name: 1 }
        : safeSortBy === 'profit'
          ? { grossProfit: -1, grossRevenue: -1, quantitySold: -1, name: 1 }
          : { quantitySold: -1, grossRevenue: -1, grossProfit: -1, name: 1 };

    const items = await this.orderModel.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: start } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          imageUrl: { $first: '$items.imageUrl' },
          skuSet: { $addToSet: '$items.sku' },
          quantitySold: { $sum: '$items.quantity' },
          grossRevenue: { $sum: '$items.lineTotal' },
          estimatedCost: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $size: { $ifNull: ['$items.lotAllocations', []] } },
                    0,
                  ],
                },
                {
                  $sum: {
                    $map: {
                      input: '$items.lotAllocations',
                      as: 'alloc',
                      in: {
                        $multiply: [
                          { $ifNull: ['$$alloc.unitCost', 0] },
                          { $ifNull: ['$$alloc.quantity', 0] },
                        ],
                      },
                    },
                  },
                },
                {
                  $multiply: [
                    { $ifNull: ['$items.unitCostSnapshot', 0] },
                    { $ifNull: ['$items.quantity', 0] },
                  ],
                },
              ],
            },
          },
          orderIds: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: 1,
          imageUrl: 1,
          skus: '$skuSet',
          skuCount: { $size: '$skuSet' },
          quantitySold: 1,
          grossRevenue: 1,
          estimatedCost: 1,
          grossProfit: { $subtract: ['$grossRevenue', '$estimatedCost'] },
          orderCount: { $size: '$orderIds' },
        },
      },
      { $sort: sortStage },
      { $limit: safeLimit },
    ]);

    return { days: safeDays, limit: safeLimit, sortBy: safeSortBy, items };
  }
}

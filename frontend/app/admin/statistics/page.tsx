"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear 
} from "date-fns";
import { orderApi, inventoryApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

// New Components
import { Period, PeriodData, periodLabels } from "@/components/admin/statistics/StatisticsData";
import PeriodSelector from "@/components/admin/statistics/PeriodSelector";
import SummaryCards from "@/components/admin/statistics/SummaryCards";
import ProfitChart from "@/components/admin/statistics/ProfitChart";
import DetailTables from "@/components/admin/statistics/DetailTables";

const StatisticsPage = () => {
  const { isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<any>(null);

  const fetchData = useCallback(async (currentPeriod: Period, date: Date) => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;
      let groupBy = "day";

      const targetDate = new Date(date);

      switch (currentPeriod) {
        case "day":
          startDate = startOfDay(targetDate);
          endDate = endOfDay(targetDate);
          groupBy = "hour";
          break;
        case "week":
          startDate = startOfWeek(targetDate, { weekStartsOn: 1 });
          endDate = endOfWeek(targetDate, { weekStartsOn: 1 });
          groupBy = "day";
          break;
        case "month":
          startDate = startOfMonth(targetDate);
          endDate = endOfMonth(targetDate);
          groupBy = "day";
          break;
        case "quarter":
          startDate = startOfQuarter(targetDate);
          endDate = endOfQuarter(targetDate);
          groupBy = "month";
          break;
        case "year":
          startDate = startOfYear(targetDate);
          endDate = endOfYear(targetDate);
          groupBy = "month";
          break;
        default:
          startDate = startOfWeek(new Date());
          endDate = endOfWeek(new Date());
      }

      const params: any = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy,
      };

      // Fallback days for endpoints that prefer rolling window offsets
      const diffInDays = Math.max(1, Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      params.days = diffInDays;

      const topParams = { 
        ...params,
        limit: 1000,
        sortBy: "quantity" as const
      };

      const safeFetch = async (promise: Promise<any>, defaultValue: any) => {
        try {
          const res = await promise;
          return res.data;
        } catch (error) {
          console.error("API Call failed:", error);
          return defaultValue;
        }
      };

      const [
        rev, 
        prof, 
        inv, 
        topSkusRes, 
        topProductsRes,
        lotsRes
      ] = await Promise.all([
        safeFetch(orderApi.getRevenueStats(params), { summary: { current: {} }, chartData: [] }),
        safeFetch(orderApi.getProfitStats(params), { summary: { current: {} }, chartData: [] }),
        safeFetch(inventoryApi.getStockInStats(params), { summary: {} }),
        safeFetch(orderApi.getTopSkus(topParams), { items: [] }),
        safeFetch(orderApi.getTopProducts(topParams), { items: [] }),
        safeFetch(inventoryApi.getLots({ ...params, excludeOpening: true }), [])
      ]);

      const topSkus = topSkusRes?.items || [];
      const topProducts = topProductsRes?.items || [];
      const recentLots = Array.isArray(lotsRes) ? lotsRes : [];

      const revChart = rev?.chartData || [];
      const profChart = prof?.chartData || [];
      const chartMap = new Map();
      
      revChart.forEach((item: any) => {
        chartMap.set(item.period, {
          label: item.period,
          revenue: item.netRevenue || item.totalRevenue || 0,
          cost: 0,
          profit: 0
        });
      });

      profChart.forEach((item: any) => {
        const existing = chartMap.get(item.period) || { label: item.period, revenue: 0 };
        chartMap.set(item.period, {
          ...existing,
          cost: item.cogs || item.cost || 0,
          shipping: item.shippingCost || 0,
          profit: item.netProfit || item.profit || 0
        });
      });

      const chartItems = Array.from(chartMap.values()).sort((a, b) => a.label.localeCompare(b.label));

      setRawData({
        revenue: rev?.summary || {},
        profit: prof?.summary || {},
        inventory: inv?.summary || {},
        chartItems,
        topSkus,
        topProducts,
        recentLots,
      });

    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData(period, selectedDate);
  }, [period, selectedDate, fetchData]);

  const data: PeriodData | null = useMemo(() => {
    if (!rawData) return null;

    const netRevenue = rawData.revenue.current?.netRevenue || rawData.revenue.current?.totalRevenue || 0;
    const netProfit = rawData.profit.current?.netProfit || rawData.profit.current?.totalProfit || 0;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    return {
      importTotal: rawData.inventory.totalStockInCost || 0,
      importQuantity: rawData.inventory.totalQuantity || 0,
      importProducts: rawData.inventory.totalLots || 0,
      salesTotal: netRevenue,
      salesQuantity: rawData.revenue.current?.totalQuantity || rawData.revenue.current?.orderCount || 0,
      salesProducts: rawData.topSkus.length,
      profit: netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      revenueGrowth: rawData.revenue.growth ? {
        percentage: rawData.revenue.growth.netRevenue || 0,
        trend: rawData.revenue.growth.trend || "flat"
      } : undefined,
      profitGrowth: rawData.profit.growth ? {
        percentage: rawData.profit.growth.netProfit || 0,
        trend: rawData.profit.growth.trend || "flat"
      } : undefined,
      importDetails: rawData.recentLots.map((lot: any) => ({
        name: lot.productId?.name || "N/A",
        sku: lot.sku || "N/A",
        quantity: lot.originalQuantity || 0,
        cost: (lot.unitCost || 0) * (lot.originalQuantity || 0),
        image: lot.imageUrl,
        date: lot.receivedAt
      })),
      salesDetails: rawData.topSkus.map((sku: any) => ({
        name: sku.name,
        sku: sku.sku || "N/A",
        quantity: sku.quantitySold || 0,
        revenue: sku.grossRevenue || 0,
        shipping: sku.allocatedShipping || 0,
        image: sku.imageUrl,
        profitMargin: sku.grossRevenue > 0 ? ((sku.grossProfit || 0) / sku.grossRevenue) * 100 : 0
      })),
      bestSellers: rawData.topProducts.map((p: any) => ({
        name: p.name,
        sold: p.quantitySold || 0,
        revenue: p.grossRevenue || 0,
        change: 0,
        image: p.imageUrl
      })),
      profitChart: rawData.chartItems.map((item: any) => {
        let label = item.label;
        if (label.includes('-')) {
          const parts = label.split('-');
          if (parts.length === 3) {
            label = `${parts[2]}/${parts[1]}`;
          } else if (parts.length === 2) {
            label = `${parts[1]}/${parts[0]}`;
          }
        }
        return {
          label,
          revenue: item.revenue,
          cost: item.cost,
          shipping: item.shipping || 0,
          profit: item.profit
        };
      })
    };
  }, [rawData]);

  const periodLabel = periodLabels[period];

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium animate-pulse">Đang kết nối dữ liệu từ hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.2);
        }
      `}</style>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Báo cáo Thống kê</h1>
          <p className="text-muted-foreground">Dữ liệu kinh doanh được cập nhật trực tiếp từ hệ thống</p>
        </div>
        <PeriodSelector
          period={period}
          setPeriod={setPeriod}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </div>

      <SummaryCards data={data} periodLabel={periodLabel} />
      <ProfitChart data={data.profitChart} />
      <DetailTables data={data} periodLabel={periodLabel} />
    </div>
  );
};

export default StatisticsPage;

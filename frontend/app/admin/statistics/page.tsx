"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import {
  Package, ShoppingCart, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Trophy, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { orderApi, inventoryApi } from "@/services/api";

type Period = "day" | "week" | "month";

const formatCurrency = (value: number) => {
  if (!value) return "0đ";
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  return value.toLocaleString("vi-VN") + "đ";
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
];

const StatisticsPage = () => {
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = async (currentPeriod: Period) => {
    setLoading(true);
    try {
      const rangeParams: any = {
        groupBy: "day",
      };
      
      if (currentPeriod === "day") rangeParams.days = 1;
      else if (currentPeriod === "week") rangeParams.days = 7;
      else if (currentPeriod === "month") rangeParams.months = 1;

      const [revenueRes, profitRes, inventoryStatsRes, topProductsRes, lotsRes] = await Promise.all([
        orderApi.getRevenueStats(rangeParams),
        orderApi.getProfitStats(rangeParams),
        inventoryApi.getStockInStats(rangeParams),
        orderApi.getTopSkus({ days: currentPeriod === 'day' ? 1 : currentPeriod === 'week' ? 7 : 30, limit: 10 }),
        inventoryApi.getLots() // Recently imported lots
      ]);

      const revenueData = revenueRes.data;
      const profitData = profitRes.data;
      const inventoryData = inventoryStatsRes.data;
      const topProducts = topProductsRes.data?.items || [];
      const recentLots = (lotsRes.data || []).slice(0, 10);

      // Transform profit chart data
      const chartItems = (profitData.items || []).map((item: any) => ({
        label: item.period,
        revenue: item.netRevenue || 0,
        cost: item.cogs || 0,
        profit: item.profit || 0,
      }));

      setData({
        importTotal: inventoryData.summary.totalStockInCost || 0,
        importQuantity: inventoryData.summary.totalQuantity || 0,
        importProducts: inventoryData.summary.totalLots || 0,
        salesTotal: revenueData.summary.totalNetRevenue || 0,
        salesQuantity: revenueData.summary.totalOrders || 0,
        salesProducts: topProducts.length,
        profit: profitData.summary.totalProfit || 0,
        profitMargin: (revenueData.summary.totalNetRevenue > 0) 
          ? ((profitData.summary.totalProfit / revenueData.summary.totalNetRevenue) * 100).toFixed(1) 
          : 0,
        importDetails: recentLots.map((lot: any) => ({
          name: lot.productId?.name || "N/A",
          sku: lot.sku || "N/A",
          attributes: lot.variant?.attributes || [],
          image: lot.imageUrl,
          quantity: lot.originalQuantity,
          cost: lot.originalQuantity * lot.unitCost,
        })),
        salesDetails: topProducts.slice(0, 10).map((p: any) => ({
          name: p.name,
          sku: p.sku || "N/A",
          attributes: p.attributes || [],
          image: p.imageUrl || p.image,
          quantity: p.quantitySold || p.quantity,
          revenue: p.grossRevenue || p.revenue,
        })),
        bestSellers: topProducts.map((p: any) => ({
          name: p.name,
          sku: p.sku || "N/A",
          attributes: p.attributes || [],
          sold: p.quantitySold || p.quantity,
          revenue: p.grossRevenue || p.revenue,
          change: 0,
          image: p.imageUrl || p.image,
        })),
        profitChart: chartItems,
      });

    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period);
  }, [period]);

  const periodLabel = { day: "hôm nay", week: "tuần này", month: "tháng này" }[period];

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium animate-pulse">Đang tổng hợp số liệu báo cáo...</p>
      </div>
    );
  }

  const pieData = data.bestSellers.slice(0, 5).map((item: any) => ({
    name: item.name,
    value: item.sold,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Thống kê</h1>
          <p className="text-sm text-muted-foreground font-medium italic">Báo cáo chi tiết hiệu suất kinh doanh</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="day">Ngày</TabsTrigger>
            <TabsTrigger value="week">Tuần</TabsTrigger>
            <TabsTrigger value="month">Tháng</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-shadow hover:card-shadow-md transition-shadow border-border/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70">Tổng nhập kho</p>
                <p className="text-2xl font-bold text-card-foreground">{formatCurrency(data.importTotal)}</p>
                <p className="text-xs text-muted-foreground font-medium">{data.importQuantity} sản phẩm / {data.importProducts} lô nhập</p>
              </div>
              <div className="p-3 rounded-2xl bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:card-shadow-md transition-shadow border-border/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70">Tổng bán ra</p>
                <p className="text-2xl font-bold text-card-foreground">{formatCurrency(data.salesTotal)}</p>
                <p className="text-xs text-muted-foreground font-medium">{data.salesQuantity} đơn hàng</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10">
                <ShoppingCart className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:card-shadow-md transition-shadow border-border/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70">Lợi nhuận</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.profit)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-medium">tổng lợi nhuận</span>
                  <Badge variant="outline" className={cn(
                    "text-[10px] h-4 px-1 border-none font-bold",
                    Number(data.profitMargin) > 15 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  )}>
                    Margin: {data.profitMargin}%
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10">
                <DollarSign className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:card-shadow-md transition-shadow border-border/40">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70">Sản phẩm top</p>
                <p className="text-lg font-bold text-card-foreground line-clamp-1">{data.bestSellers[0]?.name || "N/A"}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground font-medium">{data.bestSellers[0]?.sold || 0} đã bán {periodLabel}</span>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-500/10">
                <TrendingUp className="h-6 w-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Chart */}
      <Card className="card-shadow border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Biểu đồ Tài chính</CardTitle>
          <p className="text-xs text-muted-foreground">Sự tương quan giữa Doanh thu, Chi phí nhập và Lợi nhuận</p>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.profitChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => {
                    const parts = v.split('-');
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}`; // DD/MM for Daily
                    if (parts.length === 2) return parts[1]; // WXX or MM for Weekly/Monthly
                    return v;
                  }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => formatCurrency(v)} 
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border) / 0.3)", 
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: '600' }}
                  formatter={(value: any, name?: string) => [
                    formatCurrency(Number(value) || 0),
                    name === "revenue" ? "Doanh thu" : name === "cost" ? "Giá vốn (COGS)" : "Lợi nhuận",
                  ]}
                />
                <Area type="monotone" dataKey="revenue" name="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#gRevenue)" />
                <Area type="monotone" dataKey="cost" name="cost" stroke="hsl(var(--destructive))" strokeWidth={3} fill="url(#gCost)" />
                <Area type="monotone" dataKey="profit" name="profit" stroke="hsl(var(--success))" strokeWidth={3} fill="url(#gProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-8 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Doanh thu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Giá vốn (COGS)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Lợi nhuận</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import & Sales Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow border-border/40">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Lô hàng nhập gần đây</CardTitle>
              <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold">{periodLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/30">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground/70">Sản phẩm</TableHead>
                  <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground/70">Số lượng</TableHead>
                  <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground/70">Tổng phí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.importDetails.length > 0 ? (
                  data.importDetails.map((item: any, idx: number) => (
                    <TableRow key={idx} className="border-border/30 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-border/20 shadow-sm">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-foreground">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                              SKU: {item.sku}
                              {item.attributes?.length > 0 && 
                                ` • ${item.attributes.map((a: any) => `${a.value}`).join(" / ")}`
                              }
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-indigo-600">{formatCurrency(item.cost)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">Không có dữ liệu nhập kho</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/40">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Sản phẩm bán ra nhiều nhất</CardTitle>
              <Badge variant="secondary" className="bg-muted text-muted-foreground font-bold">{periodLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/30">
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground/70">Sản phẩm</TableHead>
                  <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground/70">Số lượng</TableHead>
                  <TableHead className="text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground/70">Hiệu quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.salesDetails.length > 0 ? (
                  data.salesDetails.map((item: any, idx: number) => (
                    <TableRow key={idx} className="border-border/30 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-border/20 shadow-sm">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm text-foreground truncate max-w-[150px]">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                              SKU: {item.sku}
                              {item.attributes?.length > 0 && 
                                ` • ${item.attributes.map((a: any) => `${a.value}`).join(" / ")}`
                              }
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{item.quantity} sp</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                           <span className="text-sm font-bold text-emerald-600">{formatCurrency(item.revenue)}</span>
                           <span className="text-[10px] text-muted-foreground font-medium">Bán chạy nhất</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">Không có dữ liệu bán hàng</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Best Sellers Ranking */}
      <Card className="card-shadow border-border/40">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Bảng xếp hạng hiệu suất sản phẩm</CardTitle>
          <p className="text-xs text-muted-foreground">Top 10 sản phẩm đóng góp doanh thu lớn nhất</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {data.bestSellers.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all group border border-border/20 hover:border-border/40">
                <span className={`text-2xl font-black w-10 text-center italic ${index === 0 ? "text-amber-500 scale-125" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-700" : "text-muted-foreground/30"}`}>
                  {index + 1}
                </span>
                <div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 shadow-sm border border-border/20">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-card-foreground truncate leading-snug">{item.name}</p>
                  <div className="flex flex-col mt-0.5">
                    <p className="text-[10px] text-muted-foreground/80 font-mono">
                      SKU: {item.sku}
                      {item.attributes?.length > 0 && 
                        ` • ${item.attributes.map((a: any) => `${a.value}`).join(" / ")}`
                      }
                    </p>
                    <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{item.sold} sản phẩm đã giao</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-base text-foreground">{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            ))}
            {data.bestSellers.length === 0 && (
              <div className="col-span-full py-10 text-center text-muted-foreground italic">Chưa có dữ liệu xếp hạng</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsPage;

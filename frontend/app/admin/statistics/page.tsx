"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import {
  Package, ShoppingCart, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Trophy, Loader2,
  Filter, ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { orderApi, inventoryApi } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

type Period = "day" | "week" | "month" | "quarter";
type SortBy = "quantity" | "revenue" | "profit";

const formatCurrency = (value: number) => {
  if (!value) return "0đ";
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  return value.toLocaleString("vi-VN") + "đ";
};

const StatisticsPage = () => {
  const { isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [sortBy, setSortBy] = useState<SortBy>("quantity");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchData = useCallback(async (currentPeriod: Period, currentSortBy: SortBy) => {
    setLoading(true);
    try {
      const rangeParams: any = { groupBy: "day" };
      const now = new Date();
      
      // Sử dụng khoảng thời gian trượt (Rolling Window) để luôn có dữ liệu hiển thị và so sánh
      if (currentPeriod === "day") {
        rangeParams.days = 1;
      } else if (currentPeriod === "week") {
        rangeParams.days = 7; // Xem 7 ngày gần nhất
      } else if (currentPeriod === "month") {
        rangeParams.days = 30; // Xem 30 ngày gần nhất (Khắc phục lỗi tab Tháng bị trống)
      } else if (currentPeriod === "quarter") {
        rangeParams.groupBy = "month";
        rangeParams.days = 90; // Xem 90 ngày gần nhất
      }

      const topParams = { 
        days: rangeParams.days || 30,
        limit: 10,
        sortBy: currentSortBy
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
        safeFetch(orderApi.getRevenueStats(rangeParams), { summary: { current: {}, previous: {}, growth: {} }, chartData: [] }),
        safeFetch(orderApi.getProfitStats(rangeParams), { summary: { current: {}, previous: {}, growth: {} }, chartData: [] }),
        safeFetch(inventoryApi.getStockInStats(rangeParams), { summary: {} }),
        safeFetch(orderApi.getTopSkus(topParams), { items: [] }),
        safeFetch(orderApi.getTopProducts(topParams), { items: [] }),
        safeFetch(inventoryApi.getLots(), [])
      ]);

      const topSkus = topSkusRes?.items || [];
      const topProducts = topProductsRes?.items || [];
      const recentLots = (Array.isArray(lotsRes) ? lotsRes : []).slice(0, 10);

      // Merge revenue and profit data for the chart to avoid empty bars when no profit is yet realized
      const revChart = rev?.chartData || [];
      const profChart = prof?.chartData || [];
      
      const chartMap = new Map();
      
      revChart.forEach((item: any) => {
        chartMap.set(item.period, {
          label: item.period,
          revenue: item.netRevenue || 0,
          cost: 0,
          profit: 0
        });
      });

      profChart.forEach((item: any) => {
        const existing = chartMap.get(item.period) || { label: item.period, revenue: 0 };
        chartMap.set(item.period, {
          ...existing,
          cost: item.cogs || 0,
          profit: item.netProfit || 0
        });
      });

      const chartItems = Array.from(chartMap.values()).sort((a, b) => a.label.localeCompare(b.label));

      setData({
        // Summaries
        revenue: rev?.summary || {},
        profit: prof?.summary || {},
        inventory: inv?.summary || {},
        
        // Detailed data
        chartItems,
        topSkus: topSkus.map((p: any) => ({
          name: p.name,
          sku: p.sku || "N/A",
          attributes: p.attributes || [],
          image: p.imageUrl || p.image,
          quantity: p.quantitySold,
          revenue: p.grossRevenue,
          profit: p.grossProfit,
        })),
        topProducts: topProducts.map((p: any) => ({
          id: p.productId,
          name: p.name,
          image: p.imageUrl,
          skus: p.skus || [],
          quantitySold: p.quantitySold,
          grossRevenue: p.grossRevenue,
          grossProfit: p.grossProfit,
          orderCount: p.orderCount,
        })),
        recentLots: recentLots.map((lot: any) => ({
          name: lot.productId?.name || "N/A",
          sku: lot.sku || "N/A",
          attributes: lot.variant?.attributes || [],
          image: lot.imageUrl,
          quantity: lot.originalQuantity,
          cost: (lot.unitCost || 0) * (lot.originalQuantity || 0),
        })),
      });

    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData(period, sortBy);
  }, [period, sortBy, fetchData]);

  const periodLabel = { 
    day: "hôm nay", 
    week: "7 ngày qua", 
    month: "30 ngày qua",
    quarter: "quý này" 
  }[period];

  if (loading || !data) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium animate-pulse">Đang tổng hợp số liệu báo cáo...</p>
      </div>
    );
  }

  const GrowthBadge = ({ value, trend, label }: { value: number; trend: string; label?: string }) => {
    if (!trend) return null;
    const isUp = trend === 'up';
    const isFlat = trend === 'flat';
    
    return (
      <div className="flex items-center">
        <span className={cn(
          "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2",
          isUp ? "bg-emerald-500/10 text-emerald-600" : 
          isFlat ? "bg-muted text-muted-foreground" : 
          "bg-destructive/10 text-destructive"
        )}>
          {isUp ? <ArrowUpRight className="h-3 w-3" /> : isFlat ? <ArrowRightLeft className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {isFlat ? "0" : Math.abs(value)}%
        </span>
        {label && <span className="text-[11px] text-muted-foreground ml-1.5 font-medium italic">{label}</span>}
      </div>
    );
  };

  const comparisonLabel = {
    day: "hôm qua",
    week: "tuần trước",
    month: "tháng trước",
    quarter: "quý trước"
  }[period];

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Báo cáo Thống kê</h1>
          <p className="text-sm text-muted-foreground font-medium">Tổng quan hiệu suất kinh doanh qua các kỳ</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="day">Ngày</TabsTrigger>
              <TabsTrigger value="week">Tuần</TabsTrigger>
              <TabsTrigger value="month">Tháng</TabsTrigger>
              <TabsTrigger value="quarter">Quý</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-shadow hover:card-shadow-md transition-all border-border/40 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 bg-primary/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
             <Package className="h-5 w-5 text-primary/40" />
          </div>
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70 mb-1">Tổng nhập kho</p>
            <p className="text-2xl font-bold text-card-foreground">{formatCurrency(data.inventory.totalStockInCost)}</p>
            <p className="text-xs text-muted-foreground font-medium mt-2">
              <span className="text-primary font-bold">{data.inventory.totalQuantity}</span> sản phẩm / <span className="font-bold">{data.inventory.totalLots}</span> lô nhập
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:card-shadow-md transition-all border-border/40 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 bg-emerald-500/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
             <ShoppingCart className="h-5 w-5 text-emerald-500/40" />
          </div>
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70 mb-1">Doanh thu thuần</p>
            <p className="text-2xl font-bold text-card-foreground">{formatCurrency(data.revenue.current?.netRevenue)}</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground font-medium">
                <span className="text-emerald-500 font-bold">{data.revenue.current?.orderCount}</span> đơn hàng
              </p>
              <GrowthBadge value={data.revenue.growth?.netRevenue} trend={data.revenue.growth?.trend} label={comparisonLabel} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:card-shadow-md transition-all border-border/40 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 bg-amber-500/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
             <DollarSign className="h-5 w-5 text-amber-500/40" />
          </div>
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70 mb-1">Lợi nhuận ròng</p>
            <p className={cn(
              "text-2xl font-bold", 
              (data.profit.current?.netProfit || 0) > 0 ? "text-emerald-600" : 
              (data.profit.current?.netProfit || 0) < 0 ? "text-destructive" : 
              "text-card-foreground"
            )}>
              {formatCurrency(data.profit.current?.netProfit)}
            </p>
            <div className="flex items-center justify-end mt-2">
              <GrowthBadge value={data.profit.growth?.netProfit} trend={data.profit.growth?.trend} label={comparisonLabel} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:card-shadow-md transition-all border-border/40 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 bg-indigo-500/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
             <Trophy className="h-5 w-5 text-indigo-500/40" />
          </div>
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase opacity-70 mb-1">Sản phẩm bán chạy</p>
            <p className="text-lg font-bold text-card-foreground line-clamp-1">{data.topProducts[0]?.name || "N/A"}</p>
            <p className="text-xs text-muted-foreground font-medium mt-2">
              <span className="text-indigo-600 font-bold">{data.topProducts[0]?.quantitySold || 0}</span> sản phẩm {periodLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="card-shadow border-border/40">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Dòng chảy Tài chính</CardTitle>
            <p className="text-xs text-muted-foreground">Phân tích tương quan Doanh thu - Chi phí - Lợi nhuận</p>
          </div>
          <div className="p-2 border border-border/50 rounded-lg bg-muted/20 flex gap-4 text-[11px] font-bold uppercase tracking-tight">
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> Doanh thu</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive/60" /> Phí vốn</div>
             <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Lợi nhuận</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartItems} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => {
                    const parts = v.split('-');
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                    if (parts.length === 2 && parts[1].startsWith('W')) return parts[1];
                    if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
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
                  cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border) / 0.5)", 
                    borderRadius: "14px",
                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
                  }}
                  itemStyle={{ fontSize: '12px', padding: '2px 0' }}
                  labelStyle={{ fontWeight: '800', marginBottom: '8px', opacity: 0.6 }}
                  formatter={(value: any, name?: string) => [
                    <span key={name} className="font-bold">{formatCurrency(Number(value) || 0)}</span>,
                    name === "revenue" ? "Doanh thu" : name === "cost" ? "Giá vốn" : "Lợi nhuận gộp",
                  ]}
                />
                <Bar dataKey="revenue" name="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={1000} />
                <Bar dataKey="cost" name="cost" fill="hsl(var(--destructive) / 0.7)" radius={[4, 4, 0, 0]} animationDuration={1200} />
                <Bar dataKey="profit" name="profit" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} animationDuration={1400} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-shadow border-border/40">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Dòng nhập kho gần đây</CardTitle>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase">{periodLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="text-[10px] uppercase font-bold text-muted-foreground/60">Sản phẩm / SKU</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground/60 px-2">SL</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground/60">Vốn nhập</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentLots.length > 0 ? (
                  data.recentLots.map((item: any, idx: number) => (
                    <TableRow key={idx} className="border-border/30 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-border/10">
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[13px] truncate">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {item.sku} {item.attributes?.length > 0 && `• ${item.attributes.map((a: any) => a.value).join("/")}`}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm px-2">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-indigo-600">{formatCurrency(item.cost)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">Không có lô hàng mới</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/40">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Biến động sản phẩm bán chạy</CardTitle>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase">{periodLabel}</span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="text-[10px] uppercase font-bold text-muted-foreground/60">Sản phẩm Chi tiết</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground/60 px-2">SL</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground/60">Doanh thu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topSkus.length > 0 ? (
                  data.topSkus.map((item: any, idx: number) => (
                    <TableRow key={idx} className="border-border/30 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-border/10">
                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[13px] truncate">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              {item.sku} {item.attributes?.length > 0 && `• ${item.attributes.map((a: any) => a.value).join("/")}`}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm px-2">{item.quantity} sản phẩm</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                           <span className="text-sm font-bold text-emerald-600">{formatCurrency(item.revenue)}</span>
                           <span className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-tighter">Lợi nhuận: {formatCurrency(item.profit)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground italic">Chưa có giao dịch</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Main Ranking */}
      <Card className="card-shadow border-border/40">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg font-bold">Xếp hạng Hiệu suất Sản phẩm</CardTitle>
            <p className="text-xs text-muted-foreground">Top 10 sản phẩm dẫn đầu thị trường của bạn</p>
          </div>
          <Trophy className="h-5 w-5 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 mt-4">
            {data.topProducts.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/10 hover:bg-muted/30 transition-all border border-border/10 hover:border-primary/20 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-125">
                   {sortBy === 'revenue' ? <DollarSign className="h-10 w-10" /> : sortBy === 'profit' ? <TrendingUp className="h-10 w-10" /> : <Package className="h-10 w-10" />}
                </div>
                
                <span className={cn(
                  "text-2xl font-bold w-10 text-center italic shrink-0",
                  index === 0 ? "text-amber-500 drop-shadow-sm" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-800" : "text-muted-foreground/20"
                )}>
                  {index + 1}
                </span>
                
                <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0 shadow-sm border border-border/10">
                  <img src={item.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-duration-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-card-foreground truncate leading-snug uppercase tracking-tight">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 mt-1 gap-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                       <ShoppingCart className="h-3 w-3" /> {item.quantitySold} sản phẩm
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                       <ArrowRightLeft className="h-3 w-3" /> {item.orderCount} đơn
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                       {item.skus.length} SKU biến thể
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-[15px] text-foreground">
                    {sortBy === 'revenue' ? formatCurrency(item.grossRevenue) : sortBy === 'profit' ? formatCurrency(item.grossProfit) : formatCurrency(item.grossRevenue)}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-0.5">
                    {sortBy === 'revenue' ? "Doanh thu" : sortBy === 'profit' ? "Lợi nhuận gộp" : "Doanh thu"}
                  </p>
                </div>
              </div>
            ))}
            {data.topProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground/60 italic border-2 border-dashed border-border/40 rounded-3xl">
                Chưa có dữ liệu xếp hạng trong kỳ này
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsPage;

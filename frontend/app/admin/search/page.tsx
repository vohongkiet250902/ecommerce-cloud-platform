"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  RefreshCw,
  Search,
  Zap,
  BarChart3,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Box,
  TrendingUp,
  MousePointerClick,
  Timer,
  Info,
  Activity,
  Calendar,
  X,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Cpu,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/services/api";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import {
  TooltipProvider,
  Tooltip as ShadcnTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipPortal,
} from "@/components/ui/tooltip";

// --- Types ---
interface AnalyticsSummary {
  searches: number;
  clicks: number;
  ctr: number;
  noResult?: number;
  noResultRate?: number;
}

interface LatencyStats {
  avgLatencyMs: number;
  p95LatencyMs: number;
}

interface QueryStat {
  q: string;
  count?: number;
  searches?: number;
  clicks?: number;
  ctr?: number;
  avgLatencyMs?: number;
}

interface TopDaily {
  day: string;
  top: { q: string; count: number }[];
}

interface ReindexResult {
  ok: boolean;
  scanned: number;
  indexed: number;
  errors: any[];
  timeMs: number;
}

export default function SearchManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(true);

  // Analytics State
  const [ctrStats, setCtrStats] = useState<AnalyticsSummary | null>(null);
  const [noResultStats, setNoResultStats] = useState<any>(null);
  const [latencyStats, setLatencyStats] = useState<LatencyStats | null>(null);
  const [topQueries, setTopQueries] = useState<QueryStat[]>([]);
  const [topDaily, setTopDaily] = useState<TopDaily[]>([]);
  const [noResults, setNoResults] = useState<QueryStat[]>([]);
  const [ctrByQuery, setCtrByQuery] = useState<QueryStat[]>([]);

  // Reindex State
  const [isReindexModalOpen, setIsReindexModalOpen] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexConfig, setReindexConfig] = useState({
    batchSize: 500,
    purge: true,
    onlyActive: false,
  });
  const [lastReindex, setLastReindex] = useState<ReindexResult | null>(null);

  // Search Sandbox State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  
  // Sandbox Filters & Sort
  const [filters, setFilters] = useState({
    categoryId: "",
    brandId: "",
    inStock: false,
    minPrice: "",
    maxPrice: "",
    attributes: "", // Facet pairs
    attrKey: "",    // Manual Key
    attrValue: "",  // Manual Value
    sort: "", // minPrice:asc
  });

  // Suggest State
  const [suggestions, setSuggestions] = useState<any>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle attribute safely
  const toggleAttribute = (pair: string) => {
    setFilters(prev => {
      const current = prev.attributes.split(',').map(s => s.trim()).filter(Boolean);
      const isThere = current.includes(pair);
      const next = isThere 
        ? current.filter(s => s !== pair) 
        : [...current, pair];
      return { ...prev, attributes: next.join(',') };
    });
  };

  // Fetch Analytics
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [ctr, nr, latency, top, daily, nrQueries, ctrQueries] = await Promise.all([
        apiClient.get(`/admin/search-analytics/ctr?days=${days}`),
        apiClient.get(`/admin/search-analytics/no-result-rate?days=${days}`),
        apiClient.get(`/admin/search-analytics/latency?days=${days}`),
        apiClient.get(`/admin/search-analytics/top-queries?days=${days}&limit=10`),
        apiClient.get(`/admin/search-analytics/top-queries-daily?days=${days}`),
        apiClient.get(`/admin/search-analytics/no-result?days=${days}&limit=10`),
        apiClient.get(`/admin/search-analytics/ctr-by-query?days=${days}&limit=10`),
      ]);

      setCtrStats(ctr.data);
      setNoResultStats(nr.data);
      setLatencyStats(latency.data);
      setTopQueries(top.data);
      setTopDaily(daily.data);
      setNoResults(nrQueries.data);
      setCtrByQuery(ctrQueries.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast({
        title: "Lỗi tải dữ liệu",
        description: "Không thể lấy thông tin analytics từ server.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  // Reindex Logic
  const handleReindex = async () => {
    try {
      setIsReindexing(true);
      const res = await apiClient.post("/admin/search/reindex-products", {}, {
        params: reindexConfig,
      });
      setLastReindex(res.data);
      toast({
        title: "Reindex thành công",
        description: `Đã index ${res.data.indexed} sản phẩm.`,
        variant: "success",
      });
      setIsReindexModalOpen(false); // Đóng modal sau khi thành công
      fetchAnalytics(); // Refresh stats
    } catch (error: any) {
      const errorMsg = error.response?.data?.message;
      toast({
        title: "Lỗi Reindex",
        description: Array.isArray(errorMsg) 
          ? errorMsg.join(", ") 
          : (typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg || "Quá trình reindex thất bại.")),
        variant: "destructive",
      });
    } finally {
      setIsReindexing(false);
    }
  };

  // Suggestion Persistence
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const res = await apiClient.get("/search/suggest", { params: { q: searchQuery } });
          setSuggestions(res.data);
          setShowSuggestions(true);
        } catch (e) { console.error("Suggest error", e); }
      } else {
        setSuggestions(null);
        setShowSuggestions(false);
      }

      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults(null);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery, filters]);

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const res = await apiClient.get("/search/products", {
        params: { 
          q: query, 
          limit: 10, 
          facets: true, 
          facetLabels: true,
          ...Object.fromEntries(
            Object.entries(filters)
              .map(([k, v]) => {
                if (k === 'attributes' && typeof v === 'string') {
                   let manual = "";
                   if (filters.attrKey?.trim() && filters.attrValue?.trim()) {
                      manual = `${filters.attrKey.trim()}:${filters.attrValue.trim()}`;
                   }
                   const raw = v + (manual ? (v ? `,${manual}` : manual) : "");
                   const normalized = raw.split(',')
                      .map(p => p.split(':').map(part => part.trim().toLowerCase()).join(':'))
                      .filter(p => p.includes(':'))
                      .join(',');
                   return [k, normalized];
                }
                return [k, v];
              })
              .filter(([k, v]) => v !== "" && v !== "default" && v !== false && k !== 'attrKey' && k !== 'attrValue')
          )
        },
      });
      setSearchResults(res.data);
    } catch (error: any) {
      console.error("Test search error:", error);
      const errorData = error.response?.data;
      toast({
        title: "Lỗi Search Core (BE)",
        description: errorData 
          ? (typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData))
          : "Server trả về lỗi 500 hoặc không phản hồi.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Prepare Chart Data
  const dailyChartData = useMemo(() => {
    return topDaily.map((d) => ({
      day: format(new Date(d.day), "dd/MM"),
      count: d.top.reduce((acc, curr) => acc + curr.count, 0),
    })).reverse();
  }, [topDaily]);

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Zap className="h-32 w-32 rotate-12" />
        </div>
        <div className="space-y-1 relative z-10 max-w-2xl">
          <Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20 px-3 py-1 rounded-full backdrop-blur-md font-bold text-[10px] mb-2">
            <Activity className="h-3 w-3 mr-2 text-emerald-400" />
            Hệ thống Tìm kiếm Meilisearch
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-xl">
            Quản trị <span className="text-white/70">Tìm kiếm</span>
          </h1>
          <p className="text-indigo-100/70 text-sm font-medium max-w-lg mt-2">
            Phân tích hành vi, tối ưu hóa xếp hạng và giám sát sức khỏe hệ thống tìm kiếm.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white h-10 rounded-xl backdrop-blur-md">
              <Calendar className="h-4 w-4 mr-2 opacity-70" />
              <SelectValue placeholder="Giai đoạn" />
            </SelectTrigger>
            <SelectContent className="border-white/20">
              <SelectItem value="1">Trong ngày</SelectItem>
              <SelectItem value="7">7 ngày qua</SelectItem>
              <SelectItem value="30">30 ngày qua</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isReindexModalOpen} onOpenChange={setIsReindexModalOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="h-10 px-6 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-bold shadow-lg shadow-indigo-950/10 transition-all hover:scale-105 active:scale-95 group border-none">
                <RefreshCw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-700" />
                Đồng bộ Index
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Settings2 className="h-6 w-6 text-indigo-600" />
                  Cấu hình Indexing
                </DialogTitle>
                <DialogDescription>
                  Gửi lại toàn bộ dữ liệu sản phẩm sang Search Engine. Việc này có thể mất vài phút tùy theo số lượng sản phẩm.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Xóa Index cũ (Purge)</Label>
                    <p className="text-[11px] text-muted-foreground">Xóa sạch dữ liệu cũ trước khi bắt đầu</p>
                  </div>
                  <Switch 
                    checked={reindexConfig.purge} 
                    onCheckedChange={(v) => setReindexConfig(prev => ({...prev, purge: v}))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Chỉ sản phẩm đang bán (Active)</Label>
                    <p className="text-[11px] text-muted-foreground">Bỏ qua các sản phẩm đã bị ẩn</p>
                  </div>
                  <Switch 
                    checked={reindexConfig.onlyActive} 
                    onCheckedChange={(v) => setReindexConfig(prev => ({...prev, onlyActive: v}))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold ml-1">Batch Size</Label>
                  <Select 
                    value={reindexConfig.batchSize.toString()} 
                    onValueChange={(v) => setReindexConfig(prev => ({...prev, batchSize: parseInt(v)}))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Chọn kích thước batch" />
                    </SelectTrigger>
                    <SelectContent className="border-white/20">
                      <SelectItem value="100">100 sản phẩm / batch</SelectItem>
                      <SelectItem value="500">500 sản phẩm / batch (Khuyên dùng)</SelectItem>
                      <SelectItem value="1000">1000 sản phẩm / batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleReindex} 
                  className="w-full h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  disabled={isReindexing}
                >
                  {isReindexing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Đang đồng bộ...
                    </>
                  ) : (
                    "Bắt đầu Reindex ngay"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-900/5 dark:bg-slate-900/40 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 h-auto gap-0.5 self-start">
          <TabsTrigger value="dashboard" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold text-xs flex items-center gap-2.5 transition-all">
            <BarChart3 className="h-4 w-4" /> Tổng quan
          </TabsTrigger>
          <TabsTrigger value="queries" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold text-xs flex items-center gap-2.5 transition-all">
            <TrendingUp className="h-4 w-4" /> Phân tích Từ khóa
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm font-bold text-xs flex items-center gap-2.5 transition-all">
            <Search className="h-4 w-4" /> Tìm kiếm (Sandbox) thử nghiệm
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-[1.5rem] border border-border shadow-sm bg-background overflow-hidden group hover:border-indigo-200 transition-all duration-300">
              <CardContent className="p-5 relative">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Search className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tổng lượt tìm kiếm</p>
                    <h3 className="text-2xl font-bold text-foreground leading-none">{ctrStats?.searches.toLocaleString() ?? "0"}</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight pt-1">Tổng quan quy mô nhu cầu khách hàng</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border border-border shadow-sm bg-background overflow-hidden group hover:border-emerald-200 transition-all duration-300">
              <CardContent className="p-5 relative">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hiệu suất CTR</p>
                    <h3 className="text-2xl font-bold text-foreground leading-none">{((ctrStats?.ctr ?? 0) * 100).toFixed(1)}%</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight pt-1">Độ liên quan giữa kết quả và kỳ vọng</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border border-border shadow-sm bg-background overflow-hidden group hover:border-amber-200 transition-all duration-300">
              <CardContent className="p-5 relative">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tỷ lệ không kết quả</p>
                    <h3 className="text-2xl font-bold text-foreground leading-none">{(noResultStats?.noResultRate ?? 0).toFixed(1)}%</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight pt-1">Khoảng cách dữ liệu cần được bổ sung</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border border-border shadow-sm bg-background overflow-hidden group hover:border-rose-200 transition-all duration-300">
              <CardContent className="p-5 relative">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <Timer className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Độ trễ P95</p>
                    <h3 className="text-2xl font-bold text-foreground leading-none">{latencyStats?.p95LatencyMs?.toFixed(0) ?? "0"}ms</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight pt-1">Sức khỏe hệ thống và tốc độ phản hồi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <Card className="lg:col-span-2 rounded-[2rem] border border-border shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-border bg-muted/20">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold tracking-tight">Xu hướng tìm kiếm</CardTitle>
                  <CardDescription className="font-medium text-[11px] uppercase tracking-wider">Lưu lượng request theo thời gian</CardDescription>
                </div>
                <Badge variant="outline" className="bg-background text-[10px] font-bold py-1 px-3">Real-time Data</Badge>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                      <XAxis 
                        dataKey="day" 
                        fontSize={10} 
                        fontWeight={700}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#88888880' }}
                        dy={10}
                      />
                      <YAxis 
                        fontSize={10} 
                        fontWeight={700}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#88888880' }}
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                          borderRadius: '16px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                          backdropFilter: 'blur(8px)',
                          padding: '12px'
                        }}
                        labelStyle={{ fontWeight: 900, marginBottom: '4px', fontSize: '11px', color: '#4f46e5' }}
                        itemStyle={{ fontWeight: 700, fontSize: '12px', color: '#1e293b' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        name="Số lượt tìm"
                        stroke="#4f46e5" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorCount)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Queries Summary */}
            <Card className="rounded-[2rem] border border-border shadow-sm bg-background overflow-hidden flex flex-col">
               <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xl font-bold tracking-tight">Từ khóa phổ biến</CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Thống kê lưu lượng tìm kiếm</CardDescription>
               </CardHeader>
               <CardContent className="p-0 flex-1">
                  <div className="space-y-0.5">
                    {topQueries.length > 0 ? topQueries.slice(0, 5).map((q, i) => {
                      const maxCount = topQueries[0]?.count || 1;
                      const percentage = (q.count || 0) / maxCount * 100;
                      return (
                        <div key={i} className="px-8 py-5 hover:bg-muted/50 transition-all group relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-medium text-muted-foreground group-hover:text-indigo-600 transition-colors">#{i+1}</span>
                              <p className="font-semibold text-sm text-foreground">{q.q}</p>
                            </div>
                            <Badge variant="secondary" className="font-bold text-[10px] rounded-lg">
                              {q.count} lượt
                            </Badge>
                          </div>
                          <div className="mt-3 w-full h-[3px] bg-muted rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-indigo-500 transition-all duration-1000" 
                                style={{ width: `${percentage}%` }}
                             />
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="p-20 text-center flex flex-col items-center gap-3">
                         <Search className="h-10 w-10 text-muted-foreground/20" />
                         <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">Chưa có dữ liệu tìm kiếm</p>
                      </div>
                    )}
                  </div>
               </CardContent>
               <div className="p-6 bg-muted/20 mt-auto border-t border-border">
                  <Button 
                    variant="ghost" 
                    className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-10 rounded-xl flex items-center justify-center gap-2 cursor-pointer" 
                    onClick={() => setActiveTab("queries")}
                  >
                    Xem tất cả từ khóa <ArrowRight className="h-4 w-4" />
                  </Button>
               </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queries" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="rounded-2xl border border-border shadow-sm bg-background overflow-hidden">
                <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between bg-muted/20">
                   <div className="space-y-1">
                      <CardTitle className="text-lg font-bold flex items-center gap-3">
                         <AlertCircle className="h-5 w-5 text-rose-500" />
                         Cần tối ưu Kết quả
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-muted-foreground">Từ khóa chưa có kết quả tìm kiếm</CardDescription>
                   </div>
                   <Badge variant="outline" className="text-rose-600 border-rose-200 text-[10px] font-bold">ƯU TIÊN</Badge>
                </CardHeader>
                <div className="p-0 overflow-hidden">
                   <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                         <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="px-6 py-4 text-left">Từ khóa</th>
                            <th className="px-6 py-4 text-right">Số lần lỗi</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {noResults.map((item, i) => (
                            <tr key={i} className="group hover:bg-muted/20 transition-all border-b border-border last:border-none">
                               <td className="px-6 py-3.5 text-sm font-semibold text-foreground underline decoration-rose-200 decoration-1 underline-offset-4">{item.q}</td>
                               <td className="px-6 py-3.5 text-right font-bold text-rose-600 font-mono text-base">{item.count}</td>

                            </tr>
                         ))}
                      </tbody>
                   </table>
                   {noResults.length === 0 && (
                     <div className="p-16 text-center flex flex-col items-center gap-4">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        <p className="text-sm font-bold text-emerald-600">Mọi từ khóa đều đang trả về kết quả tốt</p>
                     </div>
                   )}
                </div>
             </Card>

             {/* CTR Performance */}
             <Card className="rounded-2xl border border-border shadow-sm bg-background overflow-hidden">
                <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
                   <div className="space-y-1">
                      <CardTitle className="text-lg font-bold flex items-center gap-3">
                         <TrendingUp className="h-5 w-5 text-indigo-600" />
                         Hiệu suất Tương quan (CTR)
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-muted-foreground">Đo lường mức độ khớp của kết quả tìm kiếm</CardDescription>
                   </div>
                </CardHeader>
                <div className="p-0 overflow-hidden">
                   <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                         <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="px-6 py-4 text-left">Từ khóa</th>
                            <th className="px-6 py-4 text-right">Tìm kiếm</th>
                            <th className="px-6 py-4 text-right">Click</th>
                            <th className="px-6 py-4 text-right">Tỷ lệ</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {ctrByQuery.map((item, i) => (
                             <tr key={i} className="group hover:bg-muted/20 transition-all border-b border-border last:border-none">
                                <td className="px-6 py-3.5 text-sm font-semibold text-foreground">{item.q}</td>
                                <td className="px-6 py-3.5 text-right text-xs font-bold text-muted-foreground">{item.searches}</td>
                                <td className="px-6 py-3.5 text-right text-xs font-bold text-foreground">{item.clicks}</td>
                                <td className="px-6 py-3.5 text-right">
                                   <div className="flex flex-col items-end gap-1.5">
                                      <Badge variant="secondary" className={cn("text-[10px] font-bold rounded-lg h-5 px-2", (item.ctr ?? 0) > 0.3 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")}>
                                         {((item.ctr ?? 0) * 100).toFixed(1)}%
                                      </Badge>
                                      <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                                         <div 
                                            className={cn("h-full transition-all duration-1000", (item.ctr ?? 0) > 0.3 ? "bg-emerald-500" : "bg-rose-500")} 
                                            style={{ width: `${(item.ctr ?? 0) * 100}%` }}
                                         />
                                      </div>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                   </table>
                </div>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="sandbox" className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
           <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
              
              {/* Left Sidebar: Tìm kiếm (Sandbox) thử nghiệm */}
               <div className="xl:col-span-1 space-y-6 sticky top-6">
                  <Card className="rounded-2xl border border-border shadow-sm bg-background/80 backdrop-blur-xl sticky top-6 overflow-hidden">
                     <CardHeader className="p-6 border-b border-border">
                        <div className="flex items-center justify-between">
                           <CardTitle className="text-lg font-bold flex items-center gap-2">
                              <Settings2 className="h-5 w-5 text-indigo-600" />
                              Cấu hình Sandbox
                           </CardTitle>
                           <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 rounded-lg text-xs font-semibold text-muted-foreground hover:text-indigo-600 cursor-pointer"
                              onClick={() => setFilters({
                                 categoryId: "",
                                 brandId: "",
                                 inStock: false,
                                 minPrice: "",
                                 maxPrice: "",
                                 attributes: "",
                                 attrKey: "",
                                 attrValue: "",
                                 sort: "default"
                               })}
                           >
                              Đặt lại
                           </Button>
                        </div>
                        <CardDescription className="text-xs font-medium text-muted-foreground">Tùy chỉnh thông số tìm kiếm</CardDescription>
                     </CardHeader>
                     <CardContent className="p-6 space-y-6">
                        {/* Sorting Neural Path */}
                        <div className="space-y-2.5">
                           <Label className="text-xs font-bold text-muted-foreground ml-1">Chiến lược xếp hạng</Label>
                           <Select value={filters.sort} onValueChange={(v) => setFilters(f => ({...f, sort: v}))}>
                              <SelectTrigger className="h-11 rounded-xl bg-background border-border shadow-sm font-semibold text-sm group transition-all">
                                 <SelectValue placeholder="Mặc định (AI)" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-border shadow-lg">
                                 <SelectItem value="default" className="text-sm font-medium py-2.5">Độ tương quan</SelectItem>
                                 <SelectItem value="minPrice:asc" className="text-sm font-medium py-2.5">Giá: Thấp đến Cao</SelectItem>
                                 <SelectItem value="minPrice:desc" className="text-sm font-medium py-2.5">Giá: Cao đến Thấp</SelectItem>
                                 <SelectItem value="createdAt:desc" className="text-sm font-medium py-2.5">Ngày đăng (Mới nhất)</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>

                        {/* Price Range Intensity */}
                        <div className="space-y-3">
                           <Label className="text-xs font-bold text-muted-foreground ml-1">Khoảng giá (VND)</Label>
                           <div className="space-y-2.5">
                              <div className="relative group">
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors">MIN</span>
                                 <Input 
                                    placeholder="Giá tối thiểu..." 
                                    className="h-11 rounded-xl bg-background border-border text-sm font-semibold pl-4 pr-12 focus-visible:ring-indigo-500/20 transition-all shadow-sm"
                                    type="number" 
                                    value={filters.minPrice}
                                    onChange={(e) => setFilters(f => ({...f, minPrice: e.target.value}))}
                                 />
                              </div>
                              <div className="relative group">
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors">MAX</span>
                                 <Input 
                                    placeholder="Giá tối đa..." 
                                    className="h-11 rounded-xl bg-background border-border text-sm font-semibold pl-4 pr-12 focus-visible:ring-indigo-500/20 transition-all shadow-sm"
                                    type="number" 
                                    value={filters.maxPrice}
                                    onChange={(e) => setFilters(f => ({...f, maxPrice: e.target.value}))}
                                 />
                              </div>
                           </div>
                        </div>
                       {/* Status & Attributes */}
                       <div className="space-y-5 pt-4 border-t border-border">
                          <div className="flex items-center justify-between">
                             <div className="space-y-0.5">
                                <Label className="text-xs font-bold text-muted-foreground">Tình trạng</Label>
                                <p className="text-[11px] text-muted-foreground font-medium">Chỉ sản phẩm còn hàng</p>
                             </div>
                             <Switch 
                                checked={filters.inStock} 
                                onCheckedChange={(v) => setFilters(f => ({...f, inStock: v}))}
                                className="data-[state=checked]:bg-indigo-600"
                             />
                          </div>
                       </div>

                        {/* Advanced Attributes Manual Field */}
                        <div className="space-y-3 pt-5 border-t border-border">
                           <div className="flex items-center justify-between px-1">
                              <Label className="text-xs font-bold text-muted-foreground">Thuộc tính sản phẩm</Label>
                              <TooltipProvider>
                                 <ShadcnTooltip>
                                    <TooltipTrigger asChild>
                                       <div className="h-4.5 w-4.5 rounded-full bg-muted/50 flex items-center justify-center cursor-help transition-colors hover:bg-muted relative z-20">
                                          <Box className="h-3 w-3 text-muted-foreground" />
                                       </div>
                                    </TooltipTrigger>
                                    <TooltipPortal>
                                       <TooltipContent side="top" sideOffset={8} className="z-[100] text-[10px] font-medium max-w-[200px] p-3 rounded-xl bg-slate-900 text-white border-none shadow-2xl">
                                          <p>Nhập Key và Value để lọc thuộc tính tùy chỉnh.</p>
                                          <p className="mt-1 opacity-60 italic">VD: RAM (Key), 8GB (Value)</p>
                                       </TooltipContent>
                                    </TooltipPortal>
                                 </ShadcnTooltip>
                              </TooltipProvider>
                           </div>
                           <div className="space-y-2">
                              <div className="relative group">
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors uppercase">Key</span>
                                 <Input 
                                    placeholder="Tên thuộc tính (VD: color)..." 
                                    className="h-11 rounded-xl bg-background border-border text-sm font-semibold pl-4 pr-12 focus-visible:ring-indigo-500/20 shadow-sm transition-all group-hover:border-indigo-200"
                                    value={filters.attrKey}
                                    onChange={(e) => setFilters(f => ({...f, attrKey: e.target.value}))}
                                 />
                              </div>
                              <div className="relative group">
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors uppercase">Value</span>
                                 <Input 
                                    placeholder="Giá trị (VD: red)..." 
                                    className="h-11 rounded-xl bg-background border-border text-sm font-semibold pl-4 pr-12 focus-visible:ring-indigo-500/20 shadow-sm transition-all group-hover:border-indigo-200"
                                    value={filters.attrValue}
                                    onChange={(e) => setFilters(f => ({...f, attrValue: e.target.value}))}
                                 />
                              </div>
                           </div>
                        </div>

                       {/* Facets Preview */}
                       {searchResults && (
                         <div className="space-y-6 pt-6 border-t border-border animate-in fade-in duration-500">
                            {[
                               { title: "Thương hiệu", data: searchResults.facets?.brandId, labels: searchResults.facetLabels?.brandId, key: "brandId" },
                               { title: "Danh mục", data: searchResults.facets?.categoryId, labels: searchResults.facetLabels?.categoryId, key: "categoryId" },
                               { title: "Thuộc tính (Phổ biến)", data: searchResults.facets?.attributePairs, labels: null, key: "attributes" }
                            ].map((sec: any) => sec.data && (
                               <div key={sec.key} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                     <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{sec.title}</h5>
                                     <div className="h-[1px] flex-1 bg-border ml-4" />
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto scrollbar-hide pr-1">
                                     {Object.entries(sec.data).slice(0, 12).map(([id, count]) => {
                                        const isSelected = sec.key === 'attributes' 
                                          ? filters.attributes.split(',').map(s => s.trim()).filter(Boolean).includes(id)
                                          : (filters as any)[sec.key] === id;
                                          
                                        return (
                                          <button 
                                             key={id} 
                                             onClick={() => {
                                               if (sec.key === 'attributes') {
                                                 toggleAttribute(id);
                                               } else {
                                                 setFilters(prev => ({ ...prev, [sec.key]: (prev as any)[sec.key] === id ? "" : id }));
                                               }
                                             }}
                                             className={cn(
                                               "group flex items-center justify-between px-3 py-2 rounded-lg border transition-all",
                                               isSelected 
                                                 ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-indigo-500/10" 
                                                 : "bg-background border-border text-muted-foreground hover:border-indigo-300 hover:bg-slate-50"
                                             )}
                                           >
                                            <div className="flex items-center gap-2.5">
                                               <div className={cn(
                                                  "h-1.5 w-1.5 rounded-full transition-all",
                                                  isSelected ? "bg-indigo-400 scale-125" : "bg-border group-hover:bg-indigo-300"
                                               )} />
                                               <span className="text-xs font-semibold truncate max-w-[140px]">
                                                  {sec.labels?.[id] || id}
                                               </span>
                                            </div>
                                            <span className={cn(
                                              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded",
                                              isSelected ? "bg-white/20 text-indigo-300" : "bg-muted text-muted-foreground"
                                            )}>{count as any}</span>
                                          </button>
                                        );
                                      })}
                                   </div>
                                </div>
                             ))}
                         </div>
                       )}
                    </CardContent>
                 </Card>
              </div>

              {/* Middle: Search & Results */}
              <div className="xl:col-span-3 space-y-10">
                 {/* Navigation & Search Hub */}
                  <div className="space-y-8" ref={searchRef}>
                     <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition duration-700" />
                         <Card className="relative rounded-3xl border border-border/60 shadow-lg bg-background/95 backdrop-blur-2xl overflow-hidden">
                          <div className="p-2.5 flex items-center">
                             <div className="h-12 w-12 flex items-center justify-center">
                                <Search className="h-5 w-5 text-indigo-500" />
                             </div>
                             <Input 
                                placeholder="Tìm kiếm sản phẩm trong Sandbox..." 
                                className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 text-base font-semibold h-12"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                             />
                             {searchQuery && (
                                <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground mr-2"
                                   onClick={() => setSearchQuery("")}
                                >
                                   <X className="h-4 w-4" />
                                </Button>
                             )}
                             <Badge className="h-10 px-5 rounded-xl bg-slate-900 text-white flex items-center gap-2 font-bold text-[10px] uppercase shadow-lg mr-2 border-none cursor-pointer">
                                <Zap className="h-3.5 w-3.5 text-amber-300" /> Tìm kiếm thông minh
                             </Badge>
                          </div>
                       </Card>
                    </div>

                     {/* Integrated Suggestions (Push mode) */}
                     {showSuggestions && (
                        <div className="bg-background/80 backdrop-blur-2xl rounded-3xl border border-border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden mb-8">
                           <div className="absolute top-4 right-6 z-10">
                              <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 rounded-full text-[10px] font-bold uppercase text-muted-foreground hover:text-indigo-600 cursor-pointer"
                                 onClick={() => setShowSuggestions(false)}
                              >
                                 Đóng <X className="h-3 w-3 ml-2" />
                              </Button>
                           </div>
                           
                           {suggestions ? (
                              <div className="grid grid-cols-1 md:grid-cols-12 min-h-[300px]">
                                 {suggestions.querySuggestions?.length > 0 && (
                                    <div className="md:col-span-4 p-8 border-r border-border bg-muted/20">
                                       <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
                                          <Activity className="h-3 w-3" /> Xu hướng hiện tại
                                       </p>
                                       <div className="space-y-1.5">
                                          {suggestions.querySuggestions.map((s: string) => (
                                            <div 
                                               key={s} 
                                               className="px-5 py-3.5 hover:bg-background hover:shadow-sm rounded-xl cursor-pointer text-xs font-semibold flex items-center justify-between group transition-all"
                                               onClick={() => { setSearchQuery(s); setShowSuggestions(false); }}
                                            >
                                              <span className="group-hover:text-indigo-600 transition-colors">{s}</span>
                                              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-400" />
                                            </div>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                                 <div className="md:col-span-8 p-8 flex flex-col">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-6 flex items-center gap-2">
                                       <Box className="h-3 w-3" /> Sản phẩm gợi ý
                                    </p>
                                    <div className="grid grid-cols-1 gap-2.5 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent">
                                       {suggestions.productSuggestions?.map((p: any) => (
                                         <div 
                                            key={p.id} 
                                            className="p-3 h-20 hover:bg-muted/50 rounded-2xl cursor-pointer flex items-center gap-5 transition-all group border border-transparent hover:border-indigo-100 flex-shrink-0"
                                            onClick={() => { setSearchQuery(p.name); setShowSuggestions(false); }}
                                         >
                                           <div className="h-14 w-14 rounded-xl bg-slate-100 relative overflow-hidden shrink-0 border border-border group-hover:border-indigo-200 shadow-sm">
                                             {p.image && <Image src={p.image} alt={p.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />}
                                           </div>
                                           <div className="min-w-0 flex-1 space-y-1">
                                              <p className="text-sm font-bold truncate text-foreground group-hover:text-indigo-600 transition-colors">{p.name}</p>
                                              <div className="flex items-center gap-3">
                                                 <p className="text-[11px] font-bold text-indigo-600 font-mono bg-indigo-50 px-2 py-0.5 rounded-md">
                                                    {new Intl.NumberFormat('vi-VN').format(p.minPrice || p.price)}đ
                                                 </p>
                                                 {p.category && (
                                                   <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                                                      ID: {p.id.substring(0,6)}
                                                   </span>
                                                 )}
                                              </div>
                                           </div>
                                           <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all mr-2" />
                                         </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <div className="p-10 space-y-10">
                                 <div className="flex flex-col items-center text-center gap-3">
                                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                                       <Zap className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">Bắt đầu tìm kiếm với AI</h3>
                                    <p className="text-xs font-medium text-muted-foreground max-w-sm">Dữ liệu được xử lý bởi Engine Meilisearch kết hợp Neural Ranking để trả về kết quả chính xác nhất.</p>
                                 </div>

                                 <div className="space-y-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-2">
                                       <Activity className="h-3 w-3 text-indigo-500" /> Từ khóa xu hướng
                                    </p>
                                    <div className="flex flex-wrap gap-2.5">
                                       {["iphone", "laptop", "tai nghe", "macbook", "tablet", "ipad"].map((tag) => (
                                          <button 
                                             key={tag} 
                                             className="bg-muted/50 hover:bg-indigo-600 hover:text-white transition-all px-5 py-2.5 rounded-full text-xs font-bold shadow-sm border border-border/50 flex items-center gap-2 group"
                                             onClick={() => { setSearchQuery(tag); setShowSuggestions(false); }}
                                          >
                                             <TrendingUp className="h-3 w-3 opacity-40 group-hover:opacity-100" />
                                             {tag}
                                          </button>
                                       ))}
                                    </div>
                                 </div>

                                 {topQueries.length > 0 && (
                                    <div className="space-y-4">
                                       <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-2">
                                          <Search className="h-3 w-3 text-indigo-500" /> Tìm kiếm gần đây
                                       </p>
                                       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                          {topQueries.slice(0, 4).map((q) => (
                                             <div 
                                                key={q.q} 
                                                className="p-4 rounded-2xl bg-muted/20 border border-border hover:border-indigo-200 hover:bg-white transition-all cursor-pointer group"
                                                onClick={() => { setSearchQuery(q.q); setShowSuggestions(false); }}
                                             >
                                                <p className="text-xs font-bold truncate group-hover:text-indigo-600">{q.q}</p>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-1">{q.count} lượt tìm</p>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )}


                        </div>
                     )}


                 </div>

                 {/* Results Flow */}
                 <div className="space-y-6">
                    {isSearching ? (
                      <div className="py-24 flex flex-col items-center justify-center">
                         <div className="relative h-16 w-16 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-muted" />
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                            <Search className="absolute inset-x-0 inset-y-0 m-auto h-6 w-6 text-indigo-500" />
                         </div>
                         <h3 className="text-base font-bold text-foreground">Đang xử lý thuật toán...</h3>
                         <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mt-2">Tính toán độ tương quan & Facets</p>
                      </div>
                    ) : searchResults ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         {/* Results Meta Header */}
                         <div className="flex items-center justify-between bg-background p-5 rounded-2xl border border-border shadow-sm">
                            <div className="flex items-center gap-8">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kết quả hiển thị</p>
                                  <p className="text-sm font-bold flex items-center gap-2">
                                     <Box className="h-4 w-4 text-indigo-500" />
                                     Tìm thấy <span className="text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded-md">{searchResults.totalHits}</span> sản phẩm
                                  </p>
                               </div>
                               <div className="h-10 w-[1px] bg-border" />
                               <div className="space-y-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tốc độ xử lý AI</p>
                                  <p className="text-sm font-bold flex items-center gap-2">
                                     <Activity className="h-4 w-4 text-emerald-500" />
                                     <span className="text-emerald-600">{searchResults.processingTimeMs}ms</span>
                                  </p>
                               </div>
                            </div>
                         </div>

                         {/* No Results Handling */}
                         {searchResults.totalHits === 0 && searchResults.noResult && (
                           <div className="p-8 rounded-3xl bg-amber-50 border border-amber-100 space-y-6 relative overflow-hidden group">
                              <AlertCircle className="absolute -right-12 -top-12 h-48 w-48 text-amber-200/50" />
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <AlertCircle className="h-5 w-5" />
                                 </div>
                                 <h3 className="text-lg font-bold text-amber-900">Không tìm thấy kết quả chính xác</h3>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                 {searchResults.noResult.suggestedQueries?.length > 0 && (
                                   <div className="space-y-3">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/60 flex items-center gap-2">
                                         <Search className="h-3 w-3" /> Gợi ý thay thế
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {searchResults.noResult.suggestedQueries.map((q: string) => (
                                          <Badge 
                                            key={q} 
                                            variant="outline" 
                                            className="px-4 py-2 bg-background rounded-xl border-amber-200 text-amber-800 cursor-pointer hover:bg-amber-100 transition-colors font-bold text-xs"
                                             onClick={() => {
                                               setSearchQuery(q);
                                               setFilters({
                                                  categoryId: "",
                                                  brandId: "",
                                                  inStock: false,
                                                  minPrice: "",
                                                  maxPrice: "",
                                                  attributes: "",
                                                  attrKey: "",
                                                  attrValue: "",
                                                  sort: "default"
                                               });
                                             }}
                                          >
                                            {q}
                                          </Badge>
                                        ))}
                                      </div>
                                   </div>
                                 )}

                                 {searchResults.noResult.relaxed && (
                                   <div className="space-y-4">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800/60 flex items-center gap-2">
                                         <Zap className="h-3 w-3" /> Kết quả tương tự (Relaxed)
                                      </p>
                                      <div className="space-y-2">
                                         {searchResults.noResult.relaxed.hits.slice(0, 3).map((hit: any) => (
                                           <div key={hit.id} className="p-3 rounded-2xl bg-background border border-amber-100 flex items-center gap-4 hover:shadow-md transition-all">
                                             <div className="h-10 w-10 rounded-xl bg-muted relative overflow-hidden shrink-0">
                                               {hit.image && <Image src={hit.image} alt={hit.name} fill className="object-cover" />}
                                             </div>
                                             <div className="min-w-0">
                                                <p className="text-xs font-bold truncate text-amber-900">{hit.name}</p>
                                                <p className="text-[10px] font-semibold text-amber-600/70">Khớp tương đối</p>
                                             </div>
                                           </div>
                                         ))}
                                      </div>
                                   </div>
                                 )}
                              </div>
                           </div>
                         )}

                         {/* Result Cards Grid */}
                         <div className="grid grid-cols-1 gap-5">
                            {searchResults.hits.map((hit: any, i: number) => (
                              <Card key={hit.id} className="group rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-indigo-400/50 transition-all duration-300 bg-background overflow-hidden">
                                 <CardContent className="p-5 flex gap-6">
                                    {/* Image Section */}
                                    <div className="h-32 w-32 bg-muted rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center border border-border group-hover:border-indigo-200 transition-colors">
                                       {hit.image ? (
                                         <Image src={hit.image} alt={hit.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                       ) : (
                                         <div className="text-[10px] font-bold text-muted-foreground uppercase">Chưa có ảnh</div>
                                       )}
                                     </div>

                                     {/* Info Section */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                       <div className="space-y-2">
                                          <div className="flex items-start justify-between">
                                             <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-lg leading-tight truncate text-foreground group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{hit.name}</h4>
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">{hit.categoryId || "PHÂN LOẠI CHUNG"}</p>
                                             </div>
                                             <div className="text-right pl-4">
                                                <p className="text-xl font-bold text-indigo-600">
                                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hit.minPrice || hit.price)}
                                                </p>
                                             </div>
                                          </div>

                                          <div className="flex flex-wrap gap-2 mt-2">
                                             <Badge variant="outline" className={cn(
                                                "rounded-lg px-2.5 py-0.5 text-[9px] font-bold uppercase border-none shadow-sm",
                                                hit.inStock ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                                             )}>
                                                {hit.inStock ? "Sẵn hàng" : "Hết hàng"}
                                             </Badge>
                                             {hit.brandId && (
                                                <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground bg-muted/40 border-none shadow-sm capitalize">
                                                   {hit.brandId}
                                                </Badge>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 </CardContent>
                              </Card>
                            ))}
                         </div>
                      </div>
                    ) : (
                      <div className="py-32 flex flex-col items-center justify-center bg-muted/10 rounded-3xl border border-dashed border-border opacity-80">
                         <div className="h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center mb-8 shadow-inner">
                            <Zap className="h-10 w-10 text-indigo-400" />
                         </div>
                         <h3 className="text-lg font-bold text-foreground">Sẵn sàng thử nghiệm Sandbox</h3>
                         <p className="text-xs text-center max-w-xs mt-3 font-medium text-muted-foreground px-4">
                            Hãy nhập từ khóa bất kỳ để kiểm tra thuật toán xếp hạng và các tính năng gợi ý thông minh của Meilisearch.
                         </p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

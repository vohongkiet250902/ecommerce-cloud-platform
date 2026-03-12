"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Search, X, Loader2, Settings2, TrendingUp, Box, Activity, 
  Zap, ArrowUpRight, ChevronRight, Settings, SlidersHorizontal
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";
import apiClient, { categoryApi, brandApi } from "@/services/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function SearchHub() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({
    categoryId: "",
    brandId: "",
    inStock: false,
    minPrice: "",
    maxPrice: "",
    sort: "default"
  });
  const [trendingQueries, setTrendingQueries] = useState<string[]>([]);
  const { user } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch Metadata
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, brandRes, trendRes] = await Promise.all([
          categoryApi.getCategories(),
          brandApi.getBrands(),
          apiClient.get("/admin/search-analytics/top-queries?limit=6&days=7").catch(() => ({ data: [] }))
        ]);
        setCategories(catRes.data.data || catRes.data);
        setBrands(brandRes.data.data || brandRes.data);
        
        if (trendRes.data && Array.isArray(trendRes.data)) {
          setTrendingQueries(trendRes.data.map((q: any) => q.q));
        }
      } catch (e) { console.error("Metadata fetch error", e); }
    };
    fetchData();
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
       const target = event.target as Node;
       if (searchRef.current && !searchRef.current.contains(target)) {
          if (target instanceof HTMLElement) {
             const isRadixPortal = target.closest('[data-radix-portal]');
             const isSelectUI = target.closest('[role="listbox"]') || target.closest('[role="option"]');
             const isDetached = !document.body.contains(target);

             if (isRadixPortal || isSelectUI || isDetached) {
                return;
             }
          }
          setShowResults(false);
       }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search Process
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchQuery.trim()) {
        setSearchResults(null);
        setSuggestions(null);
        return;
      }

      setShowResults(true);

      // 1. Fetch Suggestions
      if (searchQuery.length >= 2) {
        apiClient.get("/search/suggest", { params: { q: searchQuery } })
          .then(res => setSuggestions(res.data))
          .catch(() => {});
      }

      // 2. Perform Search
      performSearch(searchQuery);
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
            Object.entries(filters).filter(([k, v]) => v !== "" && v !== "default" && v !== false)
          ),
          userId: user?.id,
          sessionId: typeof window !== 'undefined' ? localStorage.getItem('sessionId') : undefined
        }
      });
      setSearchResults(res.data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 max-w-md mx-8 relative" ref={searchRef}>
      <div className="relative w-full group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <Input
          placeholder="Tìm kiếm sản phẩm..."
          className="pl-11 h-11 bg-secondary/40 border-border focus-visible:ring-2 focus-visible:ring-primary/20 rounded-full text-sm font-medium transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            setShowResults(true);
            if (!localStorage.getItem('sessionId')) {
              localStorage.setItem('sessionId', 'sess_' + Math.random().toString(36).substring(2, 15));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery.trim()) {
               router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
               setShowResults(false);
            }
          }}
        />
        
        {searchQuery && (
           <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
             {isSearching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
             <button 
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setSuggestions(null);
                  setShowResults(false);
                }}
                className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
             >
               <X className="h-3.5 w-3.5" />
             </button>
           </div>
        )}
      </div>

      {/* Advanced Search Hub Panel */}
      {showResults && (
        <div className="fixed sm:absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 w-[95vw] md:w-[720px] lg:w-[850px] bg-background border border-border/60 rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-12 max-h-[85vh] md:max-h-[550px] lg:max-h-[600px]">
              
              {/* Left: Configuration (Quick Filters) */}
              <div className="md:col-span-4 bg-muted border-r border-border/40 overflow-y-auto max-h-[400px] sm:max-h-[600px] scrollbar-hide hidden md:block">
                 <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border/40">
                       <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center gap-2">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> Bộ lọc nhanh
                       </p>
                       <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/20 hover:bg-primary/10 px-2 cursor-pointer"
                          onClick={() => setFilters({
                             categoryId: "",
                             brandId: "",
                             inStock: false,
                             minPrice: "",
                             maxPrice: "",
                             sort: "default"
                          })}
                       >
                          Đặt lại
                       </Button>
                    </div>

                    <div className="space-y-6">
                       {/* Sorting */}
                       <div className="space-y-2.5">
                          <Label className="text-[11px] font-bold text-muted-foreground ml-1">Sắp xếp theo</Label>
                          <Select value={filters.sort} onValueChange={(v) => setFilters((f: any) => ({...f, sort: v}))}>
                             <SelectTrigger className="h-10 rounded-xl bg-background border-border shadow-sm font-semibold text-xs transition-all hover:border-primary/30">
                                <SelectValue placeholder="Mặc định (AI)" />
                             </SelectTrigger>
                             <SelectContent className="rounded-xl border-border shadow-lg">
                                <SelectItem value="default" className="text-xs font-medium">Độ tương quan</SelectItem>
                                <SelectItem value="minPrice:asc" className="text-xs font-medium">Giá: Thấp đến Cao</SelectItem>
                                <SelectItem value="minPrice:desc" className="text-xs font-medium">Giá: Cao đến Thấp</SelectItem>
                                <SelectItem value="createdAt:desc" className="text-xs font-medium">Ngày đăng (Mới nhất)</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>

                       {/* Price Range */}
                       <div className="space-y-2.5">
                          <Label className="text-[11px] font-bold text-muted-foreground ml-1">Khoảng giá (VND)</Label>
                          <div className="grid grid-cols-1 gap-3">
                             <div className="relative group">
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/40 group-focus-within:text-primary transition-colors uppercase">Min</span>
                                <Input 
                                   placeholder="Giá tối thiểu..." 
                                   className="h-10 rounded-xl bg-background border-border text-[11px] font-bold pl-4 pr-12 focus-visible:ring-primary/20 shadow-sm transition-all group-hover:border-primary/20"
                                   value={filters.minPrice}
                                   onChange={(e) => setFilters((f: any) => ({...f, minPrice: e.target.value}))}
                                />
                             </div>
                             <div className="relative group">
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/40 group-focus-within:text-primary transition-colors uppercase">Max</span>
                                <Input 
                                   placeholder="Giá tối đa..." 
                                   className="h-10 rounded-xl bg-background border-border text-[11px] font-bold pl-4 pr-12 focus-visible:ring-primary/20 shadow-sm transition-all group-hover:border-primary/20"
                                   value={filters.maxPrice}
                                   onChange={(e) => setFilters((f: any) => ({...f, maxPrice: e.target.value}))}
                                />
                             </div>
                          </div>
                       </div>

                       {/* Status Switch */}
                       <div className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border shadow-sm transition-all hover:bg-white hover:border-primary/20">
                          <div className="space-y-0.5">
                             <Label className="text-[11px] font-bold text-foreground leading-tight">Còn hàng</Label>
                             <p className="text-[9px] text-muted-foreground font-medium">Chỉ xem sản phẩm sẵn có</p>
                          </div>
                          <Switch 
                             checked={filters.inStock} 
                             onCheckedChange={(v) => setFilters((f: any) => ({...f, inStock: v}))}
                             className="data-[state=checked]:bg-primary scale-90"
                          />
                       </div>



                       {/* Dynamic Facets or Search Results */}
                       {searchResults ? (
                         <div className="space-y-6 pt-4 border-t border-border/40">
                            {[
                               { title: "Thương hiệu", data: searchResults.facets?.brandId, labels: searchResults.facetLabels?.brandId, key: "brandId" },
                               { title: "Danh mục", data: searchResults.facets?.categoryId, labels: searchResults.facetLabels?.categoryId, key: "categoryId" }
                            ].map((sec: any, idx: number) => {
                              const hasData = sec.data && Object.keys(sec.data).length > 0;
                              if (!hasData) return null;

                              return (
                               <div key={sec.key || idx} className="space-y-2.5">
                                  <div className="flex items-center justify-between px-1">
                                     <h5 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">{sec.title}</h5>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto scrollbar-hide pr-1">
                                     {Object.entries(sec.data as Record<string, number>).slice(0, 10).map(([facetId, facetCount], idx) => {
                                        const isSelected = (filters as any)[sec.key] === facetId;
                                          
                                        return (
                                          <button 
                                             key={`${sec.key}-${facetId}-${idx}`} 
                                             onClick={() => {
                                               setFilters((prev: any) => ({ ...prev, [sec.key]: (prev as any)[sec.key] === facetId ? "" : facetId }));
                                             }}
                                             className={cn(
                                               "group flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left",
                                               isSelected 
                                                 ? "bg-primary text-white shadow-md shadow-primary/20 border-primary" 
                                                 : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30"
                                             )}
                                           >
                                            <div className="flex items-center gap-2 min-w-0">
                                               <div className={cn(
                                                  "h-1 w-1 rounded-full transition-all",
                                                  isSelected ? "bg-white scale-150" : "bg-muted-foreground/30 group-hover:bg-primary"
                                               )} />
                                               <span className="text-[10px] font-semibold truncate">
                                                  {sec.labels?.[facetId] || facetId}
                                               </span>
                                            </div>
                                            <span className={cn(
                                              "text-[8px] font-mono font-bold px-1 py-0.5 rounded",
                                              isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                            )}>
                                               {facetCount}
                                            </span>
                                          </button>
                                        );
                                     })}
                                  </div>
                               </div>
                              );
                            })}
                         </div>
                       ) : null}
                    </div>
                 </div>
              </div>

              {/* Right: Suggestions & Top Results */}
              <div className="md:col-span-8 p-4 sm:p-6 overflow-hidden flex flex-col h-full max-h-[550px] lg:max-h-[600px]">
                 <div className="flex flex-col h-full min-h-0 space-y-6">
                    
                    {/* Brand & Category Suggestions */}
                    {(suggestions?.brandSuggestions?.length > 0 || suggestions?.categorySuggestions?.length > 0) && (
                       <div className="flex-shrink-0">
                          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/40">
                             {suggestions.brandSuggestions?.length > 0 && (
                                <div className="space-y-3">
                                   <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center gap-2">
                                      <Activity className="h-3.5 w-3.5 text-primary" /> Thương hiệu
                                   </p>
                                   <div className="space-y-1.5">
                                      {suggestions.brandSuggestions.map((b: any, idx: number) => (
                                         <div 
                                            key={`brand-${idx}`}
                                            className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50 cursor-pointer group transition-all"
                                            onClick={() => {
                                              router.push(`/products?brand=${b.id}`);
                                              setShowResults(false);
                                              setSearchQuery("");
                                            }}
                                         >
                                            <div className="h-6 w-6 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden">
                                              {b.logo ? <Image src={b.logo} alt={b.name} width={20} height={20} /> : <div className="text-[8px] font-bold">{b.name[0]}</div>}
                                            </div>
                                            <span className="text-xs font-semibold group-hover:text-primary transition-colors">{b.name}</span>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             )}
                             {suggestions.categorySuggestions?.length > 0 && (
                                <div className="space-y-3">
                                   <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center gap-2">
                                      <Box className="h-3.5 w-3.5 text-primary" /> Danh mục
                                   </p>
                                   <div className="space-y-1.5">
                                      {suggestions.categorySuggestions.map((c: any, idx: number) => (
                                         <div 
                                            key={`cat-${idx}`}
                                            className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/50 cursor-pointer group transition-all"
                                            onClick={() => {
                                              router.push(`/products?category=${c.id}`);
                                              setShowResults(false);
                                              setSearchQuery("");
                                            }}
                                         >
                                            <div className="h-6 w-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                              <ChevronRight className="h-3 w-3 text-indigo-400" />
                                            </div>
                                            <span className="text-xs font-semibold group-hover:text-primary transition-colors">{c.name}</span>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             )}
                          </div>
                       </div>
                    )}

                    {/* Trending Keywords */}
                    {suggestions?.querySuggestions?.length > 0 && (
                       <div className="flex-shrink-0 space-y-3">
                          <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center gap-2">
                             <TrendingUp className="h-3.5 w-3.5 text-primary" /> Bạn cũng có thể tìm
                          </p>
                          <div className="flex flex-wrap gap-2">
                             {suggestions.querySuggestions.map((s: string, idx: number) => (
                                <Badge 
                                   key={`${s}-${idx}`} 
                                   variant="secondary" 
                                   className="px-4 py-2 rounded-full cursor-pointer hover:bg-primary hover:text-white transition-all text-xs font-bold bg-muted/40 border border-border/40 shadow-sm"
                                   onClick={() => {
                                      setSearchQuery(s);
                                   }}
                                >
                                   {s}
                                </Badge>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* Hits List Section */}
                    <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
                       <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center justify-between px-1 flex-shrink-0">
                          <span className="flex items-center gap-2">
                             <Box className="h-3.5 w-3.5 text-primary" /> {searchQuery ? "Kết quả tìm kiếm" : "Khám phá sản phẩm"}
                          </span>
                          {searchResults?.totalHits > 0 && (
                             <span className="text-primary/60 font-mono tracking-tight text-[10px]">({searchResults.totalHits} sản phẩm)</span>
                          )}
                        </p>

                       <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 pb-20 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                          {searchQuery.trim() ? (
                             searchResults?.hits?.length > 0 ? (
                                searchResults.hits.map((p: any, idx: number) => (
                                   <Link
                                      key={p.id || p._id || idx}
                                      href={`/products/${p.slug || p.id || p._id}`}
                                      className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-transparent hover:border-primary/20 hover:bg-card cursor-pointer transition-all group shadow-sm no-underline text-foreground"
                                      onClick={() => {
                                         apiClient.post("/search/events/click", {
                                            productId: p.id || p._id,
                                            queryId: searchResults?.queryId,
                                            position: idx + 1,
                                            userId: user?.id,
                                            sessionId: localStorage.getItem('sessionId')
                                         }).catch(() => {});
                                         setShowResults(false);
                                         setSearchQuery("");
                                       }}
                                    >
                                      <div className="h-16 w-16 relative rounded-xl overflow-hidden shrink-0 border border-border bg-white group-hover:scale-105 transition-transform duration-500 shadow-sm">
                                        {p.image ? (
                                          <Image src={p.image} alt={p.name} fill className="object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-muted/20">Empty</div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors leading-snug">{p.name}</p>
                                      <div className="flex items-center gap-3 mt-1.5 font-mono">
                                         <p className="text-xs font-black text-primary">
                                           {new Intl.NumberFormat('vi-VN').format(p.minPrice || p.price)}đ
                                         </p>
                                         <span className="w-1 h-1 rounded-full bg-border" />
                                         <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-60 line-through">
                                           {new Intl.NumberFormat('vi-VN').format((p.minPrice || p.price) * 1.2)}đ
                                         </p>
                                      </div>
                                   </div>
                                      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all mr-2" />
                                   </Link>
                                ))
                             ) : isSearching ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 bg-muted/5 rounded-3xl border border-dashed border-border/60">
                                   <div className="h-10 w-10 relative">
                                      <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
                                      <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                   </div>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Đang quét kho hàng bằng AI...</p>
                                </div>
                             ) : (
                                <div className="py-20 flex flex-col items-center justify-center gap-3 bg-muted/5 rounded-3xl border border-dashed border-border/60">
                                   <Activity className="h-8 w-8 text-muted-foreground/20" />
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">Không tìm thấy sản phẩm phù hợp</p>
                                   
                                   {searchResults?.noResult?.suggestedQueries?.length > 0 && (
                                     <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                       <p className="text-[10px] font-bold text-primary/60 uppercase">Ý bạn là:</p>
                                       <div className="flex flex-wrap justify-center gap-2">
                                         {searchResults.noResult.suggestedQueries.map((sq: string, idx: number) => (
                                           <Badge 
                                              key={idx} 
                                              variant="outline" 
                                              className="cursor-pointer hover:bg-primary hover:text-white transition-all border-primary/20"
                                              onClick={() => setSearchQuery(sq)}
                                           >
                                             {sq}
                                           </Badge>
                                         ))}
                                       </div>
                                     </div>
                                   )}
                                </div>
                             )
                          ) : (
                             <div className="py-12 space-y-10">
                                <div className="flex flex-col items-center text-center gap-5">
                                   <div className="h-16 w-16 rounded-[2rem] bg-primary/5 flex items-center justify-center text-primary shadow-inner border border-primary/10 relative">
                                      <Zap className="h-8 w-8" />
                                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                                   </div>
                                   <div className="space-y-1.5">
                                      <h3 className="text-lg font-black text-foreground tracking-tight">Cần giúp gì cho bạn?</h3>
                                      <p className="text-[11px] font-medium text-muted-foreground max-w-[240px]">Nhập từ khóa hoặc sử dụng các gợi ý bên dưới để tìm sản phẩm ưng ý nhất.</p>
                                   </div>
                                </div>

                                <div className="space-y-4">
                                   <p className="text-[11px] font-bold text-muted-foreground/50 flex items-center gap-2 px-2 uppercase tracking-widest">
                                      <TrendingUp className="h-3 w-3" /> Xu hướng hôm nay
                                   </p>
                                   <div className="flex flex-wrap gap-2">
                                      {(trendingQueries.length > 0 ? trendingQueries : ["iPhone", "MacBook", "Samsung", "iPad", "Tai nghe", "Đồng hồ"]).map((tag, idx) => (
                                         <button 
                                            key={`${tag}-${idx}`} 
                                            className="bg-muted/30 hover:bg-primary hover:text-white transition-all px-5 py-3 rounded-full text-xs font-bold border border-border/40 flex items-center gap-2 group shadow-sm active:scale-95"
                                            onClick={() => {
                                               setSearchQuery(tag);
                                            }}
                                         >
                                            <Search className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                                            {tag}
                                         </button>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

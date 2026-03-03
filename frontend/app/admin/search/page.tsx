"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Search,
  Zap,
  Database,
  CheckCircle,
  Loader2,
  Box,
  LayoutGrid,
  Settings2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Info,
  X,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/services/api";
import { cn } from "@/lib/utils";

interface SyncResult {
  totalProductsInDB: number;
  syncedToMeilisearch: number;
  message: string;
}

export default function SearchManagement() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  
  // Search Sandbox state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Real-time search with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 400); // 400ms delay to avoid hitting API too much

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const res = await apiClient.get("/search/products", {
        params: { keyword: query, limit: 5 }
      });
      setSearchResults(res.data.hits || []);
    } catch (error) {
      console.error("Test search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await apiClient.post("/admin/products/sync-search");
      const data = res.data;
      setLastSync(data);
      toast({
        title: "Đồng bộ hoàn tất",
        description: `Đã cập nhật ${data.syncedToMeilisearch} sản phẩm vào Search Engine.`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi đồng bộ",
        description: error.response?.data?.message || "Không thể kết nối tới Search Engine.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-primary/10 via-background to-background p-6 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden text-black dark:text-white">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Zap className="h-32 w-32 rotate-12" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Search Engine Center
          </h1>
          <p className="text-muted-foreground mt-1 font-medium italic">
            Tối ưu hóa và kiểm soát sức khỏe tìm kiếm Meilisearch
          </p>
        </div>
        <Button 
          onClick={handleSync} 
          disabled={isSyncing} 
          size="lg"
          className="relative z-10 h-12 px-8 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          {isSyncing ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-5 w-5 mr-2" />
          )}
          {isSyncing ? "Syncing..." : "Re-index Database"}
        </Button>
      </div>

      {/* Top Stats & Engine Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                        <Database className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Engine Status</p>
                        <Badge variant="outline" className="mt-0.5 bg-green-500/10 text-green-500 border-green-500/20 text-[10px] uppercase">Healthy</Badge>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground font-medium">Provider</span>
                        <span className="font-bold flex items-center gap-1">Meilisearch <div className="h-1 w-1 rounded-full bg-primary animate-pulse" /></span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Host IP</span>
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">127.0.0.1:7700</span>
                    </div>
                </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <LayoutGrid className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Indexed Docs</p>
                        <h4 className="text-2xl font-black text-foreground">{lastSync?.syncedToMeilisearch ?? "--"}</h4>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground font-medium">Source DB</span>
                        <span className="font-bold">MongoDB</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Sync Rate</span>
                        <span className="text-success font-bold font-mono">100%</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Configuration Summary Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Search Logic</h3>
            </div>
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Searchable Attributes</p>
                    <div className="flex flex-wrap gap-1.5">
                        {['name', 'description', 'slug'].map(tag => (
                            <Badge key={tag} className="bg-primary/5 text-primary border-primary/10 font-mono text-[10px] py-0">{tag}</Badge>
                        ))}
                    </div>
                </div>
                <div className="space-y-1.5 pt-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Filterable Fields</p>
                    <div className="flex flex-wrap gap-1.5">
                        {['price', 'categoryId', 'brandId', 'isFeatured'].map(tag => (
                            <Badge key={tag} variant="secondary" className="font-mono text-[10px] py-0">{tag}</Badge>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Search Sandbox (REAL TEST) */}
        <div className="lg:col-span-8 bg-card border border-border rounded-3xl overflow-hidden shadow-sm shadow-primary/5">
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-lg">Search Sandbox</h3>
                </div>
                <Badge variant="outline" className="bg-background text-[10px]">REAL-TIME PREVIEW</Badge>
            </div>
            <div className="p-8 space-y-6">
                <div className="flex gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input 
                            placeholder="Nhập từ khóa tìm kiếm..." 
                            className="pl-11 pr-11 h-12 bg-muted/40 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/40 text-base"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery("")}
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-all"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                        {isSearching && (
                            <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Results Preview */}
                <div className="pt-4 min-h-[320px]">
                    {searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {searchResults.map((item: any) => (
                                <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-all border border-transparent hover:border-border group">
                                    <div className="h-16 w-16 relative rounded-xl overflow-hidden bg-white shrink-0 shadow-sm">
                                        {item.image ? (
                                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground uppercase">No Img</div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex flex-col justify-center">
                                        <h5 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{item.name}</h5>
                                        <p 
                                          className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed"
                                          dangerouslySetInnerHTML={{ 
                                            __html: item.description?.replace(/<[^>]*>?/gm, '') || "Không có mô tả cho sản phẩm này." 
                                          }}
                                        />
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[11px] font-black text-foreground">
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                                            </span>
                                            <Badge className="h-4 px-1.5 text-[9px] font-mono bg-muted text-muted-foreground border-none">ID: {item.id.substring(0,6)}...</Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-10 opacity-40">
                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                               <Search className="h-10 w-10" />
                            </div>
                            <p className="text-sm font-bold text-center">Chưa có kết quả tìm kiếm.</p>
                            <p className="text-xs text-center max-w-[240px] mt-1 italic">Hãy nhập từ khóa và nhấn nút Test Search để kiểm tra Engine đang hoạt động như thế nào.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right: Sync Log & Guide */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <RefreshCw className={cn("h-4 w-4 text-primary", isSyncing && "animate-spin")} />
                    Sync Log
                </h4>
                {!lastSync ? (
                    <div className="px-4 py-8 text-center rounded-2xl border border-dashed border-border/60">
                         <Info className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                         <p className="text-xs text-muted-foreground">Chưa có dữ liệu đồng bộ trong phiên làm việc này.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-medium">DB Records</span>
                                <span className="font-black text-foreground">{lastSync.totalProductsInDB}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-medium">Engine Records</span>
                                <span className="font-black text-success">{lastSync.syncedToMeilisearch}</span>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-success transition-all duration-1000" 
                                style={{ width: `${(lastSync.syncedToMeilisearch / lastSync.totalProductsInDB) * 100}%` }} 
                            />
                        </div>
                        <div className="p-3 bg-success/5 border border-success/10 rounded-xl">
                            <p className="text-[10px] text-success font-bold flex items-center gap-1.5">
                                <CheckCircle className="h-3 w-3" />
                                {lastSync.message}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-secondary/10 dark:bg-secondary/5 border border-border/40 rounded-3xl p-6">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    Khi nào cần Sync?
                </h4>
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-blue-700">1</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Khi bạn thực hiện thao tác xóa dữ liệu trực tiếp trong Database (MongoDB) mà không qua giao diện Admin.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-blue-700">2</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Khi Engine trả về kết quả tìm kiếm không trùng khớp với danh sách sản phẩm hiện có.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-black text-blue-700">3</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Cài đặt lại toàn bộ hệ thống Search sang Server hoặc Index mới.
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

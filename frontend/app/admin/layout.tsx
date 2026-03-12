"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Loader2, Sun, Moon } from "lucide-react";
import {
  X,
  Activity,
  Box,
  TrendingUp,
  ArrowUpRight,
  Filter,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  Layers,
  Warehouse,
  Ticket,
  Star,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  ChevronDown,
  Zap,
  ArrowRight,
  Settings2,
} from "lucide-react";
import { categoryApi, brandApi } from "@/services/api";
import { useRef } from "react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/services/api";
import Image from "next/image";
import { Toaster } from "@/components/ui/toaster";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipPortal,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import "./admin.css";

/* =======================
   Nav Item
 ======================= */
interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
}

const NavItem = ({ href, icon: Icon, label, collapsed }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  const item = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          : "text-sidebar-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-md transition-all duration-300"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 flex-shrink-0 transition-all duration-200",
          isActive && "text-primary-foreground",
          collapsed && "hover:drop-shadow-lg"
        )}
      />
      {!collapsed && <span className="font-medium truncate">{label}</span>}
    </Link>
  );

  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent side="right" className="font-bold dropdown-content">
        {label}
      </TooltipContent>
    </Tooltip>
  ) : (
    item
  );
};

/* =======================
   Menu config
 ======================= */
const navItems = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/products", icon: Package, label: "Sản phẩm" },
  { href: "/admin/categories", icon: FolderTree, label: "Danh mục" },
  { href: "/admin/brands", icon: Layers, label: "Thương hiệu" },
  { href: "/admin/orders", icon: ShoppingCart, label: "Đơn hàng" },
  { href: "/admin/users", icon: Users, label: "Người dùng" },
  { href: "/admin/inventory", icon: Warehouse, label: "Tồn kho" },
  { href: "/admin/coupons", icon: Ticket, label: "Khuyến mãi" },
  { href: "/admin/reviews", icon: Star, label: "Đánh giá" },
  { href: "/admin/search", icon: Search, label: "Search Engine" },
  { href: "/admin/settings", icon: Settings, label: "Cài đặt" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  // Auto collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Search Hub State (Premium)
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    categoryId: "",
    brandId: "",
    inStock: false,
    minPrice: "",
    maxPrice: "",
    sort: "default"
  });
  const [trendingQueries, setTrendingQueries] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch Metadata
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, brandRes, trendRes] = await Promise.all([
          categoryApi.getAdminCategories(),
          brandApi.getAdminBrands(),
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
          // If clicking on a portal-based element or specifically a Radix Select item, don't close
          if (target instanceof HTMLElement) {
             const isRadixPortal = target.closest('[data-radix-portal]');
             const isSelectUI = target.closest('[role="listbox"]') || target.closest('[role="option"]');
             const isDetached = !document.body.contains(target); // Radix often unmounts items instantly on click

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
        // Do not close showResults here so it stays open on empty focus
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
      console.error("Layout search error:", error);
    } finally {
      setIsSearching(false);
    }
  };



  // Kiểm tra auth và redirect nếu cần
  useEffect(() => {
    if (loading) return; // Đang load, chờ

    if (!isAuthenticated || !user) {
      // Chưa login, redirect về auth
      router.push('/auth');
      return;
    }

    if (user.role !== 'admin') {
      // Không phải admin, redirect về home
      router.push('/');
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Nếu đang load, hiển thị spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Nếu chưa login hoặc không phải admin, đừng render gì
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* ===== Sidebar ===== */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
            collapsed ? "w-[72px]" : "w-64"
          )}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <img 
                    src="/assets/img/protechstore.png" 
                    alt="Logo" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-foreground tracking-tight">ProTech</span>
                  <span className="font-black text-primary tracking-tight">Admin</span>
                </div>
              </Link>
            )}
            {collapsed && (
              <Link href="/" className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center mx-auto hover:scale-110 transition-transform">
                <img 
                  src="/assets/img/protechstore.png" 
                  alt="Logo" 
                  className="w-full h-full object-cover rounded-lg"
                />
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </nav>

          {/* Collapse Toggle */}
          <div className="p-3 border-t border-sidebar-border">
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "default"}
              className={cn("w-full", collapsed && "justify-center")}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <>
                  <ChevronLeft className="h-5 w-5" />
                  <span>Thu gọn</span>
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* ===== Main ===== */}
        <div
          className={cn(
            "transition-all duration-300",
            collapsed ? "ml-[72px]" : "ml-64"
          )}
        >
          {/* Header */}
          <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30">
            {/* Search Hub */}
            <div className="flex items-center gap-4 flex-1 max-w-xl relative" ref={searchRef}>
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-indigo-500" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
                  className="pl-11 h-11 bg-secondary/40 border-border/40 focus-visible:ring-2 focus-visible:ring-indigo-500/20 rounded-2xl text-sm font-medium transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setShowResults(true);
                    if (!localStorage.getItem('sessionId')) {
                      localStorage.setItem('sessionId', 'sess_' + Math.random().toString(36).substring(2, 15));
                    }
                  }}
                  onClick={() => setShowResults(true)}
                />
                
                {searchQuery && (
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                     {isSearching && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
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
                <div className="absolute top-[calc(100%+12px)] -left-20 sm:left-0 w-[95vw] sm:w-[850px] bg-background/95 backdrop-blur-xl border border-border/60 rounded-[2rem] shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-12 max-h-[600px]">
                      
                      {/* Left: Configuration (Quick Filters) - Same as Sandbox */}
                      <div className="md:col-span-4 bg-muted/20 border-r border-border/40 overflow-y-auto max-h-[600px] scrollbar-hide">
                         <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-border/40">
                               <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center gap-2">
                                  <Settings2 className="h-3.5 w-3.5 text-indigo-500" /> Bộ lọc nhanh
                               </p>
                               <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-indigo-600 px-2 cursor-pointer"
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
                                  <Select value={filters.sort} onValueChange={(v) => setFilters(f => ({...f, sort: v}))}>
                                     <SelectTrigger className="h-10 rounded-xl bg-background border-border shadow-sm font-semibold text-xs">
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
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors">MIN</span>
                                        <Input 
                                           placeholder="Giá tối thiểu..." 
                                           className="h-10 rounded-xl bg-background border-border text-[11px] font-bold pl-4 pr-12 focus-visible:ring-indigo-500/20 shadow-sm"
                                           value={filters.minPrice}
                                           onChange={(e) => setFilters(f => ({...f, minPrice: e.target.value}))}
                                        />
                                     </div>
                                     <div className="relative group">
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/40 group-focus-within:text-indigo-500 transition-colors">MAX</span>
                                        <Input 
                                           placeholder="Giá tối đa..." 
                                           className="h-10 rounded-xl bg-background border-border text-[11px] font-bold pl-4 pr-12 focus-visible:ring-indigo-500/20 shadow-sm"
                                           value={filters.maxPrice}
                                           onChange={(e) => setFilters(f => ({...f, maxPrice: e.target.value}))}
                                        />
                                     </div>
                                  </div>
                               </div>

                               {/* Status Switch */}
                               <div className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border/40 shadow-sm transition-all hover:bg-white hover:border-indigo-100">
                                  <div className="space-y-0.5">
                                     <Label className="text-[11px] font-bold text-foreground">Tình trạng</Label>
                                     <p className="text-[9px] text-muted-foreground font-medium">Chỉ sản phẩm còn hàng</p>
                                  </div>
                                  <Switch 
                                     checked={filters.inStock} 
                                     onCheckedChange={(v) => setFilters(f => ({...f, inStock: v}))}
                                     className="data-[state=checked]:bg-indigo-600 scale-90"
                                  />
                               </div>

                               {/* Dynamic Facets from Results */}
                               {searchResults && (
                                 <div className="space-y-6 pt-4 border-t border-border/40">
                                    {[
                                       { title: "Thương hiệu", data: searchResults.facets?.brandId, labels: searchResults.facetLabels?.brandId, key: "brandId" },
                                       { title: "Danh mục", data: searchResults.facets?.categoryId, labels: searchResults.facetLabels?.categoryId, key: "categoryId" }
                                    ].map((sec: any) => {
                                      const hasData = sec.data && Object.keys(sec.data).length > 0;
                                      if (!hasData) return null;

                                      return (
                                       <div key={sec.key} className="space-y-2.5">
                                          <div className="flex items-center justify-between px-1">
                                             <h5 className="text-[10px] font-bold text-muted-foreground/60">{sec.title}</h5>
                                          </div>
                                          <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto scrollbar-hide pr-1">
                                             {Object.entries(sec.data as Record<string, number>).slice(0, 8).map(([facetId, facetCount]) => {
                                                const isSelected = (filters as any)[sec.key] === facetId;
                                                  
                                                return (
                                                  <button 
                                                     key={facetId} 
                                                     onClick={() => {
                                                         setFilters(prev => ({ ...prev, [sec.key]: (prev as any)[sec.key] === facetId ? "" : facetId }));
                                                     }}
                                                     className={cn(
                                                       "group flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left",
                                                       isSelected 
                                                         ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-indigo-500/10" 
                                                         : "bg-background border-border/40 text-muted-foreground hover:border-indigo-300 hover:bg-slate-50"
                                                     )}
                                                   >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                       <div className={cn(
                                                          "h-1 w-1 rounded-full transition-all",
                                                          isSelected ? "bg-indigo-400 scale-150" : "bg-muted-foreground/30 group-hover:bg-indigo-300"
                                                       )} />
                                                       <span className="text-[10px] font-semibold truncate">
                                                          {sec.labels?.[facetId] || facetId}
                                                       </span>
                                                    </div>
                                                    <span className={cn(
                                                      "text-[8px] font-mono font-bold px-1 py-0.5 rounded",
                                                      isSelected ? "bg-white/10 text-white" : "bg-muted text-muted-foreground"
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
                               )}
                            </div>
                         </div>
                      </div>

                      {/* Right: Suggestions & Top Results */}
                      <div className="md:col-span-8 p-6 overflow-hidden flex flex-col h-[600px]">
                         <div className="flex flex-col h-full min-h-0 space-y-6">
                            
                            {/* Tags / Suggestions */}
                            {suggestions?.querySuggestions?.length > 0 && (
                               <div className="flex-shrink-0 space-y-3">
                                  <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center gap-2">
                                     <TrendingUp className="h-3.5 w-3.5 text-indigo-500" /> Gợi ý xu hướng
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                     {suggestions.querySuggestions.map((s: string) => (
                                        <Badge 
                                           key={s} 
                                           variant="secondary" 
                                           className="px-4 py-2 rounded-full cursor-pointer hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold bg-muted/40 border border-border/40"
                                           onClick={() => setSearchQuery(s)}
                                        >
                                           {s}
                                        </Badge>
                                     ))}
                                  </div>
                               </div>
                            )}

                            {/* Hits List Section */}
                            <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
                               <p className="text-[11px] font-bold text-muted-foreground/70 flex items-center justify-between flex-shrink-0">
                                  <span className="flex items-center gap-2">
                                     <Box className="h-3.5 w-3.5 text-indigo-500" /> {searchQuery ? "Kết quả tìm kiếm" : "Gợi ý cho bạn"}
                                  </span>
                                  {searchResults?.totalHits > 0 && (
                                     <span className="text-indigo-600/60 font-mono tracking-tight text-[10px]">({searchResults.totalHits} kết quả)</span>
                                  )}
                                </p>

                               <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 pb-20 scrollbar-thin scrollbar-thumb-indigo-100 scrollbar-track-transparent">
                                  {searchQuery.trim() ? (
                                     searchResults?.hits?.length > 0 ? (
                                         searchResults.hits.map((p: any, idx: number) => (
                                            <Link
                                               key={p.id || p._id}
                                               href={`/admin/products/${p.id || p._id}`}
                                               className="flex items-center gap-4 p-3 rounded-2xl bg-muted/10 border border-transparent hover:border-indigo-100 hover:bg-white cursor-pointer transition-all group shadow-sm no-underline text-foreground"
                                               onClick={() => {
                                                  apiClient.post("/search/events/click", {
                                                     productId: p.id || p._id,
                                                     queryId: searchResults?.queryId,
                                                     q: searchQuery,
                                                     position: idx + 1,
                                                     userId: user?.id,
                                                     sessionId: localStorage.getItem('sessionId')
                                                  }).catch(() => {});
                                                  setShowResults(false);
                                                  setSearchQuery("");
                                               }}
                                            >
                                              <div className="h-14 w-14 relative rounded-xl overflow-hidden shrink-0 border border-border/50 bg-white group-hover:scale-105 transition-transform duration-500 shadow-sm">
                                                {p.image ? (
                                                  <Image src={p.image} alt={p.name} fill className="object-cover" />
                                                ) : (
                                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-muted/20">Empty</div>
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                              <p className="text-sm font-semibold truncate group-hover:text-indigo-600 transition-colors leading-snug">{p.name}</p>
                                              <div className="flex items-center gap-3 mt-1.5 font-mono">
                                                 <p className="text-xs font-bold text-indigo-600">
                                                   {new Intl.NumberFormat('vi-VN').format(p.minPrice || p.price)}đ
                                                 </p>
                                                 <span className="w-1 h-1 rounded-full bg-border" />
                                                 <p className="text-[10px] text-muted-foreground font-medium">ID: {(p.id || p._id).substring(0,8)}</p>
                                              </div>
                                           </div>
                                              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all mr-2" />
                                            </Link>
                                         ))
                                     ) : isSearching ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-muted/5 rounded-3xl border border-dashed border-border/60">
                                           <div className="h-10 w-10 relative">
                                              <div className="absolute inset-0 rounded-full border-2 border-indigo-100" />
                                              <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                                           </div>
                                           <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Neural Ranking đang tìm kiếm...</p>
                                        </div>
                                     ) : (
                                         <div className="py-20 flex flex-col items-center justify-center gap-3 bg-muted/5 rounded-3xl border border-dashed border-border/60">
                                            <Activity className="h-8 w-8 text-muted-foreground/20" />
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-40">Không tìm thấy sản phẩm phù hợp</p>
                                            
                                            {searchResults?.noResult?.suggestedQueries?.length > 0 && (
                                              <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                                <p className="text-[10px] font-bold text-indigo-600/60 uppercase">Ý bạn là:</p>
                                                <div className="flex flex-wrap justify-center gap-2 px-6">
                                                  {searchResults.noResult.suggestedQueries.map((sq: string, idx: number) => (
                                                    <Badge 
                                                      key={idx} 
                                                      variant="outline" 
                                                      className="cursor-pointer hover:bg-indigo-600 hover:text-white transition-all border-indigo-200"
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
                                        <div className="flex flex-col items-center text-center gap-4">
                                           <div className="h-16 w-16 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                                              <Zap className="h-8 w-8" />
                                           </div>
                                           <div className="space-y-1">
                                              <h3 className="text-lg font-bold text-foreground tracking-tight">Bắt đầu tìm kiếm...</h3>
                                           </div>
                                        </div>

                                        <div className="space-y-4">
                                           <p className="text-[11px] font-bold text-muted-foreground/50 flex items-center gap-2 px-2">
                                              <TrendingUp className="h-3 w-3" /> Xu hướng tìm kiếm
                                           </p>
                                           <div className="flex flex-wrap gap-2">
                                               {(trendingQueries.length > 0 ? trendingQueries : ["iphone", "laptop", "tai nghe", "macbook", "tablet", "ipad"]).map((tag) => (
                                                  <button 
                                                     key={tag} 
                                                     className="bg-muted/30 hover:bg-indigo-600 hover:text-white transition-all px-5 py-2.5 rounded-full text-xs font-bold border border-border/40 flex items-center gap-2 group shadow-sm"
                                                     onClick={() => setSearchQuery(tag)}
                                                  >
                                                     <TrendingUp className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
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

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="rounded-full"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="gap-3 pl-1.5 pr-4 focus-visible:ring-0 h-12 rounded-full hover:bg-primary hover:text-primary-foreground border border-transparent hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 group"
                  >
                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm transition-transform group-hover:scale-95">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.fullName?.substring(0, 2).toUpperCase() || 'AD'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left hidden sm:flex pr-2">
                      <span className="text-sm font-medium leading-none mb-1 group-hover:text-white transition-colors">{user.fullName}</span>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/80 uppercase font-medium opacity-70 transition-colors">
                        Quản trị viên
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground transition-all group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 dropdown-content p-2"
                >
                  <div className="px-3 py-4 mb-2 bg-muted/30 rounded-lg">
                    <p className="text-sm font-semibold truncate leading-none">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
                  </div>
                  
                  <DropdownMenuSeparator className="opacity-50" />
                  
                  <DropdownMenuItem className="py-3 cursor-pointer focus:bg-primary/10 transition-all duration-200 group rounded-md" onClick={() => router.push('/admin/settings')}>
                    <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center mr-3 group-focus:scale-95 transition-transform">
                      <Settings className="h-5 w-5 text-info" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm group-focus:text-primary transition-colors">Cài đặt</span>
                      <span className="text-[10px] text-muted-foreground leading-none">Quản lý tài khoản & Hệ thống</span>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="opacity-50" />
                  
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive py-2.5 cursor-pointer focus:bg-destructive/10 focus:text-destructive">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center mr-3 text-destructive">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Đăng xuất</span>
                      <span className="text-[10px] leading-none opacity-60">Thoát phiên làm việc</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}

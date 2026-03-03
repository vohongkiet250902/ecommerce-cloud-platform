"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Loader2, Sun, Moon } from "lucide-react";
import {
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
  X,
} from "lucide-react";

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

  // Search Logic
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const res = await apiClient.get("/search/products", {
        params: { keyword: query, limit: 10 }
      });
      setSearchResults(res.data.hits || []);
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
            {/* Search */}
            <div className="flex items-center gap-4 flex-1 max-w-xl relative">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Tìm nhanh sản phẩm..."
                  className="pl-10 h-10 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowResults(true)}
                />
                
                {searchQuery && (
                   <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                     {isSearching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                     <button 
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setShowResults(false);
                        }}
                        className="h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                     >
                       <X className="h-3 w-3" />
                     </button>
                   </div>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (searchQuery.trim()) && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowResults(false)} />
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 max-h-[400px] overflow-y-auto">
                      {searchResults.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-widest border-b mb-1">
                            Sản phẩm ({searchResults.length})
                          </div>
                          {searchResults.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary cursor-pointer transition-colors group"
                              onClick={() => {
                                router.push(`/admin/products/${product.id}`);
                                setShowResults(false);
                                setSearchQuery("");
                              }}
                            >
                              <div className="h-10 w-10 relative rounded-lg overflow-hidden shrink-0 border border-border/50 bg-white">
                                {product.image ? (
                                  <Image src={product.image} alt={product.name} fill className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] uppercase bg-muted text-muted-foreground">No</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </div>
                          ))}
                        </>
                      ) : !isSearching ? (
                        <div className="p-8 text-center bg-muted/10">
                          <p className="text-sm font-medium text-muted-foreground">Không tìm thấy sản phẩm nào.</p>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2 opacity-40" />
                          <p className="text-xs text-muted-foreground">Đang tìm kiếm...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
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

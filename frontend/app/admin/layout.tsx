"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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
  Bell,
  User,
  LogOut,
  ChevronDown,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
  { href: "/admin/search", icon: Search, label: "Search" },
  { href: "/admin/settings", icon: Settings, label: "Cài đặt" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize state from localStorage or system preference
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    return savedTheme === "dark" || (!savedTheme && prefersDark);
  });

  useEffect(() => {
    // Apply theme to DOM
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg text-foreground">
                  Admin Panel
                </span>
              </div>
            )}
            {collapsed && (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
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
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm sản phẩm, đơn hàng, khách hàng..."
                  className="pl-10 bg-secondary border-0 focus-visible:ring-1"
                />
              </div>
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
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      3
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 dropdown-content"
                >
                  <DropdownMenuLabel className="flex items-center justify-between">
                    Thông báo
                    <Badge variant="secondary">3 mới</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                    <span className="font-medium">Đơn hàng mới #12345</span>
                    <span className="text-xs text-muted-foreground">
                      2 phút trước
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                    <span className="font-medium">Sản phẩm sắp hết hàng</span>
                    <span className="text-xs text-muted-foreground">
                      15 phút trước
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
                    <span className="font-medium">Review mới cần duyệt</span>
                    <span className="text-xs text-muted-foreground">
                      1 giờ trước
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-center text-primary justify-center font-medium">
                    Xem tất cả
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2 pr-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                      <AvatarFallback>{user.fullName?.substring(0, 2).toUpperCase() || 'AD'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left hidden sm:flex">
                      <span className="text-sm font-medium">{user.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 dropdown-content"
                >
                  <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Hồ sơ cá nhân
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Cài đặt
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
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

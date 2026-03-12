"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ShoppingCart, User, Menu, X, Moon, Sun, LogOut, ChevronDown, Settings, Package, Shield } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/hooks/useCart";
import { CartSidebar } from "./CartSidebar";
import { SearchHub } from "./SearchHub";

interface HeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
}

const navItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Sản phẩm", href: "/products" },
  { label: "Khuyến mãi", href: "/promotions" },
  { label: "Hỗ trợ", href: "/support" },
];

export default function Header({
  cartItemCount: manualCartItemCount,
  onCartClick,
}: HeaderProps) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const { 
    cartItems, 
    cartItemCount: hookCartItemCount, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeItem 
  } = useCart();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const cartItemCount = mounted ? (manualCartItemCount ?? hookCartItemCount) : 0;

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      setIsCartOpen(true);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <img 
                src="/assets/img/protechstore.png" 
                alt="ProTech Store Logo" 
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
              <span className="text-xl font-black text-foreground hidden sm:block tracking-tight">
                ProTech
              </span>
              <span className="text-xl font-black text-primary hidden sm:block tracking-tight">
                Store
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="nav-link text-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search Hub (Advanced AI Search) */}
          <SearchHub />

          {/* Actions */}
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

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative"
              onClick={handleCartClick}
            >
              <ShoppingCart className="w-5 h-5" />
              {mounted && cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </Button>

            {/* Account/User Menu */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="gap-3 pl-1.5 pr-4 focus-visible:ring-0 h-11 rounded-full hover:bg-primary hover:text-primary-foreground border border-transparent hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 group hidden sm:flex"
                  >
                    <Avatar className="h-8 w-8 border-2 border-background shadow-sm transition-transform group-hover:scale-95">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.fullName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left hidden sm:flex pr-1">
                      <span className="text-sm font-medium leading-none mb-1 group-hover:text-white transition-colors">{user.fullName}</span>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary-foreground/80 uppercase font-medium opacity-70 transition-colors">
                        {user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
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
                  
                  <DropdownMenuItem className="py-2.5 cursor-pointer focus:bg-primary/10 transition-all duration-200 group rounded-md" onClick={() => router.push("/account")}>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 group-focus:scale-95 transition-transform">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm group-focus:text-primary transition-colors">Hồ sơ cá nhân</span>
                      <span className="text-[10px] text-muted-foreground leading-none">Thông tin tài khoản</span>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="py-2.5 cursor-pointer focus:bg-primary/10 transition-all duration-200 group rounded-md" onClick={() => router.push("/orders")}>
                    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center mr-3 group-focus:scale-95 transition-transform">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm group-focus:text-orange-600 transition-colors">Đơn hàng của tôi</span>
                      <span className="text-[10px] text-muted-foreground leading-none">Lịch sử mua sắm</span>
                    </div>
                  </DropdownMenuItem>

                  {user.role === 'admin' && (
                    <DropdownMenuItem className="py-2.5 cursor-pointer focus:bg-primary/10 transition-all duration-200 group rounded-md" onClick={() => router.push("/admin")}>
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center mr-3 group-focus:scale-95 transition-transform">
                        <Shield className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm group-focus:text-purple-600 transition-colors">Quản trị</span>
                        <span className="text-[10px] text-muted-foreground leading-none">Bảng điều khiển Admin</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="opacity-50" />
                  
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive py-2.5 cursor-pointer focus:bg-destructive/10 focus:text-destructive group rounded-md">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center mr-3 text-destructive group-focus:scale-95 transition-transform">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Đăng xuất</span>
                      <span className="text-[10px] leading-none opacity-60">Thoát phiên làm việc</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                className="hidden sm:flex items-center gap-2 pl-2 pr-4 h-11 rounded-full border border-border/40 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 group"
                onClick={() => router.push("/auth")}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors">Đăng nhập</span>
              </Button>
            )}



            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-full"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-t border-border/40"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="nav-link py-3 px-4 rounded-lg hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {isAuthenticated && user ? (
                <>
                  <Link
                    href="/account"
                    className="nav-link py-3 px-4 rounded-lg hover:bg-primary hover:text-primary-foreground flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Tài khoản ({user.role})
                  </Link>
                  <Link
                    href="/orders"
                    className="nav-link py-3 px-4 rounded-lg hover:bg-primary hover:text-primary-foreground flex items-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Đơn hàng của tôi
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="nav-link py-3 px-4 rounded-lg hover:bg-primary hover:text-primary-foreground flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Bảng điều khiển Admin
                    </Link>
                  )}
                  <button
                    className="nav-link py-3 px-4 rounded-lg hover:bg-primary hover:text-primary-foreground flex items-center gap-2 w-full text-left"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  className="nav-link py-3 px-4 rounded-lg hover:bg-primary hover:text-primary-foreground flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Đăng nhập
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSidebar
        isOpen={isCartOpen}
        onOpenChange={setIsCartOpen}
        cartItems={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
      />
    </header>
  );
}
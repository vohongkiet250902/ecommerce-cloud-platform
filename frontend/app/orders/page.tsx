"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Package, 
  Search, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  AlertCircle,
  ShoppingBag,
  Loader2,
  Calendar,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { orderApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type OrderStatus = 'pending' | 'paid' | 'shipping' | 'completed' | 'cancelled';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderApi.getUserOrders({
        page: currentPage,
        limit: 5,
        status: statusFilter || undefined
      });
      
      const responseData = res.data?.data || res.data;
      setOrders(Array.isArray(responseData) ? responseData : responseData.data || []);
      
      const total = res.data?.total || responseData.total || 0;
      const limit = res.data?.limit || responseData.limit || 5;
      setTotalPages(Math.ceil(total / limit) || 1);
    } catch (error) {
      console.error("Failed to fetch orders", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách đơn hàng",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth?redirect=/orders");
    } else if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, currentPage, statusFilter, router]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    
    try {
      await orderApi.cancelMyOrder(orderId);
      toast({
        title: "Thành công",
        description: "Đơn hàng đã được yêu cầu hủy"
      });
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể hủy đơn hàng",
        variant: "destructive"
      });
    }
  };

  const statusMap: Record<OrderStatus, { label: string, color: string, icon: any }> = {
    pending: { label: "Chờ xử lý", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    paid: { label: "Đã thanh toán", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    shipping: { label: "Đang giao", color: "bg-primary/10 text-primary border-primary/20", icon: Truck },
    completed: { label: "Hoàn tất", color: "bg-success text-success-foreground", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND"
    }).format(price);
  };

  if (authLoading || (isAuthenticated && isFirstLoad && loading)) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <ShoppingBag className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 font-bold text-muted-foreground animate-pulse">Đang tải đơn hàng...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 dark:bg-background flex flex-col">
      <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />

      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col gap-4">
            <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex items-center gap-2"
            >
              <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-full h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-all duration-300 active:scale-95"
                  onClick={() => router.push("/")}
                >
                  <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-bold text-muted-foreground">Về trang chủ</span>
            </motion.div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-4xl lg:text-5xl font-black tracking-tighter"
                >
                  Đơn hàng của tôi
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground mt-2 text-lg"
                >
                  Theo dõi và quản lý lịch sử mua hàng của bạn
                </motion.p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto no-scrollbar">
            {[
              { label: "Tất cả", value: "" },
              { label: "Chờ xử lý", value: "pending" },
              { label: "Đang giao", value: "shipping" },
              { label: "Hoàn tất", value: "completed" },
              { label: "Đã hủy", value: "cancelled" }
            ].map((tab, i) => (
              <motion.div
                key={tab.value}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Button
                  variant={statusFilter === tab.value ? "default" : "outline"}
                  size="sm"
                  className="rounded-full px-6 whitespace-nowrap transition-all duration-300"
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setCurrentPage(1);
                  }}
                >
                  {tab.label}
                </Button>
              </motion.div>
            ))}
          </div>

          <div className="relative min-h-[400px]">
            {loading && orders.length > 0 && (
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center pt-12 pb-12 pointer-events-none">
                    <div className="px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-2xl font-bold text-sm animate-bounce flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang làm mới danh sách...
                    </div>
                </div>
            )}

            <div className={`space-y-6 transition-all duration-300 ${loading && orders.length > 0 ? 'opacity-40 grayscale-[0.5] scale-[0.99] pointer-events-none' : 'opacity-100'}`}>
                <AnimatePresence mode="wait">
              {orders.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-card rounded-3xl p-16 text-center shadow-sm border border-border/50"
                >
                  <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="h-12 w-12 text-primary/40" />
                  </div>
                  <h3 className="text-2xl font-bold">Chưa có đơn hàng nào</h3>
                  <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                    Bạn chưa có đơn hàng nào trong mục này. Bắt đầu mua sắm ngay thôi!
                  </p>
                  <Button 
                    className="mt-8 rounded-full px-10 h-12 font-bold gradient-hero shadow-lg"
                    onClick={() => router.push("/products")}
                  >
                    Khám phá sản phẩm ngay
                  </Button>
                </motion.div>
              ) : (
                orders.map((order, idx) => {
                  const status = statusMap[order.status as OrderStatus] || statusMap.pending;
                  const Icon = status.icon;

                  return (
                    <motion.div
                      key={order._id}
                      layout
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: idx * 0.05 
                      }}
                    >
                      <Card className="rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden bg-card/80 backdrop-blur-sm group border border-transparent hover:border-primary/20">
                        <div className="p-6 border-b border-border/50 flex flex-wrap items-center justify-between gap-4 bg-muted/20">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${status.color.split(' ')[0]}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Mã đơn hàng</p>
                              <p className="font-mono font-bold text-lg">#{order._id.substring(order._id.length - 8).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-right hidden sm:block mr-2">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ngày đặt</p>
                              <p className="text-sm font-bold">
                                {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                              </p>
                            </div>
                            <Badge className={`rounded-full px-5 py-1.5 border font-bold text-xs uppercase tracking-wider ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="p-0">
                          <div className="divide-y divide-border/50">
                            {order.items.map((item: any, i: number) => (
                              <div key={i} className="p-6 flex gap-6 hover:bg-primary/5 transition-colors duration-300">
                                <div className="w-24 h-24 rounded-2xl bg-muted overflow-hidden flex-shrink-0 border border-border/50 relative">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                                      <Package className="h-10 w-10" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                  <h4 className="font-extrabold text-lg truncate group-hover:text-primary transition-colors duration-300">{item.name}</h4>
                                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                     <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                     Phiên bản: <span className="font-bold text-foreground/80">{item.sku}</span>
                                  </p>
                                  <div className="flex items-center justify-between mt-3">
                                    <p className="text-sm font-medium bg-secondary/50 px-3 py-1 rounded-full">Số lượng: <span className="font-black">x{item.quantity}</span></p>
                                    <p className="font-black text-xl text-primary">{formatPrice(item.price)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>

                        <div className="p-6 bg-secondary/5 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center border border-border/50 shadow-sm">
                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Thanh toán</p>
                                <p className="text-sm">
                                    <span className="font-bold">{(order.paymentMethod || "cod").toUpperCase()}</span>
                                    {order.paymentStatus === 'paid' && <span className="ml-2 text-success font-black text-xs">● ĐÃ THANH TOÁN</span>}
                                </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6 w-full sm:w-auto">
                            <div className="text-right">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Tổng giá trị</p>
                              <p className="text-2xl font-black text-primary leading-tight drop-shadow-sm">{formatPrice(order.totalAmount)}</p>
                            </div>
                            
                            <div className="flex gap-2">
                              {order.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="default" 
                                  className="rounded-2xl border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold px-6 h-11 transition-all duration-300 active:scale-95"
                                  onClick={() => handleCancelOrder(order._id)}
                                >
                                  Hủy đơn hàng
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e: React.MouseEvent) => { e.preventDefault(); if(currentPage > 1) setCurrentPage(currentPage - 1); }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        isActive={currentPage === i + 1}
                        onClick={(e: React.MouseEvent) => { e.preventDefault(); setCurrentPage(i + 1); }}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e: React.MouseEvent) => { e.preventDefault(); if(currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

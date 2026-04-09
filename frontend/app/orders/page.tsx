"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
  Star,
  MessageSquare,
  X,
  CheckCircle,
  CreditCard,
  Eye,
  User,
  AlertTriangle,
  Trash2,
  MapPin,
  Smartphone,
  Mail,
  History,
  ArrowRight
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
import { orderApi, reviewApi, productApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'delivery_failed'
  | 'returned'
  | 'cancelled';

function OrderCountdown({ 
  id,
  expiresAt, 
  createdAt, 
  onExpire 
}: { 
  id: string,
  expiresAt?: string, 
  createdAt: string, 
  onExpire?: (id: string) => void 
}) {
  const [timeLeft, setTimeLeft] = useState<{ min: string, sec: string } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const expiry = expiresAt ? new Date(expiresAt).getTime() : new Date(createdAt).getTime() + 15 * 60 * 1000;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = expiry - now;
      
      if (diff <= 0) {
        setTimeLeft(null);
        setIsExpired(true);
        onExpire?.(id);
        return true;
      }
      
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({
        min: m.toString().padStart(2, '0'),
        sec: s.toString().padStart(2, '0')
      });
      return false;
    };

    const isDoneInitial = updateTimer();
    if (isDoneInitial) return;

    const timer = setInterval(() => {
      const isDone = updateTimer();
      if (isDone) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [id, expiresAt, createdAt, onExpire]);

  if (isExpired) return <span className="text-destructive font-bold text-[9px] uppercase tracking-wider">Hết hạn</span>;
  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1 bg-warning/10 px-1.5 py-0.5 rounded-full border border-warning/20">
      <Clock className="w-2.5 h-2.5 text-warning" />
      <span className="text-[9px] font-black text-warning font-mono">
        {timeLeft.min}:{timeLeft.sec}
      </span>
    </div>
  );
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const getErrorMessage = (error: any, defaultMsg: string) => {
    const msg = error?.response?.data?.message || error?.response?.data || error?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'object') return JSON.stringify(msg);
    return defaultMsg;
  };

  // Helper to format variant text for review comment
  const formatSkuValuesOnly = (sku: string) => {
    if (!sku || sku === "N/A" || sku === "DEFAULT") return "";
    if (sku.includes(":")) {
      return sku
        .split(/[,|\-|;]/)
        .map(part => {
          const splitPart = part.split(":");
          return splitPart.length > 1 ? splitPart[1].trim() : part.trim();
        })
        .filter(Boolean)
        .join(" - ");
    }
    return "";
  };

  const renderAttributes = (item: any) => {
    if (item.attributes) {
      if (Array.isArray(item.attributes)) {
        return item.attributes
          .map((attr: any) => `${attr.key || attr.name}: ${attr.value || attr.val}`)
          .join(" - ");
      }
      if (typeof item.attributes === 'object' && item.attributes !== null) {
        return Object.entries(item.attributes)
          .map(([key, value]) => `${key}: ${value}`)
          .join(" - ");
      }
      return String(item.attributes);
    }
    return formatSkuValuesOnly(item.sku);
  };

  // Helper to get variant display info from item (using data provided by BE)
  const getVariantDisplay = (item: any) => {
    return item.sku && item.sku !== 'DEFAULT' ? `SKU: ${item.sku}` : "";
  };

  // Review state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEnrichingDetail, setIsEnrichingDetail] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedItems, setReviewedItems] = useState<Record<string, number>>({});
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isConfirmReceivedModalOpen, setIsConfirmReceivedModalOpen] = useState(false);
  const [isNotReceivedModalOpen, setIsNotReceivedModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [orderToProcess, setOrderToProcess] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expiredOrders, setExpiredOrders] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOrderExpire = React.useCallback(async (orderId: string) => {
    setExpiredOrders(prev => {
      if (prev.has(orderId)) return prev;
      return new Set(prev).add(orderId);
    });

    try {
      await orderApi.cancelMyOrder(orderId);
      
      // Update local state for immediate UI feedback
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' } : o));
      
      if (selectedOrderDetail && selectedOrderDetail._id === orderId) {
        setSelectedOrderDetail((prev: any) => prev ? { ...prev, status: 'cancelled' } : prev);
      }

      toast({
        title: "Đơn hàng đã hết hạn",
        description: `Đơn hàng #${orderId.substring(orderId.length - 8).toUpperCase()} đã tự động hủy.`,
      });
    } catch (error) {
      console.error("Auto-cancel failed:", error);
    }
  }, [selectedOrderDetail, toast]);

  const isOrderExpired = (order: any) => {
    if (!order || !mounted) return false;
    if (expiredOrders.has(order._id)) return true;
    const expiry = order.expiresAt ? new Date(order.expiresAt).getTime() : new Date(order.createdAt).getTime() + 15 * 60 * 1000;
    return new Date().getTime() > expiry;
  };

  const isAnyItemReviewed = (order: any) => {
    if (!order || !order.items) return false;
    return order.items.some((item: any) => 
      reviewedItems[`${item.productId}-${item.sku}`]
    );
  };

  useEffect(() => {
    if (user) {
      const userId = user.id || "guest";
      const savedReviews = localStorage.getItem(`reviewed_items_${userId}`);
      if (savedReviews) {
        try {
          setReviewedItems(JSON.parse(savedReviews));
        } catch (e) {
          console.error("Failed to parse reviewed items", e);
        }
      }
    } else {
      setReviewedItems({});
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Support multiple statuses in filter (comma separated)
      const statuses = statusFilter ? statusFilter.split(",") : [];
      const primaryStatus = statuses.length === 1 ? statuses[0] : undefined;

      const res = await orderApi.getUserOrders({
        page: currentPage,
        limit: 5,
        status: primaryStatus
      });
      
      const responseData = res.data?.data || res.data;
      let fetchedOrders = Array.isArray(responseData) ? responseData : responseData.data || [];
      
      const limit = 5;

      // Handle multi-status filtering (like pending,paid,confirmed)
      if (statuses.length > 1) {
        // Fetch a larger sample (up to 100) and filter on client side for better UX
        const allRes = await orderApi.getUserOrders({ page: 1, limit: 100 });
        const allData = allRes.data?.data || allRes.data?.data || allRes.data || [];
        const filteredAll = allData.filter((o: any) => statuses.includes(o.status));
        
        // Update total pages based on filtered count
        setTotalPages(Math.ceil(filteredAll.length / limit) || 1);
        
        // Only take the slice for the current page
        const start = (currentPage - 1) * limit;
        fetchedOrders = filteredAll.slice(start, start + limit);
      } else {
        // Normal backend pagination
        const total = res.data?.total || responseData.total || 0;
        setTotalPages(Math.ceil(total / limit) || 1);
      }

      setOrders(fetchedOrders);

      // Enrichment logic removed as per user request to only show BE data
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

  const handleViewOrderDetail = (order: any) => {
    setSelectedOrderDetail(order);
    setIsDetailModalOpen(true);
    setIsEnrichingDetail(false);
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth?redirect=/orders");
    } else if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, currentPage, statusFilter, router]);

  const handleCancelOrderPrompt = (orderId: string) => {
    setOrderToCancel(orderId);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      setIsCancelling(true);
      const res = await orderApi.cancelMyOrder(orderToCancel);
      const updatedOrder = res.data?.data || res.data;
      
      toast({
        variant: "success",
        title: "Thành công",
        description: "Đơn hàng đã được hủy thành công"
      });
      setIsCancelModalOpen(false);
      setOrderToCancel(null);
      
      // Update detail view if it's open
      if (selectedOrderDetail && selectedOrderDetail._id === orderToCancel) {
        setSelectedOrderDetail(updatedOrder);
      }
      
      fetchOrders();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể hủy đơn hàng"),
        variant: "destructive"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    handleCancelOrderPrompt(orderId);
  };

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    pending: { label: "Chờ xử lý", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    confirmed: { label: "Đã xác nhận", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    shipping: { label: "Đang giao", color: "bg-primary/10 text-primary border-primary/20", icon: Truck },
    delivered: { label: "Đã giao hàng", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
    completed: { label: "Hoàn tất", color: "bg-success text-success-foreground", icon: CheckCircle2 },
    cancelled: { label: "Đã hủy", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
    failed: { label: "Thanh toán lỗi", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
    delivery_failed: { label: "Giao thất bại", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle },
    returned: { label: "Trả hàng", color: "bg-destructive/10 text-destructive border-destructive/20", icon: History },
  };

  const handleRetryPayment = async (orderId: string) => {
    try {
      setLoading(true);
      const res = await orderApi.retryPayment(orderId);
      const paymentUrl = res.data?.paymentUrl || res.data?.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        throw new Error("Không lấy được liên kết thanh toán");
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể khởi tạo lại thanh toán"),
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (product: any, orderId: string) => {
    setSelectedProduct({ ...product, orderId });
    setReviewRating(5);
    setReviewComment("");
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedProduct || !reviewComment.trim()) return;
    try {
      setIsSubmittingReview(true);
      let variantInfo = "";
      if (selectedProduct.attributes && selectedProduct.attributes.length > 0) {
        variantInfo = selectedProduct.attributes
          .map((attr: any) => `${attr.key || attr.name}: ${attr.value || attr.val}`)
          .join(", ");
      } else if (selectedProduct.variantName) {
        variantInfo = selectedProduct.variantName;
      }
      
      await reviewApi.createReview({
        productId: selectedProduct.productId,
        sku: selectedProduct.sku,
        rating: reviewRating,
        comment: (variantInfo ? `[Biến thể: ${variantInfo}] ` : "") + reviewComment,
      });

      const userId = user?.id || "guest";
      const itemKey = `${selectedProduct.productId}-${selectedProduct.sku}`;
      const updatedReviewedItems = { ...reviewedItems, [itemKey]: reviewRating };
      setReviewedItems(updatedReviewedItems);
      localStorage.setItem(`reviewed_items_${userId}`, JSON.stringify(updatedReviewedItems));

      toast({ variant: "success", title: "Thành công", description: "Cảm ơn bạn đã đánh giá sản phẩm!" });
      setIsReviewModalOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Thông báo", description: getErrorMessage(error, "Không thể gửi đánh giá.") });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleConfirmReceived = async (orderId: string) => {
    setOrderToProcess(orderId);
    setIsConfirmReceivedModalOpen(true);
  };

  const handleConfirmReceivedAction = async () => {
    if (!orderToProcess) return;
    try {
      setIsProcessing(true);
      const res = await orderApi.confirmReceived(orderToProcess);
      const updatedOrder = res.data?.data || res.data;
      
      toast({
        variant: "success",
        title: "Thành công",
        description: "Xác nhận đã nhận hàng thành công!"
      });
      setIsConfirmReceivedModalOpen(false);
      setOrderToProcess(null);
      
      // Update detail view if it's open
      if (selectedOrderDetail && selectedOrderDetail._id === orderToProcess) {
        setSelectedOrderDetail(updatedOrder);
      }
      
      fetchOrders();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể xác nhận nhận hàng")
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReportNotReceived = async (orderId: string) => {
    setOrderToProcess(orderId);
    setIsNotReceivedModalOpen(true);
  };

  const handleReportNotReceivedAction = async () => {
    if (!orderToProcess) return;
    try {
      setIsProcessing(true);
      const res = await orderApi.reportNotReceived(orderToProcess);
      const updatedOrder = res.data?.data || res.data;

      toast({
        variant: "success",
        title: "Đã ghi nhận",
        description: "Chúng tôi đã ghi nhận báo cáo của bạn."
      });
      setIsNotReceivedModalOpen(false);
      setOrderToProcess(null);
      
      // Update detail view if it's open
      if (selectedOrderDetail && selectedOrderDetail._id === orderToProcess) {
        setSelectedOrderDetail(updatedOrder);
      }

      fetchOrders();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể gửi báo cáo")
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturnOrder = async (orderId: string) => {
    setOrderToProcess(orderId);
    setIsReturnModalOpen(true);
  };

  const handleReturnOrderAction = async () => {
    if (!orderToProcess) return;
    try {
      setIsProcessing(true);
      const res = await orderApi.returnOrder(orderToProcess);
      const updatedOrder = res.data?.data || res.data;

      toast({
        variant: "success",
        title: "Thành công",
        description: "Yêu cầu trả hàng đã được gửi đi."
      });
      setIsReturnModalOpen(false);
      setOrderToProcess(null);
      
      // Update detail view if it's open
      if (selectedOrderDetail && selectedOrderDetail._id === orderToProcess) {
        setSelectedOrderDetail(updatedOrder);
      }

      fetchOrders();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: getErrorMessage(error, "Không thể yêu cầu trả hàng")
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  if (authLoading || (isAuthenticated && isFirstLoad && loading)) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
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
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col gap-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 cursor-pointer group w-fit" onClick={() => router.push("/")}>
              <Button variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300 active:scale-95">
                  <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">Về trang chủ</span>
            </motion.div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-3xl lg:text-4xl font-bold">Đơn hàng của tôi</motion.h1>
                <motion.p initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-muted-foreground mt-2 text-lg">Theo dõi và quản lý lịch sử mua hàng của bạn</motion.p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto no-scrollbar">
            {[
              { label: "Tất cả", value: "" }, 
              { label: "Chờ xử lý", value: "pending,paid,confirmed" }, 
              { label: "Đang giao", value: "shipping,delivered" }, 
              { label: "Trả hàng", value: "delivery_failed,returned" },
              { label: "Hoàn tất", value: "completed" }, 
              { label: "Đã hủy", value: "cancelled" }
            ].map((tab, i) => (
              <motion.div key={tab.value} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Button variant={statusFilter === tab.value ? "default" : "outline"} size="sm" className="rounded-full px-6 whitespace-nowrap transition-all duration-300" onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}>{tab.label}</Button>
              </motion.div>
            ))}
          </div>

          <div className="relative min-h-[400px]">
            {loading && orders.length > 0 && (
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center pt-12 pb-12 pointer-events-none">
                    <div className="px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-2xl font-bold text-sm animate-bounce flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin" />Đang làm mới danh sách...
                    </div>
                </div>
            )}
            <div className={`space-y-6 transition-all duration-300 ${loading && orders.length > 0 ? 'opacity-40 grayscale-[0.5] scale-[0.99] pointer-events-none' : 'opacity-100'}`}>
              <AnimatePresence mode="wait">
              {orders.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-card rounded-3xl p-16 text-center shadow-sm border border-border/50">
                  <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6"><ShoppingBag className="h-12 w-12 text-primary/40" /></div>
                  <h3 className="text-2xl font-bold">Chưa có đơn hàng nào</h3>
                  <p className="text-muted-foreground mt-2 max-w-xs mx-auto">Bạn chưa có đơn hàng nào trong mục này. Bắt đầu mua sắm ngay thôi!</p>
                  <Button className="mt-8 rounded-full px-10 h-12 font-bold gradient-hero shadow-lg cursor-pointer" onClick={() => router.push("/products")}>Khám phá sản phẩm ngay</Button>
                </motion.div>
              ) : (
                orders.map((order, idx) => {
                  const status = statusMap[order.status as OrderStatus] || statusMap.pending;
                  const Icon = status.icon;
                  return (
                    <motion.div key={order._id} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: idx * 0.05 }}>
                      <Card className="rounded-3xl border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden bg-card/80 backdrop-blur-sm group border border-transparent hover:border-primary/20">
                        <div className="p-4 sm:px-5 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105 ${status.color.split(' ')[0]}`}><Icon className="h-5 w-5" /></div>
                            <div>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Mã đơn hàng</p>
                              <p className="font-mono font-bold text-base">#{order._id.substring(order._id.length - 8).toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="text-right hidden sm:block mr-2">
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ngày đặt</p>
                              <p className="text-xs font-bold">{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}</p>
                            </div>
                            <Badge className={`rounded-full px-4 py-1 border font-bold text-[10px] uppercase tracking-wider ${status.color}`}>{status.label}</Badge>
                          </div>
                        </div>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border/50">
                            {order.items.map((item: any, i: number) => {
                              return (
                                <div key={i} className="p-4 sm:px-5 flex gap-5">
                                  <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0 border border-border/50 relative block">
                                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground/20"><Package className="h-7 w-7" /></div>}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-start gap-3">
                                       <div className="block min-w-0 flex-1">
                                         <h4 className="font-bold text-base truncate">{item.name}</h4>
                                       </div>
                                       <p className="font-black text-base text-primary whitespace-nowrap">{formatPrice(item.price)}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                         <div className="flex flex-col gap-1">
                                             {renderAttributes(item) && (
                                                 <span className="text-[10px] font-bold text-primary/80">{renderAttributes(item)}</span>
                                             )}
                                             <div className="flex items-center gap-3">
                                                 <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">#{item.sku}</span>
                                                 <p className="text-xs font-bold text-muted-foreground">Số lượng: <span className="text-foreground">x{item.quantity}</span></p>
                                             </div>
                                         </div>
                                       {order.status === 'completed' && !reviewedItems[`${item.productId}-${item.sku}`] && (
                                           <Button variant="outline" size="sm" className="h-7 px-3 rounded-full border-primary/20 text-primary hover:bg-primary hover:text-white text-[9px] font-bold uppercase transition-all" onClick={() => handleOpenReviewModal(item, order._id)}><Star className="w-3 h-3 mr-1 fill-current" />Đánh giá</Button>
                                       )}
                                       {reviewedItems[`${item.productId}-${item.sku}`] && (
                                           <div className="flex items-center gap-1 bg-warning/5 px-2 py-0.5 rounded-full border border-warning/10">
                                               <Star className="w-2.5 h-2.5 fill-warning text-warning" />
                                               <span className="text-[9px] font-bold text-warning">{reviewedItems[`${item.productId}-${item.sku}`]}</span>
                                           </div>
                                       )}
                                    </div>
                                  </div>
                                </div>
                            );
                          })}
                        </div>
                        </CardContent>
                        <div className="p-4 sm:px-5 bg-secondary/5 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-card flex items-center justify-center border border-border/50 shadow-sm"><AlertCircle className="h-4 w-4 text-muted-foreground" /></div>
                            <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Thanh toán</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold leading-tight uppercase">{(order.paymentMethod || "cod")} {order.paymentStatus === 'paid' && <span className="text-success ml-1">● ĐÃ TRẢ</span>}</p>
                                  {(order.paymentMethod?.toLowerCase() === 'vnpay' && order.paymentStatus !== 'paid' && order.status !== 'cancelled' && order.status !== 'completed') && (
                                    <OrderCountdown 
                                      id={order._id}
                                      expiresAt={order.expiresAt} 
                                      createdAt={order.createdAt} 
                                      onExpire={handleOrderExpire} 
                                    />
                                  )}
                                </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-5 w-full sm:w-auto">
                            <div className="text-right">
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Toàn bộ</p>
                              <p className="text-xl font-black text-primary leading-tight">{formatPrice(order.totalAmount)}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white hover:border-primary font-bold px-4 h-9 text-xs transition-all duration-300 active:scale-95 flex items-center gap-2 cursor-pointer hover:shadow-md hover:shadow-primary/20" onClick={() => handleViewOrderDetail(order)}>
                                <Eye className="h-3.5 w-3.5" />Chi tiết
                              </Button>
                              {(order.paymentStatus === 'failed' || (order.paymentMethod?.toLowerCase() === 'vnpay' && order.paymentStatus !== 'paid' && order.status !== 'cancelled')) && order.status !== 'cancelled' && (
                                <Button 
                                  variant={isOrderExpired(order) ? "ghost" : "default"} 
                                  size="sm" 
                                  className={cn(
                                    "rounded-xl font-bold px-5 h-9 text-xs transition-all active:scale-95 shadow-md cursor-pointer",
                                    isOrderExpired(order) 
                                      ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-none shadow-none" 
                                      : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/10"
                                  )} 
                                  onClick={() => !isOrderExpired(order) && handleRetryPayment(order._id)}
                                  disabled={isOrderExpired(order)}
                                >
                                  {isOrderExpired(order) ? "Đơn hàng đã hết hạn" : "Thanh toán lại"}
                                </Button>
                              )}
                                {order.status === 'pending' && (
                                  <Button variant="outline" size="sm" className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold px-4 h-9 text-xs transition-all active:scale-95 cursor-pointer" onClick={() => handleCancelOrder(order._id)}>Hủy đơn</Button>
                                )}
                                {['shipping', 'delivered'].includes(order.status) && (
                                  <Button variant="default" size="sm" className="rounded-xl bg-success hover:bg-success/90 text-white font-bold px-4 h-9 text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5" onClick={() => handleConfirmReceived(order._id)}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Đã nhận hàng
                                  </Button>
                                )}
                                {order.status === 'delivered' && (
                                  <Button variant="outline" size="sm" className="rounded-xl border-warning/20 text-warning hover:bg-warning hover:text-white font-bold px-4 h-9 text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5" onClick={() => handleReportNotReceived(order._id)}>
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Chưa nhận hàng
                                  </Button>
                                )}
                                {['delivered', 'completed'].includes(order.status) && !isAnyItemReviewed(order) && (
                                  <Button variant="outline" size="sm" className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive hover:text-white font-bold px-4 h-9 text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5" onClick={() => handleReturnOrder(order._id)}>
                                    <History className="h-3.5 w-3.5" />
                                    Trả hàng
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

          {totalPages > 1 && (
            <div className="pt-8">
              <Pagination><PaginationContent>
                  <PaginationItem><PaginationPrevious href="#" onClick={(e: any) => { e.preventDefault(); if(currentPage > 1) setCurrentPage(currentPage - 1); }} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}><PaginationLink href="#" isActive={currentPage === i + 1} onClick={(e: any) => { e.preventDefault(); setCurrentPage(i + 1); }} className="cursor-pointer">{i + 1}</PaginationLink></PaginationItem>
                  ))}
                  <PaginationItem><PaginationNext href="#" onClick={(e: any) => { e.preventDefault(); if(currentPage < totalPages) setCurrentPage(currentPage + 1); }} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} /></PaginationItem>
              </PaginationContent></Pagination>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden border-none rounded-[2rem] bg-background/80 backdrop-blur-2xl shadow-2xl">
              <div className="flex flex-col h-[85vh] md:h-auto max-h-[90vh]">
                  <div className="relative h-28 bg-primary/5 dark:bg-primary/10 flex flex-col justify-center px-6 md:px-10 overflow-hidden">
                      <div className="absolute -top-4 -right-4 opacity-5"><ShoppingBag className="w-24 h-24 text-primary" /></div>
                      <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-1">
                              <Badge className="rounded-full px-3 py-0.5 text-[10px] font-black bg-primary text-primary-foreground border-none">#{selectedOrderDetail?._id?.substring(selectedOrderDetail._id.length - 8).toUpperCase() || 'ORDER'}</Badge>
                              {selectedOrderDetail && <Badge className={cn("rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider border-none", statusMap[selectedOrderDetail.status as OrderStatus]?.color || "")}>{statusMap[selectedOrderDetail.status as OrderStatus]?.label || ""}</Badge>}
                           </div>
                           <DialogHeader className="p-0 text-left sr-only"><DialogTitle>Chi tiết đơn hàng</DialogTitle><DialogDescription>Xem thông tin chi tiết về đơn hàng của bạn</DialogDescription></DialogHeader>
                           <h2 className="text-xl md:text-2xl font-black tracking-tight">Chi tiết đơn hàng</h2>
                           {selectedOrderDetail && <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5 opacity-70"><Calendar className="w-3 h-3" />{format(new Date(selectedOrderDetail.createdAt), "cccc, dd/MM/yyyy", { locale: vi })}</p>}
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 space-y-8 custom-scrollbar">
                      <div className="grid md:grid-cols-2 gap-5">
                          <div className="space-y-3">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60"><MapPin className="w-3 h-3" />Địa chỉ nhận hàng</div>
                              <Card className="rounded-2xl border-border/40 bg-card/50 p-4 space-y-2 shadow-sm border">
                                  <div className="flex items-center gap-3"><div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User className="w-3.5 h-3.5" /></div><p className="font-bold text-sm">{selectedOrderDetail?.shippingInfo?.receiverName || user?.fullName}</p></div>
                                  <div className="flex items-center gap-3 pl-10"><Smartphone className="w-3 w-3 text-muted-foreground" /><p className="text-xs font-medium">{selectedOrderDetail?.shippingInfo?.phone || (user as any)?.phone || "Chưa cập nhật"}</p></div>
                                  <div className="flex items-start gap-3 pl-10"><MapPin className="w-3 w-3 mt-0.5 text-muted-foreground" />
                                      <div className="text-xs font-medium leading-relaxed"><p>{selectedOrderDetail?.shippingInfo?.street}</p><p className="text-muted-foreground text-[10px] mt-0.5">{selectedOrderDetail?.shippingInfo?.ward}, {selectedOrderDetail?.shippingInfo?.district}, {selectedOrderDetail?.shippingInfo?.city}</p></div>
                                  </div>
                              </Card>
                          </div>
                          <div className="space-y-3">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60"><CreditCard className="w-3 h-3" />Phương thức thanh toán</div>
                              <Card className="rounded-2xl border-border/40 bg-card/50 p-4 flex flex-col justify-between shadow-sm border h-[130px]">
                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3 text-base font-black text-primary">{(selectedOrderDetail?.paymentMethod || 'cod').toUpperCase()}</div>
                                      <div className="flex items-center gap-2">
                                        {(selectedOrderDetail?.paymentMethod?.toLowerCase() === 'vnpay' && selectedOrderDetail?.paymentStatus !== 'paid' && selectedOrderDetail?.status !== 'cancelled' && selectedOrderDetail?.status !== 'completed') && (
                                          <OrderCountdown 
                                            id={selectedOrderDetail._id}
                                            expiresAt={selectedOrderDetail?.expiresAt} 
                                            createdAt={selectedOrderDetail?.createdAt} 
                                            onExpire={handleOrderExpire} 
                                          />
                                        )}
                                        {selectedOrderDetail?.paymentStatus === 'paid' ? <Badge className="bg-success text-success-foreground font-black px-2 py-0.5 rounded-full text-[9px] uppercase border-none shadow-sm shadow-success/10">Đã trả</Badge> : <Badge className="bg-warning/10 text-warning border-warning/20 font-black px-2 py-0.5 rounded-full text-[9px] uppercase">Chờ trả</Badge>}
                                      </div>
                                   </div>
                                   <div className="pt-3 border-t border-border/40 flex justify-between items-end"><div className="space-y-0.5"><p className="text-[9px] font-black text-muted-foreground uppercase">Tổng tiền</p><p className="text-xl font-black text-primary leading-tight">{formatPrice(selectedOrderDetail?.totalAmount || 0)}</p></div><CheckCircle className="w-6 h-6 text-success/20" /></div>
                              </Card>
                          </div>
                      </div>
                      <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60"><History className="w-3 h-3" />Hành trình</div>
                          <div className="bg-muted/30 rounded-2xl p-6 border border-border/20">
                              <div className="relative flex justify-between items-start max-w-xl mx-auto">
                                  <div className="absolute top-4 left-6 right-6 h-[1.5px] bg-border/40 z-0">
                                      <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ 
                                          width: selectedOrderDetail?.status === 'completed' ? '100%' : 
                                                 ['shipping', 'delivered'].includes(selectedOrderDetail?.status) ? '66.6%' : 
                                                 ['confirmed', 'paid'].includes(selectedOrderDetail?.status) ? '33.3%' : '0%' 
                                        }} 
                                        className="h-full bg-primary" 
                                      />
                                   </div>
                                   {[
                                     { key: 'pending', label: 'Đặt hàng', icon: Clock, stages: ['pending', 'confirmed', 'paid', 'shipping', 'delivered', 'completed'] }, 
                                     { key: 'confirmed', label: 'Xác nhận', icon: CheckCircle2, stages: ['confirmed', 'paid', 'shipping', 'delivered', 'completed'] }, 
                                     { key: 'shipping', label: 'Giao hàng', icon: Truck, stages: ['shipping', 'delivered', 'completed'] }, 
                                     { key: 'completed', label: 'Hoàn tất', icon: CheckCircle, stages: ['completed'] }
                                   ].map((stage) => {
                                       const isActive = stage.stages.includes(selectedOrderDetail?.status);
                                       return (
                                           <div key={stage.key} className="relative z-10 flex flex-col items-center gap-2">
                                               <div className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 shadow-sm", isActive ? "bg-primary border-primary text-primary-foreground scale-110 shadow-primary/10" : "bg-card border-border/40 text-muted-foreground")}><stage.icon className="w-4 h-4" /></div>
                                               <p className={cn("text-[9px] font-black uppercase tracking-wider", isActive ? "text-primary" : "text-muted-foreground")}>{stage.label}</p>
                                           </div>
                                       );
                                   })}
                              </div>
                          </div>
                      </div>
                      <div className="space-y-3">
                          <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60"><Package className="w-3 h-3" />Danh sách sản phẩm</div></div>
                          <div className="space-y-3">
                                {selectedOrderDetail?.items?.map((item: any, iIdx: number) => {
                                    return (
                                      <div key={iIdx} className="relative flex gap-4 p-3 rounded-xl bg-card border border-border/40">
                                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted border border-border/20 flex-shrink-0 block">
                                            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Package className="w-6 h-6" /></div>}
                                          </div>
                                          <div className="flex-1 min-w-0 py-0.5">
                                              <div className="flex justify-between items-start gap-3">
                                                <div className="block min-w-0 flex-1">
                                                  <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                                </div>
                                                <p className="font-black text-sm text-primary shrink-0">{formatPrice(item.price)}</p>
                                              </div>
                                           <div className="mt-1 flex flex-col gap-1 py-1">
                                               {renderAttributes(item) && (
                                                 <span className="text-[10px] font-black text-primary/70">{renderAttributes(item)}</span>
                                               )}
                                               <div className="flex items-center justify-between mt-0.5">
                                                  <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">#{item.sku}</span>
                                                  <p className="text-xs font-black text-muted-foreground">Số lượng: <span className="text-foreground">x{item.quantity}</span></p>
                                               </div>
                                             </div>
                                      </div>
                                  </div>
                                    );
                                  })}
                          </div>
                      </div>
                  </div>
                  <div className="px-6 md:px-10 py-5 bg-muted/5 border-t border-border/40 flex justify-end gap-3 flex-wrap">
                      <Button variant="ghost" className="rounded-xl font-bold h-10 px-6 text-xs transition-all duration-300 hover:bg-muted-foreground/10 hover:scale-105 active:scale-95 flex items-center gap-2 group border border-transparent hover:border-border/50" onClick={() => setIsDetailModalOpen(false)}>
                          <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-all group-hover:rotate-90" />
                          Đóng
                      </Button>
                      {selectedOrderDetail?.status === 'pending' && (
                        <Button variant="destructive" className="rounded-xl font-bold h-10 px-6 text-xs bg-destructive/5 text-destructive hover:bg-destructive hover:text-white border border-destructive/10 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-destructive/20" onClick={() => handleCancelOrder(selectedOrderDetail._id)}>
                          Hủy đơn hàng
                        </Button>
                      )}
                      {(selectedOrderDetail?.paymentStatus === 'failed' || (selectedOrderDetail?.paymentMethod?.toLowerCase() === 'vnpay' && selectedOrderDetail?.paymentStatus !== 'paid' && selectedOrderDetail?.status !== 'cancelled')) && selectedOrderDetail?.status !== 'cancelled' && (
                        <Button 
                          className={cn(
                            "rounded-xl font-bold h-10 px-6 text-xs transition-all duration-300 active:scale-95 shadow-md",
                            isOrderExpired(selectedOrderDetail)
                              ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-none shadow-none"
                              : "gradient-hero shadow-primary/10 hover:scale-105 hover:shadow-primary/20"
                          )} 
                          onClick={() => !isOrderExpired(selectedOrderDetail) && handleRetryPayment(selectedOrderDetail._id)}
                          disabled={isOrderExpired(selectedOrderDetail)}
                        >
                          {isOrderExpired(selectedOrderDetail) ? "Đơn hàng đã hết hạn" : "Thanh toán lại"}
                        </Button>
                      )}
                      {['shipping', 'delivered'].includes(selectedOrderDetail?.status) && (
                        <Button className="rounded-xl font-bold h-10 px-6 text-xs bg-success text-white hover:bg-success/90 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2" onClick={() => handleConfirmReceived(selectedOrderDetail._id)}>
                          <CheckCircle className="w-3.5 h-3.5" /> Đã nhận được hàng
                        </Button>
                      )}
                      {selectedOrderDetail?.status === 'delivered' && (
                        <Button variant="outline" className="rounded-xl font-bold h-10 px-6 text-xs border-warning/20 text-warning hover:bg-warning hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2" onClick={() => handleReportNotReceived(selectedOrderDetail._id)}>
                          <AlertTriangle className="w-3.5 h-3.5" /> Chưa nhận được hàng
                        </Button>
                      )}
                      {['delivered', 'completed'].includes(selectedOrderDetail?.status) && !isAnyItemReviewed(selectedOrderDetail) && (
                        <Button variant="outline" className="rounded-xl font-bold h-10 px-6 text-xs border-destructive/20 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2" onClick={() => handleReturnOrder(selectedOrderDetail._id)}>
                          <History className="w-3.5 h-3.5" /> Trả hàng
                        </Button>
                      )}
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden border-none shadow-2xl bg-[#0f172a] rounded-3xl group">
          <div className="flex flex-col md:flex-row h-full min-h-[550px]">
            <div className="md:w-[42%] relative overflow-hidden flex flex-col justify-between p-10 md:p-12 text-white border-r border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-primary to-blue-900 z-0"></div>
              <div className="relative z-10">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-16 h-1.5 bg-white/40 rounded-full mb-10"></motion.div>
                <DialogHeader className="p-0 text-left"><DialogTitle className="text-3xl md:text-4xl font-bold tracking-tight mb-3 drop-shadow-lg">Gửi <br /> Đánh Giá</DialogTitle><DialogDescription className="text-white/70 font-medium text-base leading-snug max-w-[220px]">Câu chuyện của bạn giúp chúng tôi hoàn thiện hơn.</DialogDescription></DialogHeader>
              </div>
              {selectedProduct && (
                <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10">
                  <div className="p-6 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl group/card transition-all duration-500">
                    <div className="flex flex-col gap-5">
                      <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden border-4 border-white/10 shadow-2xl bg-white"><img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" /></div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-white/60">Sản phẩm đang chọn</p>
                        <h4 className="font-semibold text-white text-lg md:text-xl leading-tight line-clamp-2">{selectedProduct.name}</h4>
                        {selectedProduct.sku && selectedProduct.sku !== 'DEFAULT' && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 border-white/20 text-white/90 bg-white/10 uppercase tracking-tighter">SKU: {selectedProduct.sku}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            <div className="flex-1 bg-background flex flex-col relative">
              <div className="flex-1 p-10 md:p-14 space-y-12">
                <div className="space-y-8">
                  <div className="flex items-center justify-between"><AnimatePresence mode="wait"><motion.h3 key={reviewRating} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{reviewRating === 5 ? "Hài lòng tuyệt vời! 😍" : reviewRating === 4 ? "Rất tốt! 😊" : reviewRating === 3 ? "Bình thường. 🙂" : reviewRating === 2 ? "Cần cải thiện. ☹️" : "Không hài lòng. 😡"}</motion.h3></AnimatePresence></div>
                  <div className="space-y-6">
                    <p className="text-sm font-medium text-muted-foreground text-center">Trải nghiệm của bạn (1 - 5 sao)</p>
                    <div className="flex justify-center gap-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button key={star} whileHover={{ scale: 1.25, y: -5 }} whileTap={{ scale: 0.9 }} onClick={() => setReviewRating(star)} className="group/star focus:outline-none relative">
                          <Star className={cn("w-12 h-12 transition-all duration-500", star <= reviewRating ? "fill-warning text-warning drop-shadow-[0_0_15px_rgba(234,179,8,0.7)] scale-110" : "text-muted/10 group-hover/star:text-warning/20")} />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center justify-between"><Label htmlFor="review" className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MessageSquare className="w-4 h-4" />Nhận xét của bạn</Label><span className="text-xs font-medium text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">{reviewComment.length} ký tự</span></div>
                  <div className="relative group/input"><textarea id="review" className="w-full min-h-[160px] p-6 rounded-2xl border-2 border-border/40 bg-secondary/5 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-base font-medium resize-none shadow-inner leading-relaxed placeholder:text-muted-foreground/30" placeholder="Chúng tôi luôn lắng nghe những chia sẻ thực tế từ bạn..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} /></div>
                </div>
              </div>
              <div className="p-10 md:px-14 md:pb-14 pt-0 flex items-center gap-6">
                <Button variant="ghost" className="rounded-xl h-12 px-8 font-medium hover:bg-secondary/50 transition-all text-muted-foreground hover:text-foreground" onClick={() => setIsReviewModalOpen(false)}>Để sau</Button>
                <Button className="flex-1 rounded-xl h-12 font-bold gradient-hero shadow-md transition-all active:scale-[0.98] disabled:opacity-30 group/btn relative overflow-hidden" onClick={handleSubmitReview} disabled={isSubmittingReview || !reviewComment.trim()}><span className="relative z-10 flex items-center gap-3 justify-center">{isSubmittingReview ? <><Loader2 className="w-5 h-5 animate-spin" />Đang xử lý</> : <>Xác nhận đánh giá<motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>→</motion.span></>}</span></Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Xác nhận hủy đơn</DialogTitle><DialogDescription>Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.</DialogDescription></DialogHeader>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold mb-2">Xác nhận hủy đơn</h3>
            <p className="text-muted-foreground text-sm mb-6">Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs" onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling}>Quay lại</Button>
              <Button variant="destructive" className="flex-1 h-10 rounded-xl font-bold text-xs shadow-lg shadow-destructive/20" onClick={handleConfirmCancel} disabled={isCancelling}>{isCancelling ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Đang xử lý</> : "Xác nhận hủy"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmReceivedModalOpen} onOpenChange={setIsConfirmReceivedModalOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Xác nhận nhận hàng</DialogTitle><DialogDescription>Bạn xác nhận đã nhận được đủ hàng và hài lòng với sản phẩm?</DialogDescription></DialogHeader>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold mb-2">Đã nhận được hàng?</h3>
            <p className="text-muted-foreground text-sm mb-6">Vui lòng chỉ xác nhận khi bạn đã thực sự nhận hàng và hài lòng.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs" onClick={() => setIsConfirmReceivedModalOpen(false)} disabled={isProcessing}>Hủy bỏ</Button>
              <Button variant="default" className="flex-1 h-10 rounded-xl font-bold text-xs bg-success hover:bg-success/90 text-white shadow-lg shadow-success/20" onClick={handleConfirmReceivedAction} disabled={isProcessing}>{isProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Đang xử lý</> : "Xác nhận đã nhận"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNotReceivedModalOpen} onOpenChange={setIsNotReceivedModalOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Báo cáo chưa nhận hàng</DialogTitle><DialogDescription>Bạn chắc chắn vẫn chưa nhận được hàng dù trạng thái báo đã giao?</DialogDescription></DialogHeader>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold mb-2">Chưa nhận hàng?</h3>
            <p className="text-muted-foreground text-sm mb-6">Hệ thống sẽ ghi nhận và kiểm tra lại với đơn vị vận chuyển. Bạn chắc chắn tiếp tục?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs" onClick={() => setIsNotReceivedModalOpen(false)} disabled={isProcessing}>Quay lại</Button>
              <Button variant="default" className="flex-1 h-10 rounded-xl font-bold text-xs bg-warning hover:bg-warning/90 text-white shadow-lg shadow-warning/20" onClick={handleReportNotReceivedAction} disabled={isProcessing}>{isProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Đang gửi</> : "Báo cáo"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="sr-only"><DialogTitle>Yêu cầu trả hàng</DialogTitle><DialogDescription>Bạn có nhu cầu muốn trả lại hàng cho shop?</DialogDescription></DialogHeader>
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4"><History className="w-8 h-8" /></div>
            <h3 className="text-xl font-bold mb-2">Yêu cầu trả hàng</h3>
            <p className="text-muted-foreground text-sm mb-6">Chúng tôi sẽ liên hệ sớm nhất để hỗ trợ quy trình trả hàng cho bạn.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-xs" onClick={() => setIsReturnModalOpen(false)} disabled={isProcessing}>Hủy bỏ</Button>
              <Button variant="destructive" className="flex-1 h-10 rounded-xl font-bold text-xs shadow-lg shadow-destructive/20" onClick={handleReturnOrderAction} disabled={isProcessing}>{isProcessing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Đang xử lý</> : "Xác nhận trả"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}

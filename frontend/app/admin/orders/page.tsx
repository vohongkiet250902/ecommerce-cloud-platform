"use client";

import { useEffect, useState } from "react";
import { 
  Eye, MoreHorizontal, Download, RefreshCw, Loader2, User, Mail, 
  Phone, Calendar, MapPin, CreditCard, Package, TrendingUp, 
  FileSpreadsheet, Printer, History, Clock, ArrowUpRight, ChevronDown,
  Filter, Search, ShieldCheck, Truck, CheckCircle2, Trash2, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { orderApi, usersApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

/* ===================== TYPES ===================== */
interface Order {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    name?: string;
    email: string;
    phone?: string;
  };
  items: any[];
  totalAmount: number;
  status: "pending" | "paid" | "shipping" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  paymentMethod?: string;
  createdAt: string;
}

/* ===================== CONFIG ===================== */
const statusConfig = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  paid: {
    label: "Đã xác nhận",
    className: "bg-info/10 text-info border-info/20",
  },
  shipping: {
    label: "Đang giao",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-success/10 text-success border-success/20",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const paymentStatusConfig = {
  pending: { label: "Chưa thanh toán", className: "bg-muted text-muted-foreground" },
  paid: { label: "Đã thanh toán", className: "bg-success/10 text-success" },
  refunded: { label: "Hoàn tiền", className: "bg-warning/10 text-warning" },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

/* ===================== PAGE ===================== */
export default function OrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(30);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" });

  // Calculation for Revenue: Only count PAID orders that are NOT CANCELLED
  const totalRevenue = allOrders
    .filter(o => o.paymentStatus === "paid" && o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const exportToCSV = () => {
    const headers = ["Mã đơn", "Khách hàng", "Email", "Tổng tiền", "Thanh toán", "Trạng thái", "Ngày đặt"];
    const csvContent = [
      headers.join(","),
      ...allOrders.map(o => [
        `#${o._id.slice(-6).toUpperCase()}`,
        o.userId?.fullName || o.userId?.name || "Khách",
        o.userId?.email || "N/A",
        o.totalAmount,
        o.paymentStatus,
        o.status,
        new Date(o.createdAt).toLocaleDateString("vi-VN")
      ].join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `orders_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredOrdersByDate = orders.filter(o => {
    if (!dateRange.start && !dateRange.end) return true;
    const orderDate = new Date(o.createdAt).getTime();
    const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
    const end = dateRange.end ? new Date(dateRange.end).getTime() + 86400000 : Infinity; // +1 day for inclusive end date
    return orderDate >= start && orderDate <= end;
  });

  const fetchAllOrders = async () => {
    try {
      const res = await orderApi.getOrders({ limit: 1000 });
      const ordersData = res.data.data;
      
      // Fetch user details for each order to get fullName
      const ordersWithUsers = await Promise.all(
        ordersData.map(async (order: any) => {
          // If userId is already an object (populated by BE)
          if (order.userId && typeof order.userId === 'object') {
            if (order.userId.fullName || order.userId.name) {
              return order;
            }
            // If it's an object but missing name (BE populated wrong fields), fetch it
            try {
              const uid = order.userId._id || order.userId;
              if (typeof uid === 'string') {
                const userRes = await usersApi.getUser(uid);
                return { ...order, userId: userRes.data };
              }
            } catch (e) {
              return order;
            }
          }
          // If userId is just an ID string, fetch the user details
          if (typeof order.userId === 'string') {
            try {
              const userRes = await usersApi.getUser(order.userId);
              return { ...order, userId: userRes.data };
            } catch (e) {
              return order;
            }
          }
          return order;
        })
      );
      
      setAllOrders(ordersWithUsers);
    } catch (error) {
      console.error("Error fetching all orders for stats", error);
    }
  };

  const fetchOrders = async (currentPage = 1, status = "all") => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit };
      if (status !== "all") params.status = status;
      const res = await orderApi.getOrders(params);
      const ordersData = res.data.data;

      // Fetch user details for each order to get fullName
      const ordersWithUsers = await Promise.all(
        ordersData.map(async (order: any) => {
          // If userId is already an object (populated by BE)
          if (order.userId && typeof order.userId === 'object') {
            if (order.userId.fullName || order.userId.name) {
              return order;
            }
            // If it's an object but missing name (BE populated wrong fields), fetch it
            try {
              const uid = order.userId._id || order.userId;
              if (typeof uid === 'string') {
                const userRes = await usersApi.getUser(uid);
                return { ...order, userId: userRes.data };
              }
            } catch (e) {
              return order;
            }
          }
          // If userId is just an ID string, fetch the user details
          if (typeof order.userId === 'string') {
            try {
              const userRes = await usersApi.getUser(order.userId);
              return { ...order, userId: userRes.data };
            } catch (e) {
              return order;
            }
          }
          return order;
        })
      );

      setOrders(ordersWithUsers);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.response?.data?.message || error.message || "Không thể lấy danh sách đơn hàng";
      toast({
        title: "Lỗi tải đơn hàng",
        description: typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
    fetchOrders(1, statusFilter);
  }, [statusFilter]);

  const handleUpdateStatus = async (id: string, data: { status?: string; paymentStatus?: string }) => {
    try {
      await orderApi.updateStatus(id, data);
      toast({ title: "Cập nhật thành công", variant: "success" });
      fetchOrders(page, statusFilter);
      fetchAllOrders(); // Refresh stats dashboard immediately
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Lỗi cập nhật";
      toast({ 
        title: "Lỗi cập nhật", 
        description: typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage,
        variant: "destructive" 
      });
    }
  };

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const handleCancelOrder = (id: string) => {
    setOrderToCancel(id);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!orderToCancel) return;
    
    try {
      setCancelling(true);
      await handleUpdateStatus(orderToCancel, { status: 'cancelled' });
      setCancelDialogOpen(false);
      setOrderToCancel(null);
    } catch {
      toast({ title: "Lỗi khi hủy đơn hàng", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const columns = [
    {
      key: "_id",
      header: "Mã đơn",
      render: (order: Order) => (
        <span className="font-mono font-medium text-xs hidden sm:inline-block">
            {order._id.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      key: "userId",
      header: "Khách hàng",
      render: (order: any) => {
        const user = order.userId;
        return (
          <div>
            <p className="font-medium text-sm">{user?.fullName || user?.name || "Khách vãng lai"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        );
      },
    },
    {
      key: "items",
      header: "Sản phẩm",
      render: (order: Order) => <span>{order.items?.length || 0}</span>,
    },
    {
      key: "totalAmount",
      header: "Tổng tiền",
      render: (order: Order) => (
        <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
      ),
    },
    {
      key: "paymentStatus",
      header: "Trạng thái thanh toán",
      render: (order: Order) => {
        const cfg = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.pending;
        return (
          <Badge
            variant="secondary"
            className={cn("font-medium text-xs", cfg.className)}
          >
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái giao hàng",
      render: (order: Order) => {
        const cfg = statusConfig[order.status] || statusConfig.pending;
        return (
          <Badge variant="outline" className={cn("font-medium", cfg.className)}>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Ngày đặt",
      render: (order: Order) => (
        <span className="text-muted-foreground text-sm">
            {new Date(order.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (order: Order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-content">
            <DropdownMenuItem onClick={() => handleViewDetail(order)}>
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Cập nhật đơn hàng
            </div>

            <DropdownMenuItem 
                disabled={order.status !== "pending"}
                onClick={() => handleUpdateStatus(order._id, { status: 'paid' })}
            >
              <ShieldCheck className="mr-2 h-4 w-4 text-info" />
              Xác nhận đơn hàng
            </DropdownMenuItem>

            <DropdownMenuItem 
                disabled={order.status !== "paid"}
                onClick={() => handleUpdateStatus(order._id, { status: 'shipping' })}
            >
              <Truck className="mr-2 h-4 w-4 text-primary" />
              Bắt đầu giao hàng
            </DropdownMenuItem>

            <DropdownMenuItem 
                disabled={order.paymentStatus === "paid" || order.status === "pending" || order.status === "cancelled"}
                onClick={() => handleUpdateStatus(order._id, { paymentStatus: 'paid' })}
            >
              <CreditCard className="mr-2 h-4 w-4 text-success" />
              Xác nhận thanh toán
            </DropdownMenuItem>
            
            <DropdownMenuItem 
                disabled={order.status !== "shipping"}
                onClick={() => handleUpdateStatus(order._id, { status: 'completed', paymentStatus: 'paid' })}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
              Hoàn thành đơn hàng
            </DropdownMenuItem>

            <DropdownMenuItem 
                disabled={order.status !== "cancelled" || order.paymentStatus !== "paid"}
                onClick={() => handleUpdateStatus(order._id, { paymentStatus: 'refunded' })}
            >
              <RefreshCw className="mr-2 h-4 w-4 text-warning" />
              Hoàn trả tiền (Refund)
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={order.status === "cancelled" || order.status === "completed"}
              onClick={() => handleCancelOrder(order._id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hủy đơn hàng
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đơn hàng</h1>
          <p className="text-muted-foreground">
            Quản lý và xử lý đơn hàng từ khách hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            className="border-dashed bg-background/50 border-border/40 hidden sm:flex"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            Xuất Excel
          </Button>
          <Button variant="outline" onClick={() => fetchOrders(page, statusFilter)} className="border-dashed bg-background/50 border-border/40">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="space-y-4">
        {/* Top Row: Financials & Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-5 border border-border shadow-md relative overflow-hidden group md:col-span-2">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Doanh thu tổng hợp</p>
            <div className="mt-2 text-3xl font-black text-primary">
              {formatPrice(totalRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-success font-medium">
               <ArrowUpRight className="h-3.5 w-3.5" />
               <span>Tổng tiền quyết toán thực tế</span>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border shadow-sm flex flex-col justify-center">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Tổng đơn hàng</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-foreground">{allOrders.length}</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Status Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:border-primary/20 transition-colors">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Chờ xử lý</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-orange-600">
                  {allOrders.filter((o) => o.status === "pending").length}
              </span>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:border-primary/20 transition-colors">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Đã xác nhận</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-cyan-600">
                  {allOrders.filter((o) => o.status === "paid").length}
              </span>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:border-primary/20 transition-colors">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Đang giao</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-blue-600">
                   {allOrders.filter((o) => o.status === "shipping").length}
              </span>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:border-primary/20 transition-colors">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Hoàn thành</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-green-600">
                  {allOrders.filter((o) => o.status === "completed").length}
              </span>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm hover:border-primary/20 transition-colors">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Đã hủy</p>
             <div className="flex items-baseline gap-2 mt-2">
               <span className="text-2xl font-bold text-destructive">
                  {allOrders.filter((o) => o.status === "cancelled").length}
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Area with Loading state */}
      <div className="relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-xl">
             <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Đang tải dữ liệu...</p>
             </div>
          </div>
        )}
        <DataTable
          data={filteredOrdersByDate}
          columns={columns}
          searchPlaceholder="Tìm kiếm mã đơn hoặc khách hàng..."
          pageSize={10}
          filterNode={
            <div className="flex flex-wrap items-center gap-2">
               {/* Date Filter */}
               <div className="flex items-center gap-1 bg-background/50 border border-border/40 rounded-lg px-2 h-10 border-dashed">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                  <input 
                    type="date" 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-transparent text-xs outline-none focus:ring-0 w-[105px]"
                  />
                  <span className="text-muted-foreground mx-1">-</span>
                  <input 
                    type="date" 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent text-xs outline-none focus:ring-0 w-[105px]"
                  />
                  {(dateRange.start || dateRange.end) && (
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      className="h-6 w-6 ml-1 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDateRange({ start: "", end: "" })}
                    >
                      ×
                    </Button>
                  )}
               </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 bg-background/50 border-border/40">
                    <Filter className="h-4 w-4" />
                    <span>
                      {statusFilter === "all" ? "Tất cả trạng thái" : 
                       statusConfig[statusFilter as keyof typeof statusConfig]?.label || statusFilter}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dropdown-content">
                  <DropdownMenuItem onClick={() => { setStatusFilter("all"); setPage(1); }}>
                    Tất cả trạng thái
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <DropdownMenuItem key={key} onClick={() => { setStatusFilter(key); setPage(1); }}>
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      </div>

      {/* Order Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="flex flex-col max-h-[90vh]">
              {/* Modal Header with Gradient */}
              <div className="bg-primary/5 px-6 py-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        Đơn hàng
                      </span>
                      <h2 className="text-xl font-black tracking-tight">
                        #{selectedOrder._id.substring(selectedOrder._id.length - 8).toUpperCase()}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(selectedOrder.createdAt).toLocaleDateString("vi-VN", {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("px-4 py-1.5 text-sm font-bold rounded-full", statusConfig[selectedOrder.status]?.className)}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
                </div>
              </div>

              <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* 2-Column Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Info Card */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest text-muted-foreground">
                      <User className="h-4 w-4" />
                      Thông tin khách hàng
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-5 border border-border/40 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border/50 shadow-sm font-black text-primary">
                          {(selectedOrder.userId?.fullName || selectedOrder.userId?.name || "K")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-base leading-none mb-1">
                            {selectedOrder.userId?.fullName || selectedOrder.userId?.name || "Khách vãng lai"}
                          </p>
                          <p className="text-xs text-muted-foreground">ID: {selectedOrder.userId?._id?.slice(-8).toUpperCase() || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="grid gap-2 pt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium truncate">{selectedOrder.userId?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">SĐT:</span>
                          <span className="font-medium">{selectedOrder.userId?.phone || 'Chưa cập nhật'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info Card */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      Chi tiết thanh toán
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-5 border border-border/40 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Phương thức:</span>
                        <Badge variant="secondary" className="font-bold uppercase tracking-tighter">
                          {selectedOrder.paymentMethod || 'COD'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Trạng thái thanh toán:</span>
                        <Badge variant="outline" className={cn("font-bold text-[10px]", paymentStatusConfig[selectedOrder.paymentStatus]?.className)}>
                          {paymentStatusConfig[selectedOrder.paymentStatus]?.label.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="h-[1px] bg-border/40" />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-bold">Tổng quyết toán:</span>
                        <span className="text-lg font-black text-primary tracking-tighter">
                          {formatPrice(selectedOrder.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Timeline (New) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest text-muted-foreground">
                    <History className="h-4 w-4" />
                    Hành trình đơn hàng
                  </div>
                  <div className="bg-muted/20 rounded-2xl p-6 border border-border/30">
                    <div className="relative space-y-6">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border/50" />
                      
                      {/* Created */}
                      <div className="relative pl-8">
                        <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          <Clock className="h-3 w-3 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Đơn hàng được khởi tạo</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(selectedOrder.createdAt).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      </div>

                      {/* Payment */}
                      {selectedOrder.paymentStatus === "paid" && (
                        <div className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-background border-2 border-success flex items-center justify-center">
                            <CreditCard className="h-3 w-3 text-success" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-success">Đã hoàn tất thanh toán</p>
                            <p className="text-xs text-muted-foreground">Khách hàng đã thanh toán qua {selectedOrder.paymentMethod || 'COD'}</p>
                          </div>
                        </div>
                      )}

                      {/* Shipping */}
                      {(selectedOrder.status === "shipping" || selectedOrder.status === "completed") && (
                        <div className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-background border-2 border-blue-500 flex items-center justify-center">
                            <Package className="h-3 w-3 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-blue-500">Đang thực hiện giao hàng</p>
                            <p className="text-xs text-muted-foreground">Kiện hàng đã rời kho...</p>
                          </div>
                        </div>
                      )}

                      {/* Completed */}
                      {selectedOrder.status === "completed" && (
                        <div className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-success border-2 border-success flex items-center justify-center">
                             <TrendingUp className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-success">Giao hàng thành công</p>
                            <p className="text-xs text-muted-foreground">Khách hàng đã nhận được hàng và hoàn tất.</p>
                          </div>
                        </div>
                      )}

                       {/* Cancelled */}
                       {selectedOrder.status === "cancelled" && (
                        <div className="relative pl-8">
                          <div className="absolute left-0 top-1 h-6 w-6 rounded-full bg-destructive border-2 border-destructive flex items-center justify-center">
                             <MoreHorizontal className="h-3 w-3 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-destructive">Đơn hàng đã bị hủy</p>
                            <p className="text-xs text-muted-foreground">Đơn hàng không được tiếp tục xử lý.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product List */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest text-muted-foreground">
                      <Package className="h-4 w-4" />
                      Sản phẩm ({selectedOrder.items.length})
                    </div>
                  </div>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="group relative bg-muted/20 hover:bg-muted/40 transition-all duration-300 rounded-2xl p-4 border border-border/30 overflow-hidden">
                        <div className="flex gap-4 relative z-10">
                          {/* Item Image Snapshot if available */}
                          <div className="w-16 h-16 rounded-xl bg-background border border-border/50 overflow-hidden flex-shrink-0 relative shadow-sm">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                                <Package className="h-6 w-6 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-sm truncate pr-4">{item.name}</h5>
                              <p className="font-black text-sm text-primary flex-shrink-0">{formatPrice(item.price)}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-background border border-border/50 px-2 py-0.5 rounded font-mono font-medium text-muted-foreground">
                                  SKU: {item.sku}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  Số lượng: <span className="font-bold">x{item.quantity}</span>
                                </span>
                              </div>
                              <p className="text-xs font-bold text-muted-foreground">
                                Thành tiền: <span className="text-foreground">{formatPrice(item.price * item.quantity)}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="bg-muted/30 p-4 border-t border-border/50 flex items-center justify-between gap-3">
                <Button 
                  variant="outline" 
                  onClick={handlePrint}
                  className="rounded-xl font-bold bg-background/50"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  In hóa đơn
                </Button>
                <Button variant="ghost" onClick={() => setDetailModalOpen(false)} className="rounded-xl font-bold">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Xác nhận hủy đơn hàng</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/40">
              Bạn có chắc chắn muốn hủy đơn hàng này không? 
              <br />
              <span className="text-xs mt-2 block font-medium text-destructive/80 italic">
                * Hành động này sẽ thay đổi trạng thái đơn hàng thành "Đã hủy" và không thể hoàn tác.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="rounded-xl font-semibold border-border/60">
                Quay lại
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                className="rounded-xl font-bold gap-2 px-6"
                onClick={handleCancelConfirm}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Xác nhận hủy
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

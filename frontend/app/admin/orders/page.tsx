"use client";

import { useEffect, useState } from "react";
import { Eye, MoreHorizontal, Download, RefreshCw, Loader2 } from "lucide-react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { orderApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

/* ===================== TYPES ===================== */
interface Order {
  _id: string;
  userId: {
    name: string;
    email: string;
    phone?: string;
  };
  items: any[];
  totalAmount: number;
  status: "pending" | "paid" | "shipping" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  createdAt: string;
}

/* ===================== CONFIG ===================== */
const statusConfig = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  paid: {
    label: "Đã thanh toán",
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
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderApi.getOrders();
      setOrders(res.data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi tải đơn hàng",
        description: "Không thể lấy danh sách đơn hàng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id: string, data: { status?: string; paymentStatus?: string }) => {
    try {
      await orderApi.updateStatus(id, data);
      toast({ title: "Cập nhật thành công", variant: "success" });
      fetchOrders();
    } catch (error) {
      toast({ title: "Lỗi cập nhật", variant: "destructive" });
    }
  };

  const handleCancelOrder = async (id: string) => {
    try {
        if (!confirm("Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này sẽ hoàn lại tồn kho.")) return;
       await orderApi.cancelOrder(id);
       toast({ title: "Đã hủy đơn hàng", variant: "success" });
       fetchOrders();
    } catch (error: any) {
        toast({ 
            title: "Lỗi hủy đơn", 
            description: error?.response?.data?.message || "Không thể hủy đơn hàng",
            variant: "destructive" 
        });
    }
  }

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
      render: (order: Order) => (
        <div>
          <p className="font-medium text-sm">{order.userId?.name || "Khách vãng lai"}</p>
          <p className="text-xs text-muted-foreground">{order.userId?.email}</p>
        </div>
      ),
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
      header: "Thanh toán",
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
      header: "Trạng thái",
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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-content">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
                disabled={order.status === "cancelled" || order.paymentStatus === "paid"}
                onClick={() => handleUpdateStatus(order._id, { paymentStatus: 'paid' })}
            >
              Đánh dấu: Đã thanh toán
            </DropdownMenuItem>
            <DropdownMenuItem 
                disabled={order.status === "cancelled" || order.status === "shipping"}
                onClick={() => handleUpdateStatus(order._id, { status: 'shipping' })}
            >
              Đánh dấu: Đang giao
            </DropdownMenuItem>
             <DropdownMenuItem 
                disabled={order.status === "cancelled" || order.status === "completed"}
                onClick={() => handleUpdateStatus(order._id, { status: 'completed', paymentStatus: 'paid' })}
            >
              Đánh dấu: Hoàn thành
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={order.status === "cancelled" || order.status === "completed"}
              onClick={() => handleCancelOrder(order._id)}
            >
              Hủy đơn hàng
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (loading) {
      return (
          <div className="h-[80vh] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

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
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tổng đơn</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-foreground">{orders.length}</span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Chờ xử lý</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-orange-600">
                {orders.filter((o) => o.status === "pending").length}
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Đang giao</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-blue-600">
                 {orders.filter((o) => o.status === "shipping").length}
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Hoàn thành</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === "completed").length}
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Đã hủy</p>
          <div className="flex items-baseline gap-2 mt-2">
             <span className="text-2xl font-bold text-destructive">
                {orders.filter((o) => o.status === "cancelled").length}
             </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent className="dropdown-content">
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="paid">Đã thanh toán (Chờ giao)</SelectItem>
            <SelectItem value="shipping">Đang giao</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Thanh toán" />
          </SelectTrigger>
          <SelectContent className="dropdown-content">
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Chưa thanh toán</SelectItem>
            <SelectItem value="paid">Đã thanh toán</SelectItem>
            <SelectItem value="refunded">Hoàn tiền</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={orders}
        columns={columns}
        searchPlaceholder="Tìm kiếm mã đơn hoặc khách hàng..."
        searchKey="_id"
      />
    </div>
  );
}

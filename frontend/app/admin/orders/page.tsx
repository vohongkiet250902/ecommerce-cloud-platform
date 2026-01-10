"use client";

import { Eye, MoreHorizontal, Download, RefreshCw } from "lucide-react";

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

/* ===================== TYPES ===================== */
interface Order {
  id: string;
  customer: string;
  email: string;
  phone: string;
  items: number;
  total: number;
  status: "pending" | "paid" | "shipping" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  date: string;
}

/* ===================== MOCK DATA ===================== */
const orders: Order[] = [
  {
    id: "ORD-12345",
    customer: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    phone: "0901234567",
    items: 3,
    total: 45990000,
    status: "completed",
    paymentStatus: "paid",
    date: "2024-01-15 14:30",
  },
  {
    id: "ORD-12344",
    customer: "Trần Thị B",
    email: "tranthib@email.com",
    phone: "0912345678",
    items: 1,
    total: 32990000,
    status: "shipping",
    paymentStatus: "paid",
    date: "2024-01-15 12:15",
  },
  {
    id: "ORD-12343",
    customer: "Lê Văn C",
    email: "levanc@email.com",
    phone: "0923456789",
    items: 2,
    total: 15990000,
    status: "paid",
    paymentStatus: "paid",
    date: "2024-01-15 10:45",
  },
  {
    id: "ORD-12342",
    customer: "Phạm Thị D",
    email: "phamthid@email.com",
    phone: "0934567890",
    items: 5,
    total: 89990000,
    status: "pending",
    paymentStatus: "pending",
    date: "2024-01-14 16:20",
  },
  {
    id: "ORD-12341",
    customer: "Hoàng Văn E",
    email: "hoangvane@email.com",
    phone: "0945678901",
    items: 1,
    total: 6990000,
    status: "cancelled",
    paymentStatus: "refunded",
    date: "2024-01-14 09:30",
  },
  {
    id: "ORD-12340",
    customer: "Vũ Thị F",
    email: "vuthif@email.com",
    phone: "0956789012",
    items: 2,
    total: 22990000,
    status: "completed",
    paymentStatus: "paid",
    date: "2024-01-13 18:45",
  },
  {
    id: "ORD-12339",
    customer: "Đặng Văn G",
    email: "dangvang@email.com",
    phone: "0967890123",
    items: 4,
    total: 67990000,
    status: "shipping",
    paymentStatus: "paid",
    date: "2024-01-13 11:20",
  },
  {
    id: "ORD-12338",
    customer: "Bùi Thị H",
    email: "buithih@email.com",
    phone: "0978901234",
    items: 1,
    total: 8990000,
    status: "paid",
    paymentStatus: "paid",
    date: "2024-01-12 15:00",
  },
];

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
  const columns = [
    {
      key: "id",
      header: "Mã đơn",
      render: (order: Order) => (
        <span className="font-mono font-medium">{order.id}</span>
      ),
    },
    {
      key: "customer",
      header: "Khách hàng",
      render: (order: Order) => (
        <div>
          <p className="font-medium">{order.customer}</p>
          <p className="text-sm text-muted-foreground">{order.phone}</p>
        </div>
      ),
    },
    {
      key: "items",
      header: "SP",
      render: (order: Order) => <span>{order.items}</span>,
    },
    {
      key: "total",
      header: "Tổng tiền",
      render: (order: Order) => (
        <span className="font-semibold">{formatPrice(order.total)}</span>
      ),
    },
    {
      key: "paymentStatus",
      header: "Thanh toán",
      render: (order: Order) => {
        const cfg = paymentStatusConfig[order.paymentStatus];
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
        const cfg = statusConfig[order.status];
        return (
          <Badge variant="outline" className={cn("font-medium", cfg.className)}>
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: "date",
      header: "Ngày đặt",
      render: (order: Order) => (
        <span className="text-muted-foreground">{order.date}</span>
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
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={order.status === "cancelled"}>
              Đánh dấu: Đã thanh toán
            </DropdownMenuItem>
            <DropdownMenuItem disabled={order.status === "cancelled"}>
              Đánh dấu: Đang giao
            </DropdownMenuItem>
            <DropdownMenuItem disabled={order.status === "cancelled"}>
              Đánh dấu: Hoàn thành
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              disabled={order.status === "completed"}
            >
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
            Quản lý và xử lý đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng đơn</p>
          <p className="text-2xl font-bold text-foreground">{orders.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Chờ xử lý</p>
          <p className="text-2xl font-bold text-warning">
            {orders.filter((o) => o.status === "pending").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Đang giao</p>
          <p className="text-2xl font-bold text-primary">
            {orders.filter((o) => o.status === "shipping").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Hoàn thành</p>
          <p className="text-2xl font-bold text-success">
            {orders.filter((o) => o.status === "completed").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Đã hủy</p>
          <p className="text-2xl font-bold text-destructive">
            {orders.filter((o) => o.status === "cancelled").length}
          </p>
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
            <SelectItem value="paid">Đã thanh toán</SelectItem>
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
      <DataTable<Order>
        data={orders}
        columns={columns}
        searchPlaceholder="Tìm kiếm đơn hàng..."
        searchKey="id"
      />
    </div>
  );
}

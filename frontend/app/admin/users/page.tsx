"use client";

import {
  Plus,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Eye,
  Ban,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ===================== TYPES ===================== */
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: "user" | "staff" | "admin";
  status: "active" | "blocked";
  orders: number;
  totalSpent: number;
  createdAt: string;
}

/* ===================== MOCK DATA ===================== */
const users: User[] = [
  {
    id: "USR001",
    name: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    phone: "0901234567",
    role: "user",
    status: "active",
    orders: 15,
    totalSpent: 125990000,
    createdAt: "2023-06-15",
  },
  {
    id: "USR002",
    name: "Trần Thị B",
    email: "tranthib@email.com",
    phone: "0912345678",
    role: "staff",
    status: "active",
    orders: 0,
    totalSpent: 0,
    createdAt: "2023-08-20",
  },
  {
    id: "USR003",
    name: "Lê Văn C",
    email: "levanc@email.com",
    phone: "0923456789",
    role: "user",
    status: "blocked",
    orders: 3,
    totalSpent: 15990000,
    createdAt: "2023-09-10",
  },
  {
    id: "USR004",
    name: "Phạm Thị D",
    email: "phamthid@email.com",
    phone: "0934567890",
    role: "admin",
    status: "active",
    orders: 0,
    totalSpent: 0,
    createdAt: "2023-01-05",
  },
  {
    id: "USR005",
    name: "Hoàng Văn E",
    email: "hoangvane@email.com",
    phone: "0945678901",
    role: "user",
    status: "active",
    orders: 8,
    totalSpent: 67990000,
    createdAt: "2023-11-22",
  },
  {
    id: "USR006",
    name: "Vũ Thị F",
    email: "vuthif@email.com",
    phone: "0956789012",
    role: "user",
    status: "blocked",
    orders: 22,
    totalSpent: 234990000,
    createdAt: "2022-12-10",
  },
];

/* ===================== CONFIG ===================== */
const roleConfig = {
  user: { label: "User", className: "bg-secondary text-secondary-foreground" },
  staff: { label: "Staff", className: "bg-info/10 text-info border-info/20" },
  admin: {
    label: "Admin",
    className: "bg-primary/10 text-primary border-primary/20",
  },
};

const statusConfig = {
  active: {
    label: "Hoạt động",
    className: "bg-success/10 text-success border-success/20",
  },
  blocked: {
    label: "Bị khóa",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

/* ===================== PAGE ===================== */
export default function UsersPage() {
  const columns = [
    {
      key: "name",
      header: "Người dùng",
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
            />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Điện thoại",
      render: (user: User) => <span>{user.phone}</span>,
    },
    {
      key: "role",
      header: "Vai trò",
      render: (user: User) => {
        const config = roleConfig[user.role];
        return (
          <Badge
            variant="outline"
            className={cn("font-medium border-border", config.className)}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "orders",
      header: "Đơn hàng",
      render: (user: User) => <span>{user.orders}</span>,
    },
    {
      key: "totalSpent",
      header: "Tổng chi tiêu",
      render: (user: User) => (
        <span className="font-medium">
          {user.totalSpent > 0 ? formatPrice(user.totalSpent) : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (user: User) => {
        const config = statusConfig[user.status];
        return (
          <Badge
            variant="outline"
            className={cn("font-medium border-border", config.className)}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      render: (user: User) => (
        <span className="text-muted-foreground">{user.createdAt}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (user: User) => (
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
            {user.role === "user" && (
              <DropdownMenuItem>
                <Shield className="mr-2 h-4 w-4" />
                Nâng cấp Staff
              </DropdownMenuItem>
            )}
            {user.role === "staff" && (
              <DropdownMenuItem>
                <ShieldOff className="mr-2 h-4 w-4" />
                Hạ xuống User
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {user.status === "active" ? (
              <DropdownMenuItem className="text-destructive">
                <Ban className="mr-2 h-4 w-4" />
                Khóa tài khoản
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="text-success">
                <CheckCircle className="mr-2 h-4 w-4" />
                Mở khóa
              </DropdownMenuItem>
            )}
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
          <h1 className="text-2xl font-bold text-foreground">Người dùng</h1>
          <p className="text-muted-foreground">Quản lý tài khoản người dùng</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Thêm người dùng
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng người dùng</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Hoạt động</p>
          <p className="text-2xl font-bold text-success">
            {users.filter((u) => u.status === "active").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Staff</p>
          <p className="text-2xl font-bold text-info">
            {users.filter((u) => u.role === "staff").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Bị khóa</p>
          <p className="text-2xl font-bold text-destructive">
            {users.filter((u) => u.status === "blocked").length}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable<User>
        data={users}
        columns={columns}
        searchPlaceholder="Tìm kiếm người dùng..."
        searchKey="name"
      />
    </div>
  );
}

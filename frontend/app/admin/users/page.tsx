"use client";

import { useState, useEffect } from "react";
import {
  MoreHorizontal,
  Shield,
  ShieldOff,
  Eye,
  Ban,
  CheckCircle,
  Loader2,
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
import { usersApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

/* ===================== TYPES ===================== */
interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "user" | "staff" | "admin";
  status: "active" | "blocked";
  orders?: number;
  totalSpent?: number;
  createdAt: string;
}

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
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await usersApi.getUsers();
        const data = response.data.data || response.data;
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        toast({
          title: "❌ Lỗi",
          description: "Không thể tải danh sách người dùng",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);
  const columns = [
    {
      key: "name",
      header: "Người dùng",
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user._id}`}
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
      render: (user: User) => <span>{user.phone || "-"}</span>,
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
      render: (user: User) => <span>{user.orders ?? 0}</span>,
    },
    {
      key: "totalSpent",
      header: "Tổng chi tiêu",
      render: (user: User) => (
        <span className="font-medium">
          {user.totalSpent && user.totalSpent > 0 ? formatPrice(user.totalSpent) : "-"}
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
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable<User>
          data={users}
          columns={columns}
          searchPlaceholder="Tìm kiếm người dùng..."
          searchKey="name"
        />
      )}
    </div>
  );
}

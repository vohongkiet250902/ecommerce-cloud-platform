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
  Download,
  RefreshCw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usersApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

/* ===================== TYPES ===================== */
interface User {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: "user" | "admin";
  isActive: boolean;
  createdAt: string;
}

/* ===================== CONFIG ===================== */
const roleConfig = {
  user: { label: "User", className: "bg-secondary text-secondary-foreground" },
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

/* ===================== PAGE ===================== */
export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.getUsers();
      // Ensure we treat the response correctly (array or object)
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setUsers(data);
    } catch (error) {
      toast({
        title: "Lỗi tải người dùng",
        description: "Không thể lấy danh sách người dùng",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        const newStatus = !currentStatus;
        await usersApi.toggleUserStatus(id, newStatus);
        
        // Optimistic update
        setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: newStatus } : u));
        
        toast({ 
            title: newStatus ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản", 
            variant: "success" 
        });
    } catch (error) {
        toast({ title: "Lỗi cập nhật", variant: "destructive" });
        fetchUsers(); // Revert on error
    }
  }

  const columns = [
    {
      key: "fullName",
      header: "Người dùng",
      render: (user: User) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage
              src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.fullName}`}
            />
            <AvatarFallback>{user.fullName?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-foreground">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Điện thoại",
      render: (user: User) => <span className="text-sm font-mono text-muted-foreground">{user.phone || "-"}</span>,
    },
    {
      key: "role",
      header: "Vai trò",
      render: (user: User) => {
        const config = roleConfig[user.role] || roleConfig.user;
        return (
          <Badge
            variant="outline"
            className={cn("font-medium border-border text-xs", config.className)}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "isActive",
      header: "Trạng thái",
      render: (user: User) => {
        const status = user.isActive ? "active" : "blocked";
        const config = statusConfig[status];
        return (
          <Badge
            variant="outline"
            className={cn("font-medium border-border text-xs", config.className)}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Ngày tham gia",
      render: (user: User) => (
        <span className="text-muted-foreground text-xs">
            {new Date(user.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (user: User) => (
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
            {user.isActive ? (
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => handleToggleStatus(user._id, user.isActive)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Khóa tài khoản
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                className="text-success focus:text-success"
                onClick={() => handleToggleStatus(user._id, user.isActive)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mở khóa
              </DropdownMenuItem>
            )}
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
          <h1 className="text-2xl font-bold text-foreground">Người dùng</h1>
          <p className="text-muted-foreground">Quản lý tài khoản người dùng và phân quyền</p>
        </div>
         <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tổng người dùng</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-foreground">{users.length}</span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Hoạt động</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-success">
                {users.filter((u) => u.isActive).length}
            </span>
          </div>
        </div>
         <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Quản trị viên (Admin)</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-primary">
                {users.filter((u) => u.role === "admin").length}
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Bị khóa</p>
          <div className="flex items-baseline gap-2 mt-2">
             <span className="text-2xl font-bold text-destructive">
                {users.filter((u) => !u.isActive).length}
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
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="blocked">Bị khóa</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Tìm kiếm người dùng..."
        searchKey="fullName"
      />
    </div>
  );
}

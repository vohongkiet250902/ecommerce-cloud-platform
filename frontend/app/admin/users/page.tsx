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
  Filter,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  User as UserIcon,
  ShoppingBag,
  Activity,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");

  // User detail state
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [userStats, setUserStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    lastOrderDate: null as string | null,
  });

  // Status toggle confirmation state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [toggling, setToggling] = useState(false);

  const filteredUsers = users.filter((user) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? user.isActive
        : !user.isActive;

    const matchesRole =
      roleFilter === "all" ? true : user.role === roleFilter;

    return matchesStatus && matchesRole;
  });

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

  const handleViewDetail = async (user: User) => {
    try {
      setFetchingDetail(true);
      setUserDetailOpen(true);
      
      // Fetch user basic info
      const userRes = await usersApi.getUser(user._id);
      const userData = userRes.data.data || userRes.data;
      setSelectedUserDetail(userData);

      // Fetch user order history for stats (without changing BE)
      try {
        const orderRes = await usersApi.getUsers(); // Actually we need orderApi
        // NOTE: In api.ts, orderApi.getOrders supports userId. Let's use that.
        const { orderApi } = await import("@/services/api");
        const ordersRes = await orderApi.getOrders({ userId: user._id, limit: 100 });
        const orders = ordersRes.data.data || [];
        
        const paidOrders = orders.filter((o: any) => o.paymentStatus === 'paid' && o.status !== 'cancelled');
        const totalSpent = paidOrders.reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0);
        const lastOrder = orders.length > 0 ? orders[0].createdAt : null;

        setUserStats({
          totalOrders: orders.length,
          totalSpent: totalSpent,
          lastOrderDate: lastOrder,
        });
      } catch (err) {
        console.error("Failed to fetch user stats:", err);
        setUserStats({ totalOrders: 0, totalSpent: 0, lastOrderDate: null });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải chi tiết người dùng",
        variant: "destructive",
      });
      setUserDetailOpen(false);
    } finally {
      setFetchingDetail(false);
    }
  };

  const handleToggleStatus = (user: User) => {
    // If opening/activating, just do it. If locking/blocking, ask for confirmation.
    if (!user.isActive) {
      performToggleStatus(user._id, user.isActive);
    } else {
      setUserToToggle(user);
      setStatusDialogOpen(true);
    }
  };

  const performToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
        setToggling(true);
        const newStatus = !currentStatus;
        await usersApi.toggleUserStatus(id, newStatus);
        
        // Optimistic update
        setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: newStatus } : u));
        
        // Update detail modal if open
        if (selectedUserDetail && selectedUserDetail._id === id) {
          setSelectedUserDetail({ ...selectedUserDetail, isActive: newStatus });
        }

        toast({ 
            title: newStatus ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản", 
            variant: "success" 
        });
        setStatusDialogOpen(false);
    } catch (error: any) {
        const msg = error?.response?.data?.message || "Lỗi cập nhật";
        toast({ 
            title: "Lỗi cập nhật", 
            description: typeof msg === "string" ? msg : (Array.isArray(msg) ? msg.join(", ") : JSON.stringify(msg)),
            variant: "destructive" 
        });
        fetchUsers(); // Revert on error
    } finally {
        setToggling(false);
    }
  };

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
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-content">
            <DropdownMenuItem onClick={() => handleViewDetail(user)}>
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
            
            {user.role !== 'admin' && (
              <>
                <DropdownMenuSeparator />
                {user.isActive ? (
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleToggleStatus(user)}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Khóa tài khoản
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    className="text-success focus:text-success"
                    onClick={() => handleToggleStatus(user)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mở khóa
                  </DropdownMenuItem>
                )}
              </>
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
          <p className="text-muted-foreground">Quản lý tài khoản người dùng và phân quyền</p>
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

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-card/50 rounded-xl border border-dashed border-border/40">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground animate-pulse">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : (
        <DataTable
          data={filteredUsers}
          columns={columns}
          searchPlaceholder="Tìm kiếm người dùng..."
          searchKey="fullName"
          pageSize={10}
          filterNode={
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 bg-background/50 border-border/40">
                    <Filter className="h-4 w-4" />
                    <span>
                      {statusFilter === "all" ? "Tất cả trạng thái" : statusFilter === "active" ? "Hoạt động" : "Bị khóa"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-content">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tất cả trạng thái</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>Hoạt động</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("blocked")}>Bị khóa</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Role Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 bg-background/50 border-border/40">
                    <Filter className="h-4 w-4" />
                    <span>
                      {roleFilter === "all" ? "Tất cả vai trò" : roleFilter === "admin" ? "Admin" : "User"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-content">
                  <DropdownMenuItem onClick={() => setRoleFilter("all")}>Tất cả vai trò</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("admin")}>Admin</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("user")}>User</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      )}

      {/* User Detail Modal */}
      <Dialog open={userDetailOpen} onOpenChange={setUserDetailOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Chi tiết người dùng</DialogTitle>
          </DialogHeader>

          {fetchingDetail ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">Đang tải hồ sơ...</p>
            </div>
          ) : selectedUserDetail && (
            <div className="flex flex-col">
              {/* Profile Header */}
              <div className="relative h-24 bg-gradient-to-r from-primary/20 to-primary/5">
                 <div className="absolute -bottom-12 left-6">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                      <AvatarImage src={selectedUserDetail.avatar} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {selectedUserDetail.fullName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                 </div>
                 <Badge 
                    variant="outline" 
                    className={cn(
                        "absolute bottom-2 right-4 font-bold border-none shadow-sm capitalize",
                        selectedUserDetail.role === 'admin' ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}
                 >
                    {selectedUserDetail.role}
                 </Badge>
              </div>

              {/* Profile Body */}
              <div className="pt-16 pb-8 px-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-foreground">{selectedUserDetail.fullName}</h2>
                  <p className="text-sm text-muted-foreground">ID: {selectedUserDetail._id}</p>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border/50 transition-colors hover:bg-muted">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Email</p>
                      <p className="text-sm font-medium">{selectedUserDetail.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border/50 transition-colors hover:bg-muted">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Số điện thoại</p>
                      <p className="text-sm font-medium">{selectedUserDetail.phone || "Chưa cập nhật"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border/50 transition-colors hover:bg-muted">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ngày tham gia</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedUserDetail.createdAt).toLocaleDateString("vi-VN", {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 border border-border/50 transition-colors hover:bg-muted">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Trạng thái tài khoản</p>
                      <Badge variant="outline" className={cn(
                        "mt-0.5",
                        selectedUserDetail.isActive ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {selectedUserDetail.isActive ? "Đang hoạt động" : "Đang bị khóa"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Activity Stats Section */}
                <div className="space-y-3">
                   <p className="text-[10px] uppercase font-black text-primary tracking-widest px-1">Thống kê hoạt động</p>
                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-primary/[0.03] border border-primary/10 transition-all hover:bg-primary/[0.05]">
                         <div className="flex items-center gap-2 mb-1">
                            <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[10px] font-bold text-muted-foreground">Đơn hàng</span>
                         </div>
                         <p className="text-xl font-black text-foreground">{userStats.totalOrders}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-success/[0.03] border border-success/10 transition-all hover:bg-success/[0.05]">
                         <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-3.5 w-3.5 text-success" />
                            <span className="text-[10px] font-bold text-muted-foreground">Tổng chi tiêu</span>
                         </div>
                         <p className="text-lg font-black text-foreground">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(userStats.totalSpent)}
                         </p>
                      </div>
                   </div>

                   <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between transition-all hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                         <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                         <span className="text-[10px] font-bold text-muted-foreground uppercase">Mua lần cuối</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">
                         {userStats.lastOrderDate 
                            ? new Date(userStats.lastOrderDate).toLocaleDateString("vi-VN") 
                            : "Chưa có giao dịch"}
                      </span>
                   </div>
                </div>

                <div className="pt-4 flex gap-3">
                   <Button variant="outline" className="flex-1 rounded-xl border-dashed bg-background/50 border-border/40" onClick={() => setUserDetailOpen(false)}>
                      Đóng
                   </Button>
                   {selectedUserDetail.role !== 'admin' && (
                     <Button 
                        variant={selectedUserDetail.isActive ? "destructive" : "default"} 
                        className="flex-1 rounded-xl"
                        onClick={() => handleToggleStatus(selectedUserDetail)}
                      >
                        {selectedUserDetail.isActive ? "Khóa tài khoản" : "Mở khóa"}
                     </Button>
                   )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Lock Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Xác nhận khóa tài khoản</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/40">
              Bạn có chắc chắn muốn khóa tài khoản của <span className="font-bold text-foreground">{userToToggle?.fullName}</span> không? 
              <br />
              <span className="text-xs mt-2 block font-medium text-destructive/80 italic">
                * Người dùng này sẽ không thể đăng nhập vào hệ thống cho đến khi được mở khóa lại.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="rounded-xl font-semibold border-border/60">
                Hủy bỏ
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                className="rounded-xl font-bold gap-2 px-6"
                onClick={() => userToToggle && performToggleStatus(userToToggle._id, userToToggle.isActive)}
                disabled={toggling}
              >
                {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Xác nhận khóa
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

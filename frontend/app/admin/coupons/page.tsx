"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  Calendar,
  Loader2,
  Ticket,
  Percent,
  Ban,
  CheckCircle,
  Filter,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { couponApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/* ================= TYPES ================= */
interface Coupon {
  _id: string;
  code: string;
  discountPercentage: number;
  maxDiscountAmount?: number;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

/* ================= PAGE ================= */
export default function CouponsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "expired">("all");
  
  // Status toggle confirmation state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [couponToToggle, setCouponToToggle] = useState<Coupon | null>(null);
  const [toggling, setToggling] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    discountPercentage: 1,
    maxDiscountAmount: 0,
    expiryDate: "",
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await couponApi.getAdminCoupons();
      setCoupons(res.data.data || res.data || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách mã giảm giá",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      variant: "success",
      title: "Đã sao chép",
      description: `Mã ${code} đã được sao chép vào clipboard`,
    });
  };

  const handleToggleStatus = (coupon: Coupon) => {
    // If activating, just do it. If disabling, ask for confirmation.
    if (!coupon.isActive) {
      performToggleStatus(coupon._id);
    } else {
      setCouponToToggle(coupon);
      setStatusDialogOpen(true);
    }
  };

  const performToggleStatus = async (id: string) => {
    try {
      setToggling(true);
      await couponApi.toggleCouponStatus(id);
      toast({
        variant: "success",
        title: "Thành công",
        description: "Đã cập nhật trạng thái mã giảm giá",
      });
      setStatusDialogOpen(false);
      fetchCoupons();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const payload = {
        ...formData,
        maxDiscountAmount: formData.maxDiscountAmount > 0 ? formData.maxDiscountAmount : undefined,
      };
      await couponApi.createCoupon(payload);
      toast({
        variant: "success",
        title: "Thành công",
        description: "Đã tạo mã giảm giá mới",
      });
      setIsCreateOpen(false);
      setFormData({
        code: "",
        discountPercentage: 1,
        maxDiscountAmount: 0,
        expiryDate: "",
      });
      fetchCoupons();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể tạo mã giảm giá",
      });
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      key: "code",
      header: "Mã giảm giá",
      render: (coupon: Coupon) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded font-mono font-bold">
            {coupon.code}
          </code>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleCopyCode(coupon.code)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Giảm giá",
      render: (coupon: Coupon) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Percent className="h-3.5 w-3.5 text-primary" />
            <span>{coupon.discountPercentage}%</span>
          </div>
          {coupon.maxDiscountAmount && (
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Tối đa: {formatPrice(coupon.maxDiscountAmount)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "expiryDate",
      header: "Hết hạn",
      render: (coupon: Coupon) => {
        const isExpired = new Date(coupon.expiryDate) < new Date();
        return (
          <div className={cn(
            "flex items-center gap-2 font-medium",
            isExpired ? "text-destructive" : "text-muted-foreground"
          )}>
            <Calendar className="h-4 w-4" />
            <span className="text-xs">
              {new Date(coupon.expiryDate).toLocaleDateString("vi-VN")}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (coupon: Coupon) => {
        const isExpired = new Date(coupon.expiryDate) < new Date();
        if (isExpired) return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Hết hạn</Badge>;
        
        return coupon.isActive ? (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">Hoạt động</Badge>
        ) : (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Đã tắt</Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (coupon: Coupon) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-content">
            <DropdownMenuItem onClick={() => handleToggleStatus(coupon)}>
              {coupon.isActive ? (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Tạm dừng
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Kích hoạt
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filteredCoupons = useMemo(() => {
    const now = new Date();
    return coupons.filter(c => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return c.isActive && new Date(c.expiryDate) > now;
      if (statusFilter === "disabled") return !c.isActive;
      if (statusFilter === "expired") return new Date(c.expiryDate) <= now;
      return true;
    });
  }, [coupons, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: coupons.length,
      active: coupons.filter(c => c.isActive && new Date(c.expiryDate) > now).length,
      expired: coupons.filter(c => new Date(c.expiryDate) <= now).length,
      disabled: coupons.filter(c => !c.isActive).length,
    };
  }, [coupons]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khuyến mãi</h1>
          <p className="text-muted-foreground">Quản lý mã giảm giá và chiến dịch Marketing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo mã mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tổng mã</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Khả dụng</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-success">{stats.active}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tạm tắt</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-warning">{stats.disabled}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Hết hạn</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-destructive">{stats.expired}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-card/50 rounded-2xl border border-dashed border-border/40">
           <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground animate-pulse font-bold">Đang tải khuyến mãi...</p>
           </div>
        </div>
      ) : (
        <DataTable<Coupon>
          data={filteredCoupons}
          columns={columns}
          searchPlaceholder="Tìm kiếm mã giảm giá..."
          pageSize={10}
          filterNode={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 bg-background/50 border-border/40">
                  <Filter className="h-4 w-4" />
                  <span>
                    {statusFilter === "all" ? "Tất cả trạng thái" : 
                     statusFilter === "active" ? "Đang hoạt động" : 
                     statusFilter === "disabled" ? "Đã tạm dừng" : "Đã hết hạn"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Đang hoạt động</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("disabled")}>Đã tạm dừng</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("expired")}>Đã hết hạn</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      )}

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border shadow-2xl rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Tạo mã giảm giá mới
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreate} className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-sm font-semibold">
                Mã khuyến mãi <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="code"
                placeholder="Nhập mã khuyến mãi..." 
                className="h-11 rounded-xl"
                required
                value={formData.code}
                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="discount" className="text-sm font-semibold">
                  Phần trăm giảm (%) <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="discount"
                  type="number" 
                  min={1} 
                  max={100} 
                  className="h-11 rounded-xl"
                  required
                  value={formData.discountPercentage}
                  onChange={e => setFormData({...formData, discountPercentage: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxDiscount" className="text-sm font-semibold">
                  Giảm tối đa (VNĐ)
                </Label>
                <Input 
                  id="maxDiscount"
                  type="number" 
                  placeholder="0 = Không giới hạn"
                  className="h-11 rounded-xl"
                  value={formData.maxDiscountAmount}
                  onChange={e => setFormData({...formData, maxDiscountAmount: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiry" className="text-sm font-semibold">
                Ngày hết hạn <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="expiry"
                type="date" 
                className="h-11 rounded-xl"
                required
                value={formData.expiryDate}
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="border-border/60" 
                onClick={() => setIsCreateOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Tạo mã ngay
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-warning mb-2">
              <div className="p-2 rounded-full bg-warning/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Xác nhận tạm dừng mã</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/40">
              Bạn có chắc chắn muốn tạm dừng mã <span className="font-bold text-foreground">{couponToToggle?.code}</span> không? 
              <br />
              <span className="text-xs mt-2 block font-medium text-warning/80 italic">
                * Sau khi tạm dừng, khách hàng sẽ không thể sử dụng mã này cho đến khi bạn kích hoạt lại.
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
                variant="default" 
                className="rounded-xl font-bold gap-2 px-6 bg-warning text-warning-foreground hover:bg-warning/90"
                onClick={() => couponToToggle && performToggleStatus(couponToToggle._id)}
                disabled={toggling}
              >
                {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Xác nhận dừng
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

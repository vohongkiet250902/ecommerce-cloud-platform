"use client";

import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

/* ================= TYPES ================= */
interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "scheduled";
}

/* ================= DATA ================= */
const coupons: Coupon[] = [
  {
    id: "1",
    code: "NEWYEAR2026",
    type: "percent",
    value: 20,
    minOrder: 500000,
    maxDiscount: 500000,
    usageLimit: 1000,
    usedCount: 456,
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    status: "active",
  },
  {
    id: "2",
    code: "FREESHIP50",
    type: "fixed",
    value: 50000,
    minOrder: 300000,
    usageLimit: 500,
    usedCount: 500,
    startDate: "2023-12-01",
    endDate: "2024-01-15",
    status: "expired",
  },
  {
    id: "3",
    code: "TECH10",
    type: "percent",
    value: 10,
    minOrder: 1000000,
    maxDiscount: 1000000,
    usageLimit: 200,
    usedCount: 89,
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    status: "active",
  },
  {
    id: "4",
    code: "TET2024",
    type: "percent",
    value: 25,
    minOrder: 2000000,
    maxDiscount: 2000000,
    usageLimit: 500,
    usedCount: 0,
    startDate: "2024-02-08",
    endDate: "2024-02-14",
    status: "scheduled",
  },
  {
    id: "5",
    code: "VIP100K",
    type: "fixed",
    value: 100000,
    minOrder: 500000,
    usageLimit: 100,
    usedCount: 68,
    startDate: "2024-01-01",
    endDate: "2024-06-30",
    status: "active",
  },
];

const statusConfig = {
  active: {
    label: "Đang hoạt động",
    className: "bg-success/10 text-success border-success/20",
  },
  expired: {
    label: "Hết hạn",
    className: "bg-muted text-muted-foreground",
  },
  scheduled: {
    label: "Lên lịch",
    className: "bg-info/10 text-info border-info/20",
  },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

/* ================= PAGE ================= */
export default function CouponsPage() {
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Đã sao chép",
      description: `Mã ${code} đã được sao chép vào clipboard`,
    });
  };

  const columns = [
    {
      key: "code",
      header: "Mã giảm giá",
      render: (coupon: Coupon) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-secondary rounded font-mono font-medium">
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
      key: "value",
      header: "Giá trị",
      render: (coupon: Coupon) => (
        <div>
          <p className="font-semibold">
            {coupon.type === "percent"
              ? `${coupon.value}%`
              : formatPrice(coupon.value)}
          </p>
          {coupon.maxDiscount && coupon.type === "percent" && (
            <p className="text-xs text-muted-foreground">
              Tối đa: {formatPrice(coupon.maxDiscount)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "minOrder",
      header: "Đơn tối thiểu",
      render: (coupon: Coupon) => (
        <span className="text-muted-foreground">
          {formatPrice(coupon.minOrder)}
        </span>
      ),
    },
    {
      key: "usage",
      header: "Sử dụng",
      render: (coupon: Coupon) => (
        <div>
          <p>
            {coupon.usedCount} / {coupon.usageLimit}
          </p>
          <div className="w-20 h-1.5 bg-secondary rounded-full mt-1">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${(coupon.usedCount / coupon.usageLimit) * 100}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "period",
      header: "Thời gian",
      render: (coupon: Coupon) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {coupon.startDate} - {coupon.endDate}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (coupon: Coupon) => {
        const config = statusConfig[coupon.status];
        return (
          <Badge
            variant="outline"
            className={cn("font-medium", config.className)}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-content">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const activeCoupons = coupons.filter((c) => c.status === "active").length;
  const totalUsed = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Khuyến mãi</h1>
          <p className="text-muted-foreground">
            Quản lý mã giảm giá và khuyến mãi
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Tạo mã giảm giá
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng mã</p>
          <p className="text-2xl font-bold text-foreground">{coupons.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Đang hoạt động</p>
          <p className="text-2xl font-bold text-success">{activeCoupons}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Lượt sử dụng</p>
          <p className="text-2xl font-bold text-primary">{totalUsed}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Lên lịch</p>
          <p className="text-2xl font-bold text-info">
            {coupons.filter((c) => c.status === "scheduled").length}
          </p>
        </div>
      </div>

      <DataTable<Coupon>
        data={coupons}
        columns={columns}
        searchKey="code"
        searchPlaceholder="Tìm kiếm mã giảm giá..."
      />
    </div>
  );
}

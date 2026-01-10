"use client";

import Image from "next/image";
import {
  Check,
  X,
  Eye,
  MoreHorizontal,
  Star,
  MessageSquare,
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

interface Review {
  id: string;
  user: string;
  userAvatar?: string;
  product: string;
  productImage: string;
  rating: number;
  content: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const reviews: Review[] = [
  {
    id: "1",
    user: "Nguyễn Văn A",
    product: "iPhone 15 Pro Max 256GB",
    productImage:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&h=100&fit=crop",
    rating: 5,
    content:
      "Sản phẩm tuyệt vời, giao hàng nhanh, đóng gói cẩn thận. Rất hài lòng với chất lượng!",
    status: "approved",
    createdAt: "2024-01-15 14:30",
  },
  {
    id: "2",
    user: "Trần Thị B",
    product: "MacBook Pro 14 M3",
    productImage:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop",
    rating: 4,
    content: "Máy chạy mượt, thiết kế đẹp. Chỉ có điều giá hơi cao một chút.",
    status: "pending",
    createdAt: "2024-01-15 10:15",
  },
  {
    id: "3",
    user: "Lê Văn C",
    product: "Samsung Galaxy S24 Ultra",
    productImage:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop",
    rating: 2,
    content: "Sản phẩm không như mô tả, camera không tốt như quảng cáo.",
    status: "pending",
    createdAt: "2024-01-14 16:45",
  },
  {
    id: "4",
    user: "Phạm Thị D",
    product: "AirPods Pro 2",
    productImage:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100&h=100&fit=crop",
    rating: 5,
    content:
      "Chất lượng âm thanh xuất sắc, khử ồn rất tốt. Đáng đồng tiền bát gạo!",
    status: "approved",
    createdAt: "2024-01-14 09:30",
  },
  {
    id: "5",
    user: "Hoàng Văn E",
    product: "Sony WH-1000XM5",
    productImage:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100&h=100&fit=crop",
    rating: 1,
    content: "Spam review fake product",
    status: "rejected",
    createdAt: "2024-01-13 18:00",
  },
];

const statusConfig: Record<
  Review["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ duyệt",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  approved: {
    label: "Đã duyệt",
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    label: "Từ chối",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-4 w-4",
            star <= rating ? "fill-warning text-warning" : "text-muted"
          )}
        />
      ))}
    </div>
  );
}

export default function Reviews() {
  const columns = [
    {
      key: "user",
      header: "Người dùng",
      render: (review: Review) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 overflow-hidden">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.id}`}
            />
            <AvatarFallback>{review.user.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{review.user}</span>
        </div>
      ),
    },
    {
      key: "product",
      header: "Sản phẩm",
      render: (review: Review) => (
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 overflow-hidden rounded-lg">
            {/* <Image
              src={review.productImage}
              alt={review.product}
              fill
              sizes="40px"
              className="object-cover"
            /> */}
          </div>
          <span className="text-foreground truncate max-w-[200px]">
            {review.product}
          </span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Đánh giá",
      render: (review: Review) => <RatingStars rating={review.rating} />,
    },
    {
      key: "content",
      header: "Nội dung",
      render: (review: Review) => (
        <p className="text-muted-foreground text-sm truncate max-w-[250px]">
          {review.content}
        </p>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (review: Review) => {
        const config = statusConfig[review.status];
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
      key: "createdAt",
      header: "Ngày tạo",
      render: (review: Review) => (
        <span className="text-muted-foreground text-sm">
          {review.createdAt}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (review: Review) => (
        <div className="flex items-center gap-1">
          {review.status === "pending" && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-success hover:text-success"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
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
              <DropdownMenuItem>
                <MessageSquare className="mr-2 h-4 w-4" />
                Phản hồi
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Xóa review
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const pendingReviews = reviews.filter((r) => r.status === "pending").length;
  const avgRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Đánh giá</h1>
          <p className="text-muted-foreground">Quản lý đánh giá sản phẩm</p>
        </div>
      </div>

      {/* Alert for pending reviews */}
      {pendingReviews > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-warning/20">
            <MessageSquare className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              Có {pendingReviews} đánh giá đang chờ duyệt
            </p>
            <p className="text-sm text-muted-foreground">
              Vui lòng xem xét và phê duyệt các đánh giá mới
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng đánh giá</p>
          <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Rating trung bình</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-foreground">{avgRating}</p>
            <Star className="h-5 w-5 fill-warning text-warning" />
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Chờ duyệt</p>
          <p className="text-2xl font-bold text-warning">{pendingReviews}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Đã duyệt</p>
          <p className="text-2xl font-bold text-success">
            {reviews.filter((r) => r.status === "approved").length}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={reviews}
        columns={columns}
        searchPlaceholder="Tìm kiếm đánh giá..."
        searchKey="content"
      />
    </div>
  );
}

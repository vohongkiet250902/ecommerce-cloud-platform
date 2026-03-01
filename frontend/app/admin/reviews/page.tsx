"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  X,
  Star,
  MessageSquare,
  Loader2,
  Trash2,
  Filter,
  Search,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { reviewApi } from "@/services/api";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
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

interface Review {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  productId: {
    _id: string;
    name: string;
    slug: string;
    images?: { url: string }[];
  };
  rating: number;
  comment: string;
  createdAt: string;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating ? "fill-warning text-warning" : "text-muted border-muted"
          )}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewApi.getAdminReviews();
      setReviews(res.data.data || res.data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tải danh sách đánh giá",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = (review: Review) => {
    setReviewToDelete(review);
    setDeleteDialogOpen(true);
  };

  const performDelete = async () => {
    if (!reviewToDelete) return;

    try {
      setToggling(true);
      await reviewApi.deleteReview(reviewToDelete._id);
      toast({
        variant: "success",
        title: "Thành công",
        description: "Đã xóa đánh giá thành công",
      });
      setDeleteDialogOpen(false);
      fetchReviews();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể xóa đánh giá",
      });
    } finally {
      setToggling(false);
    }
  };

  const columns = [
    {
      key: "user",
      header: "Khách hàng",
      render: (review: Review) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border/50">
            <AvatarImage
              src={review.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userId?._id}`}
            />
            <AvatarFallback>{review.userId?.fullName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground">{review.userId?.fullName}</span>
            <span className="text-[10px] text-muted-foreground">{review.userId?.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "product",
      header: "Sản phẩm",
      render: (review: Review) => (
        <div className="flex flex-col gap-1 max-w-[200px]">
          <span className="text-sm font-medium text-foreground truncate">
            {review.productId?.name}
          </span>
          <RatingStars rating={review.rating} />
        </div>
      ),
    },
    {
      key: "comment",
      header: "Nội dung",
      render: (review: Review) => (
        <div className="max-w-[300px]">
          <p className="text-muted-foreground text-sm line-clamp-2">
            {review.comment}
          </p>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Thời gian",
      render: (review: Review) => (
        <div className="flex flex-col">
             <span className="text-foreground text-xs font-medium">
                {format(new Date(review.createdAt), "dd/MM/yyyy")}
             </span>
             <span className="text-[10px] text-muted-foreground">
                {format(new Date(review.createdAt), "HH:mm")}
             </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (review: Review) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-content">
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => handleDelete(review)}
              disabled={toggling}
            >
              {toggling && reviewToDelete?._id === review._id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Xóa đánh giá
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const stats = useMemo(() => {
    return {
      total: reviews.length,
      avg: reviews.length > 0 
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : "0.0",
      fiveStar: reviews.filter(r => r.rating === 5).length,
      bad: reviews.filter(r => r.rating <= 2).length,
    };
  }, [reviews]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Đánh giá</h1>
          <p className="text-muted-foreground">Phản hồi và nhận xét từ khách hàng</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tổng đánh giá</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-foreground">{stats.total}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Rating trung bình</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold text-warning">{stats.avg}</span>
            <Star className="h-4 w-4 fill-warning text-warning" />
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tuyệt vời (5 sao)</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-success">{stats.fiveStar}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Cần chú ý (≤ 2 sao)</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-destructive">{stats.bad}</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="h-[400px] flex items-center justify-center bg-card rounded-xl border border-dashed">
           <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground animate-pulse font-bold">Đang tải đánh giá...</p>
           </div>
        </div>
      ) : (
        <DataTable<Review>
          data={reviews}
          columns={columns}
          searchPlaceholder="Tìm kiếm nội dung đánh giá..."
          pageSize={10}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">Xác nhận xóa đánh giá</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/40">
              Bạn có chắc chắn muốn xóa đánh giá của khách hàng <span className="font-bold text-foreground">{reviewToDelete?.userId?.fullName}</span> về sản phẩm <span className="font-bold text-foreground">"{reviewToDelete?.productId?.name}"</span> không? 
              <br />
              <span className="text-xs mt-2 block font-medium text-destructive/80 italic">
                * Hành động này sẽ xóa vĩnh viễn đánh giá và không thể hoàn tác. Điểm trung bình sản phẩm sẽ được tính toán lại.
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
                onClick={performDelete}
                disabled={toggling}
              >
                {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Xác nhận xóa
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

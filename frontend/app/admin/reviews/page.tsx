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
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { reviewApi, productApi } from "@/services/api";
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
  sku?: string;
  attributes?: any[];
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

const parseComment = (comment: string) => {
  if (!comment) return { variant: null, text: "" };
  const match = comment.match(/^\[Biến thể:\s*([^\]]+)\]\s*([\s\S]*)$/);
  if (match) {
    let variant = match[1];
    // Deduplicate if SKU is repeated like "SKU - SKU"
    if (variant.includes(" - ")) {
      const parts = variant.split(" - ");
      if (parts.length === 2 && parts[0].trim() === parts[1].trim()) {
        variant = parts[0].trim();
      }
    }
    return { variant, text: match[2] };
  }
  return { variant: null, text: comment };
};

const formatSkuValuesOnly = (sku: string) => {
  if (!sku || sku === "N/A" || sku === "DEFAULT") return "";
  if (sku.includes(":")) {
    return sku
      .split(/[,|\-]/)
      .map(part => {
        const splitPart = part.split(":");
        return splitPart.length > 1 ? splitPart[1].trim() : part.trim();
      })
      .filter(Boolean)
      .join(" - ");
  }
  return ""; // Consistent with orders page fix
};

export default function ReviewsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [toggling, setToggling] = useState(false);

  // View state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [reviewToView, setReviewToView] = useState<Review | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await reviewApi.getAdminReviews();
      const rawReviews = res.data.data || res.data || [];
      
      // Bổ sung: Làm giàu dữ liệu bằng cách lấy thuộc tính của biến thể từ SKU
      const productCache = new Map<string, any>();
      
      const enriched = await Promise.all(
        rawReviews.map(async (review: any) => {
          try {
            // Lấy SKU: ưu tiên trường sku, nếu không có thì parse từ comment (legacy)
            const sku = review.sku || parseComment(review.comment).variant;
            if (!sku || sku === "N/A" || sku === "DEFAULT") return review;

            const productId = review.productId?._id || review.productId;
            if (!productId) return { ...review, sku };

            // Cache tránh gọi API lặp lại cho cùng 1 sản phẩm
            let product = productCache.get(productId);
            if (!product) {
              const prodRes = await productApi.getProduct(productId);
              product = prodRes.data;
              productCache.set(productId, product);
            }

            // Tìm biến thể khớp với SKU
            const variant = product.variants?.find((v: any) => v.sku === sku);
            
            return {
              ...review,
              sku,
              attributes: variant?.attributes || [],
              // Nếu comment cũ có [Biến thể...], ta làm sạch nó khi hiển thị nếu cần
            };
          } catch (err) {
            console.error("Lỗi làm giàu dữ liệu đánh giá:", err);
            return review;
          }
        })
      );

      setReviews(enriched);
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

  const handleView = (review: Review) => {
    setReviewToView(review);
    setViewDialogOpen(true);
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
      render: (review: Review) => {
        const skuStr = review.sku || parseComment(review.comment).variant;
        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            <span className="text-sm font-bold text-foreground truncate">
              {review.productId?.name}
            </span>
            {skuStr && (
              <div className="flex flex-col gap-1">
                <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 h-4 bg-muted/50 border-border/50 text-muted-foreground max-w-[180px] truncate font-mono">
                  SKU: {skuStr}
                </Badge>
                {review.attributes && review.attributes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {review.attributes.map((attr: any, idx: number) => (
                      <span key={idx} className="text-[9px] bg-primary/5 text-primary/80 px-1 py-0 rounded border border-primary/10 leading-none font-medium">
                        {attr.key}: {attr.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <RatingStars rating={review.rating} />
          </div>
        );
      },
    },
    {
      key: "comment",
      header: "Nội dung",
      render: (review: Review) => {
        const parsed = parseComment(review.comment);
        return (
          <div className="max-w-[300px]">
            <p className="text-muted-foreground text-sm line-clamp-2">
              {parsed.text}
            </p>
          </div>
        );
      },
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
            <DropdownMenuItem onClick={() => handleView(review)}>
              <Eye className="mr-2 h-4 w-4" />
              Xem chi tiết
            </DropdownMenuItem>
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
      bad: reviews.filter(r => r.rating <= 3).length,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      if (statusFilter === "all") return true;
      if (statusFilter === "good") return review.rating >= 4;
      if (statusFilter === "bad") return review.rating <= 3;
      return true;
    });
  }, [reviews, statusFilter]);

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
          <p className="text-sm text-muted-foreground font-medium">Cần chú ý (≤ 3 sao)</p>
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
          data={filteredReviews}
          columns={columns}
          searchPlaceholder="Tìm kiếm nội dung đánh giá..."
          pageSize={10}
          filterNode={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 bg-background/50 border-border/40">
                  <Filter className="h-4 w-4" />
                  <span>
                    {statusFilter === "all" ? "Tất cả đánh giá" : 
                     statusFilter === "good" ? "Tốt (4-5 sao)" : 
                     "Chưa tốt (1-3 sao)"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tất cả đánh giá</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("good")}>Tốt (4-5 sao)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("bad")}>Chưa tốt (1-3 sao)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
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

      {/* View Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Chi tiết đánh giá
            </DialogTitle>
          </DialogHeader>
          {reviewToView && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                <Avatar className="h-12 w-12 border border-border/50">
                  <AvatarImage src={reviewToView.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewToView.userId?._id}`} />
                  <AvatarFallback>{reviewToView.userId?.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground">{reviewToView.userId?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{reviewToView.userId?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex flex-col gap-2 text-sm text-foreground bg-muted/10 p-3 rounded-lg border border-border/40">
                    <p className="font-bold text-primary">{reviewToView.productId?.name}</p>
                    {reviewToView.sku && (
                      <div className="flex flex-col gap-1.5">
                        <Badge variant="secondary" className="w-fit text-[11px] font-mono px-2 py-0.5 border-border/50">
                          SKU: {reviewToView.sku}
                        </Badge>
                        {reviewToView.attributes && reviewToView.attributes.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {reviewToView.attributes.map((attr: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                                {attr.key}: {attr.value}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">Mức độ tương tác:</div>
                  <div className="bg-muted/10 p-3 rounded-lg border border-border/40">
                     <RatingStars rating={reviewToView.rating} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">Đánh giá chung:</div>
                  <div className="text-sm text-foreground bg-muted/10 p-3 rounded-lg border border-border/40 min-h-[80px]">
                    {parseComment(reviewToView.comment).text ? (
                      <p className="whitespace-pre-wrap">{parseComment(reviewToView.comment).text}</p>
                    ) : (
                      <span className="text-muted-foreground italic">(Khách hàng không để lại nhận xét)</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">Thời gian:</div>
                  <div className="text-sm text-muted-foreground">
                     {format(new Date(reviewToView.createdAt), "HH:mm, 'Ngày' dd 'Tháng' MM 'Năm' yyyy", { locale: vi })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

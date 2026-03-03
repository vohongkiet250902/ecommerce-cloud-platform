"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

export default function PaymentResultPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-secondary/30 dark:bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 font-semibold text-muted-foreground">Đang xác nhận kết quả giao dịch...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 dark:bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 font-semibold text-muted-foreground">Đang tải kết quả giao dịch...</p>
          </div>
        }>
          <PaymentResultContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "canceled">("loading");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Support backend redirect: /payment-result?status=success&orderId=xyz
    const statusParam = searchParams.get("status");
    const orderIdParam = searchParams.get("orderId");
    
    // Support direct vnp return: /payment-result?vnp_ResponseCode=00&vnp_TxnRef=xyz
    const responseCode = searchParams.get("vnp_ResponseCode");
    const vnpOrderId = searchParams.get("vnp_TxnRef");
    
    setOrderId(orderIdParam || vnpOrderId);

    // Simulation delay for user experience
    const timer = setTimeout(() => {
      if (statusParam === "success") {
        setStatus("success");
      } else if (statusParam === "failed") {
        setStatus("failed");
      } else if (statusParam === "canceled") {
        setStatus("canceled");
      } else if (responseCode === "00") {
        setStatus("success");
      } else if (responseCode === "24") {
        setStatus("canceled");
      } else if (responseCode) {
        setStatus("failed");
      } else {
        // Fallback for COD or unhandled
        setStatus("success");
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [searchParams]);

  const getStatusConfig = () => {
    switch (status) {
      case "success":
        return {
          icon: <CheckCircle2 className="h-10 w-10 text-success" />,
          title: "Thanh toán thành công!",
          description: "Cảm ơn bạn đã tin tưởng lựa chọn sản phẩm của chúng tôi. Đơn hàng của bạn đang được chuẩn bị để giao đi.",
          bgColor: "bg-success/10",
        };
      case "canceled":
        return {
          icon: <XCircle className="h-10 w-10 text-warning" />,
          title: "Thanh toán đã hủy",
          description: "Giao dịch của bạn đã bị hủy bỏ. Bạn có thể thử lại hoặc chọn phương thức thanh toán khác.",
          bgColor: "bg-warning/10",
        };
      case "failed":
        return {
          icon: <XCircle className="h-10 w-10 text-destructive" />,
          title: "Thanh toán thất bại",
          description: "Có lỗi xảy ra trong quá trình xử lý giao dịch. Vui lòng liên hệ bộ phận hỗ trợ nếu tài khoản của bạn đã bị trừ tiền.",
          bgColor: "bg-destructive/10",
        };
      default:
        return {
          icon: <Loader2 className="h-10 w-10 text-primary animate-spin" />,
          title: "Đang xác nhận kết quả...",
          description: "Chúng tôi đang xác nhận giao dịch, vui lòng đợi trong giây lát...",
          bgColor: "bg-primary/10",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Card className="max-w-md w-full rounded-3xl border border-border/50 shadow-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-6 flex items-center justify-center">
          <div className={cn("w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500", config.bgColor)}>
            {config.icon}
          </div>
        </div>
        <CardTitle className="text-2xl font-black tracking-tight">
          {config.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="text-center space-y-4 px-8">
        <p className="text-muted-foreground text-sm">
          {config.description}
        </p>
        
        {status === "success" && (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-sm text-primary font-medium mt-6">
                Mã đơn hàng: <span className="font-bold">{orderId || "#N/A"}</span>
                <br />
                <span className="text-muted-foreground text-xs mt-1 block">Thông tin chi tiết đã được cập nhật thành công.</span>
            </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 p-8 border-t border-border/40 bg-secondary/10">
        <Button 
          className="w-full h-12 rounded-xl font-bold gradient-hero shadow-lg hover:shadow-xl transition-all"
          asChild
        >
          <Link href="/orders">
            XEM ĐƠN HÀNG CỦA TÔI
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl font-bold hover:bg-primary/5 hover:text-primary transition-colors hover:border-primary/20"
          asChild
        >
          <Link href="/products">
            <ShoppingBag className="mr-2 h-4 w-4" />
            TIẾP TỤC MUA HÀNG
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

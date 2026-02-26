"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ChevronLeft, 
  CreditCard, 
  Truck, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  User, 
  ShoppingBag,
  ArrowRight,
  Loader2,
  CheckCircle2,
  QrCode,
  X
} from "lucide-react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { orderApi, paymentApi } from "@/services/api";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get("buyNow") === "true";
  
  const { cartItems, clearCart } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    note: "",
    paymentMethod: "COD"
  });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load checkout items
  useEffect(() => {
    if (isBuyNow) {
      const stored = sessionStorage.getItem("buyNowItem");
      if (stored) {
        setCheckoutItems([JSON.parse(stored)]);
      } else {
        // If no buyNowItem found but URL has buyNow=true, fall back to cart or redirect
        if (cartItems.length > 0) {
          setCheckoutItems(cartItems);
        } else {
          router.push("/products");
        }
      }
    } else {
      setCheckoutItems(cartItems);
    }
  }, [isBuyNow, cartItems, router]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDarkMode ? "light" : "dark");
  };

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shippingFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutItems.length === 0) return;

    if (!formData.fullName || !formData.phone || !formData.address) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ thông tin giao hàng",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Mapping items carefully to handle both cart items (id) and order items (productId)
      const items = checkoutItems.map(item => {
        const productId = (item.productId || item.id || "").toString();
        const sku = item.sku && item.sku !== "N/A" ? item.sku : "";
        
        if (!productId || !sku) {
          console.error("Missing order data for item:", item);
        }
        
        return {
          productId,
          sku: sku || "DEFAULT", // Try "DEFAULT" as a last resort if SKU is missing
          quantity: item.quantity || 1
        };
      });

      const orderData = {
        items,
        paymentMethod: formData.paymentMethod === "VNPAYQR" ? "vnpay" : "cod",
        idempotencyKey: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      };

      console.log("Sending order data:", orderData);

      // Note: We don't send shippingInfo here because the Backend DTO (CreateOrderDto) 
      // does not whitelist it, which would trigger a 400 Bad Request error.
      const orderResponse = await orderApi.createOrder(orderData);
      
      // Handle both { _id } and { data: { _id } } or { id }
      const orderId = orderResponse.data?._id || orderResponse.data?.id || orderResponse.data?.data?._id || orderResponse.data?.data?.id;

      if (!orderId) {
        throw new Error("Không lấy được mã đơn hàng từ hệ thống");
      }

      if (formData.paymentMethod === "VNPAYQR") {
        try {
          const paymentRes = await paymentApi.createVNPayUrl(orderId);
          const url = paymentRes.data?.paymentUrl || paymentRes.data?.data?.paymentUrl;
          
          if (!url) {
            throw new Error("Không thể tạo liên kết thanh toán VNPay");
          }

          // Clear cart/buyNowItem before redirecting
          if (isBuyNow) {
            sessionStorage.removeItem("buyNowItem");
          } else {
            clearCart();
          }

          // Directly redirect to VNPay
          window.location.href = url;
          return; // Stop execution as we are redirecting
        } catch (error: any) {
          console.error("VNPay error:", error);
          toast({
            title: "Lỗi thanh toán",
            description: error.response?.data?.message || "Không thể khởi tạo thanh toán VNPay.",
            variant: "destructive"
          });
          // Redirect to order history if order was created but payment initiation failed
          router.push("/orders");
        }
      } else {
        // COD logic
        if (isBuyNow) {
          sessionStorage.removeItem("buyNowItem");
        } else {
          clearCart();
        }
        toast({
          title: "Đặt hàng thành công",
          description: "Đơn hàng của bạn đã được ghi nhận!"
        });
        router.push("/orders?success=true");
      }
    } catch (error: any) {
      console.error("Place order error:", error);
      toast({
        title: "Lỗi đặt hàng",
        description: error.response?.data?.message || "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (checkoutItems.length === 0 && !isProcessing) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Không có sản phẩm để thanh toán</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Vui lòng chọn sản phẩm trước khi thực hiện thanh toán.
        </p>
        <Link href="/products">
          <Button className="rounded-full px-8 h-12 gradient-hero shadow-lg shadow-primary/20">
            Quay lại mua sắm
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 dark:bg-background flex flex-col">
      <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />

      <main className="flex-1 container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="rounded-full hover:bg-primary/10 hover:text-primary transition-all font-bold"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-2xl font-bold">Thanh toán {isBuyNow ? "(Mua ngay)" : ""}</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Form Info */}
            <div className="lg:col-span-2 space-y-6">
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
                {/* Shipping Info */}
                <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-primary/5 pb-4 border-b">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-primary-foreground" />
                      </div>
                      Thông tin nhận hàng
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-bold">Họ và tên người nhận</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="fullName"
                            name="fullName"
                            placeholder="Nhập họ và tên"
                            className="pl-10 rounded-xl h-11"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-bold">Số điện thoại</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="phone"
                            name="phone"
                            placeholder="Nhập số điện thoại"
                            className="pl-10 rounded-xl h-11"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-bold">Địa chỉ chi tiết</Label>
                      <Input 
                        id="address"
                        name="address"
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        className="rounded-xl h-11"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note" className="text-sm font-bold">Ghi chú (tùy chọn)</Label>
                      <textarea 
                        id="note"
                        name="note"
                        placeholder="Yêu cầu đặc biệt về đơn hàng..."
                        className="w-full flex min-h-[100px] rounded-xl border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        value={formData.note}
                        onChange={handleInputChange}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-primary/5 pb-4 border-b">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-primary-foreground" />
                      </div>
                      Phương thức thanh toán
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <label 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                          formData.paymentMethod === "COD" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold">Thanh toán khi nhận hàng (COD)</p>
                            <p className="text-xs text-muted-foreground">Thanh toán bằng tiền mặt khi giao hàng</p>
                          </div>
                        </div>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="COD" 
                          className="hidden"
                          checked={formData.paymentMethod === "COD"}
                          onChange={() => setFormData(p => ({ ...p, paymentMethod: "COD" }))}
                        />
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          formData.paymentMethod === "COD" ? "border-primary" : "border-border"
                        )}>
                          {formData.paymentMethod === "COD" && <div className="w-2.5 h-2.5 rounded-full bg-primary animate-in fade-in zoom-in" />}
                        </div>
                      </label>

                      <label 
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all",
                          formData.paymentMethod === "VNPAYQR" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden">
                            <QrCode className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold">VNPAY QR</p>
                            <p className="text-xs text-muted-foreground">Thanh toán qua ứng dụng ngân hàng hoặc ví VNPAY</p>
                          </div>
                        </div>
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="VNPAYQR" 
                          className="hidden"
                          checked={formData.paymentMethod === "VNPAYQR"}
                          onChange={() => setFormData(p => ({ ...p, paymentMethod: "VNPAYQR" }))}
                        />
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          formData.paymentMethod === "VNPAYQR" ? "border-primary" : "border-border"
                        )}>
                          {formData.paymentMethod === "VNPAYQR" && <div className="w-2.5 h-2.5 rounded-full bg-primary animate-in fade-in zoom-in" />}
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>

            {/* Right Column: Order Summary */}
            <div className="space-y-6">
              <div className="lg:sticky lg:top-24 space-y-6">
                <Card className="rounded-3xl border-none shadow-lg overflow-hidden">
                  <CardHeader className="bg-primary pb-4">
                    <CardTitle className="text-primary-foreground flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" />
                      Đơn hàng của bạn
                      <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-none">
                        {checkoutItems.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Item List */}
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {checkoutItems.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-border bg-muted/30">
                            {item.image ? (
                              <Image src={item.image} alt={item.name} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{item.name}</p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground">SL: x{item.quantity}</p>
                              <p className="font-bold text-sm text-primary">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-6" />

                    {/* Pricing */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tạm tính</span>
                        <span className="font-bold">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Phí vận chuyển</span>
                        {shippingFee === 0 ? (
                          <span className="text-success font-bold">Miễn phí</span>
                        ) : (
                          <span className="font-bold">{formatPrice(shippingFee)}</span>
                        )}
                      </div>
                      {subtotal < 1000000 && (
                        <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 text-[10px] text-primary font-medium text-center">
                          Mua thêm <span className="font-bold">{formatPrice(1000000 - subtotal)}</span> để được miễn phí vận chuyển
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between items-end pt-2">
                        <span className="font-bold text-base">Tổng cộng</span>
                        <div className="text-right">
                          <p className="text-2xl font-black text-primary leading-tight">{formatPrice(total)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">(Đã bao gồm VAT nếu có)</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 bg-secondary/20 pt-6">
                    <Button 
                      form="checkout-form"
                      type="submit"
                      className="w-full h-14 rounded-2xl text-lg font-black gradient-hero shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        <>
                          XÁC NHẬN ĐẶT HÀNG
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                {/* Trust Badges & Delivery Info */}
                <div className="space-y-3">
                  <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Giao hàng thần tốc</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Nhận hàng trong <span className="text-primary font-bold">2-4 ngày</span> làm việc trên toàn quốc.
                        </p>
                      </div>
                    </div>
                    
                    <Separator className="opacity-50" />
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Kiểm tra khi nhận hàng</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Bạn được quyền đồng kiểm cùng bưu tá trước khi thanh toán.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <p className="text-[11px] font-medium text-primary/80">
                      Sản phẩm được bảo hành chính hãng và hỗ trợ đổi trả trong 15 ngày.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

    </div>
  );
}

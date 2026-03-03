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
  X,
  Plus
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
import { orderApi, paymentApi, cartApi, usersApi } from "@/services/api";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import axios from "axios";

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
  
  const { cartItems, clearCart, couponCode: cartCouponCode, discountAmount: cartDiscountAmount } = useCart();
  const { user, isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();

  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    receiverName: "",
    phone: "",
    city: "",
    district: "",
    ward: "",
    street: "",
    note: "",
    paymentMethod: "COD"
  });
  
  const [provinces, setProvinces] = useState<{ code: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ code: number; name: string }[]>([]);
  const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
  
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>("");
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

  // Sync coupon from cart if not Buy Now
  useEffect(() => {
    if (!isBuyNow && cartCouponCode) {
      setAppliedCouponCode(cartCouponCode);
      setDiscountAmount(cartDiscountAmount || 0);
    }
  }, [isBuyNow, cartCouponCode, cartDiscountAmount]);

  // Address selection state
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Add Address Modal States (Separate from main form)
  const [modalDistricts, setModalDistricts] = useState<{ code: number; name: string }[]>([]);
  const [modalWards, setModalWards] = useState<{ code: number; name: string }[]>([]);
  const [modalSelectedProvinceCode, setModalSelectedProvinceCode] = useState<string>("");
  const [modalSelectedDistrictCode, setModalSelectedDistrictCode] = useState<string>("");

  // Add Address State (from AccountPage logic)
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isSubmittingNewAddress, setIsSubmittingNewAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    receiverName: "",
    phone: "",
    city: "",
    district: "",
    ward: "",
    street: "",
    isDefault: false
  });

  const resetAddressForm = () => {
    setAddressForm({
      receiverName: "",
      phone: "",
      city: "",
      district: "",
      ward: "",
      street: "",
      isDefault: false
    });
    setModalSelectedProvinceCode("");
    setModalSelectedDistrictCode("");
    setModalDistricts([]);
    setModalWards([]);
  };

  const onNewAddressProvinceChange = async (code: string) => {
    const province = provinces.find(p => p.code.toString() === code);
    if (province) {
      setModalSelectedProvinceCode(code);
      setAddressForm(prev => ({
        ...prev,
        city: province.name,
        district: "",
        ward: ""
      }));
      setModalSelectedDistrictCode("");
      setModalWards([]);
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
        setModalDistricts(res.data.districts);
      } catch (err) {}
    }
  };

  const onNewAddressDistrictChange = async (code: string) => {
    const district = modalDistricts.find(d => d.code.toString() === code);
    if (district) {
      setModalSelectedDistrictCode(code);
      setAddressForm(prev => ({
        ...prev,
        district: district.name,
        ward: ""
      }));
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
        setModalWards(res.data.wards);
      } catch (err) {}
    }
  };

  const onSubmitNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNewAddress(true);
    try {
      await usersApi.addAddress(addressForm);
      setFormData(prev => ({
        ...prev,
        receiverName: addressForm.receiverName,
        phone: addressForm.phone,
        city: addressForm.city,
        district: addressForm.district,
        ward: addressForm.ward,
        street: addressForm.street,
      }));
      
      // Sync codes back to main form so selects show correctly
      setSelectedProvinceCode(modalSelectedProvinceCode);
      setSelectedDistrictCode(modalSelectedDistrictCode);
      setDistricts(modalDistricts);
      setWards(modalWards);
      
      setIsAddingNewAddress(false);
      
      // Clear only the address object in the modal
      setAddressForm({
        receiverName: "",
        phone: "",
        city: "",
        district: "",
        ward: "",
        street: "",
        isDefault: false
      });
      
      toast({
        variant: "success",
        title: "Thành công",
        description: "Đã thêm địa chỉ mới vào sổ địa chỉ và áp dụng cho đơn hàng này."
      });
      // Refresh user to update address book list
      refreshUser();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Thao tác thất bại."
      });
    } finally {
      setIsSubmittingNewAddress(false);
    }
  };

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await axios.get("https://provinces.open-api.vn/api/p/");
        setProvinces(res.data);
      } catch (err) {
        console.error("Failed to fetch provinces", err);
      }
    };
    fetchProvinces();
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    if (!selectedProvinceCode) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/p/${selectedProvinceCode}?depth=2`);
        setDistricts(res.data.districts);
      } catch (err) {
        console.error("Failed to fetch districts", err);
      }
    };
    fetchDistricts();
  }, [selectedProvinceCode]);

  // Fetch wards when district changes
  useEffect(() => {
    if (!selectedDistrictCode) {
      setWards([]);
      return;
    }
    const fetchWards = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/d/${selectedDistrictCode}?depth=2`);
        setWards(res.data.wards);
      } catch (err) {
        console.error("Failed to fetch wards", err);
      }
    };
    fetchWards();
  }, [selectedDistrictCode]);

  const onProvinceChange = (code: string) => {
    const province = provinces.find(p => p.code.toString() === code);
    if (province) {
      setSelectedProvinceCode(code);
      setFormData(prev => ({
        ...prev,
        city: province.name,
        district: "", 
        ward: ""
      }));
      setSelectedDistrictCode(""); 
    }
  };

  const onDistrictChange = (code: string) => {
    const district = districts.find(d => d.code.toString() === code);
    if (district) {
      setSelectedDistrictCode(code);
      setFormData(prev => ({
        ...prev,
        district: district.name,
        ward: ""
      }));
    }
  };

  const onWardChange = (code: string) => {
    const ward = wards.find(w => w.code.toString() === code);
    if (ward) {
      setFormData(prev => ({
        ...prev,
        ward: ward.name
      }));
    }
  };

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
    if (user && isFirstLoad) {
      if (user.addresses && user.addresses.length > 0) {
        const defaultAddr = user.addresses.find((a: any) => a.isDefault) || user.addresses[0];
        
        // Pre-fill names immediately
        setFormData(prev => ({
          ...prev,
          receiverName: defaultAddr.receiverName || user.fullName || "",
          phone: defaultAddr.phone || "",
          city: defaultAddr.city || "",
          district: defaultAddr.district || "",
          ward: defaultAddr.ward || "",
          street: defaultAddr.street || "",
        }));

        // Sync codes only once provinces are loaded
        if (provinces.length > 0) {
          selectAddressFromBook(defaultAddr);
          setIsFirstLoad(false);
        }
      } else {
        // No addresses, just fill what we can
        setFormData(prev => ({
          ...prev,
          receiverName: user.fullName || "",
        }));
        setIsFirstLoad(false);
      }
    }
  }, [user, provinces, isFirstLoad]);

  // Handle address selection from book
  const selectAddressFromBook = async (address: any) => {
    setFormData(prev => ({
      ...prev,
      receiverName: address.receiverName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      ward: address.ward,
      street: address.street,
    }));

    // Find codes for the selects
    if (provinces.length > 0) {
      const p = provinces.find(p => p.name.trim().toLowerCase() === address.city.trim().toLowerCase());
      if (p) {
        setSelectedProvinceCode(p.code.toString());
        
        // Fetch districts immediately to find the district code
        try {
          const res = await axios.get(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`);
          const districtsData = res.data.districts;
          setDistricts(districtsData);
          const d = districtsData.find((dist: any) => dist.name.trim().toLowerCase() === address.district.trim().toLowerCase());
          if (d) {
            setSelectedDistrictCode(d.code.toString());
            
            // Also fetch wards immediately to ensure the ward select can find the code
            const wardRes = await axios.get(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`);
            setWards(wardRes.data.wards);
          }
        } catch (err) {
          console.error("Failed to fetch districts/wards in selectAddressFromBook", err);
        }
      }
    }
    setShowAddressBook(false);
  };

  // Coupon handling
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      if (!isBuyNow) {
        // For cart, apply to server-side cart
        const res = await cartApi.applyCoupon(couponCode);
        const cartData = res.data.data || res.data;
        setDiscountAmount(cartData.discountAmount || 0);
        setAppliedCouponCode(couponCode);
      } else {
        // For Buy Now, we'll just send it during order creation
        // but we could call a dummy calculate API if it existed.
        // Since we are not supposed to modify BE, we just allow the user to enter it.
        setAppliedCouponCode(couponCode);
        toast({
          title: "Mã giảm giá đã được ghi nhận",
          description: "Mã sẽ được áp dụng khi đặt hàng.",
          variant: "success"
        });
      }
    } catch (error: any) {
      toast({
        title: "Lỗi áp dụng mã",
        description: getErrorMessage(error, "Mã giảm giá không hợp lệ hoặc đã hết hạn."),
        variant: "destructive"
      });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    if (!isBuyNow) {
      try {
        await cartApi.removeCoupon();
        setDiscountAmount(0);
        setAppliedCouponCode(null);
        setCouponCode("");
      } catch (error) {}
    } else {
      setAppliedCouponCode(null);
      setCouponCode("");
    }
  };



  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shippingFee - discountAmount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutItems.length === 0) return;

    if (!formData.receiverName || !formData.phone || !formData.city || !formData.district || !formData.ward || !formData.street) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ thông tin giao hàng",
        variant: "destructive"
      });
      return;
    }

    const shippingInfo = {
      receiverName: formData.receiverName,
      phone: formData.phone,
      city: formData.city,
      district: formData.district,
      ward: formData.ward,
      street: formData.street
    };

    try {
      setIsProcessing(true);
      
      let orderId = "";

      if (isBuyNow) {
        // Mapping items for Buy Now
        const items = checkoutItems.map(item => {
          const productId = (item.productId || item.id || "").toString();
          const sku = item.sku && item.sku !== "N/A" ? item.sku : "";
          return {
            productId,
            sku: sku || "DEFAULT",
            quantity: item.quantity || 1
          };
        });

        const orderData = {
          items,
          shippingInfo,
          paymentMethod: formData.paymentMethod === "VNPAYQR" ? "vnpay" : "cod",
          couponCode: appliedCouponCode || undefined,
          idempotencyKey: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        };

        const orderResponse = await orderApi.createOrder(orderData);
        orderId = orderResponse.data?._id || orderResponse.data?.id || orderResponse.data?.data?._id || orderResponse.data?.data?.id;
      } else {
        // standard cart checkout
        const checkoutResponse = await cartApi.checkout({
          shippingInfo,
          paymentMethod: formData.paymentMethod === "VNPAYQR" ? "vnpay" : "cod",
          idempotencyKey: `ord_cart_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        });
        orderId = checkoutResponse.data?._id || checkoutResponse.data?.id || checkoutResponse.data?.data?._id || checkoutResponse.data?.data?.id;
      }

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

          // Clear local data before redirect
          if (isBuyNow) {
            sessionStorage.removeItem("buyNowItem");
          } else {
            clearCart();
          }

          window.location.href = url;
          return;
        } catch (error: any) {
          console.error("VNPay error:", error);
          toast({
            title: "Lỗi thanh toán",
            description: error.response?.data?.message || "Không thể khởi tạo thanh toán VNPay.",
            variant: "destructive"
          });
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
          variant: "success",
          title: "Đặt hàng thành công",
          description: "Đơn hàng của bạn đã được ghi nhận!"
        });
        router.push("/orders?success=true");
      }
    } catch (error: any) {
      console.error("Place order error:", error);
      toast({
        title: "Lỗi đặt hàng",
        description: getErrorMessage(error, "Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại."),
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getErrorMessage = (error: any, defaultMsg: string) => {
    const msg = error?.response?.data?.message || error?.response?.data || error?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'object') {
       if (msg.message) return typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message);
       return JSON.stringify(msg);
    }
    return defaultMsg;
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
      <Header />

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
                    <CardTitle className="flex items-center gap-3 text-xl w-full">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="flex-1">Thông tin nhận hàng</span>
                      <div className="flex gap-2">
                        {user?.addresses && user.addresses.length > 0 && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full h-8 text-[11px] font-bold"
                            onClick={() => setShowAddressBook(true)}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Chọn từ sổ địa chỉ
                          </Button>
                        )}
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-full h-8 text-[11px] font-bold"
                          onClick={() => {
                            resetAddressForm();
                            setIsAddingNewAddress(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Thêm địa chỉ mới
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="receiverName" className="text-sm font-bold">Họ và tên người nhận</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="receiverName"
                            name="receiverName"
                            placeholder="Nhập họ và tên"
                            className="pl-10 rounded-xl h-11"
                            value={formData.receiverName}
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

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Tỉnh / Thành phố</Label>
                        <Select onValueChange={onProvinceChange} value={selectedProvinceCode}>
                          <SelectTrigger className="rounded-xl h-11 bg-background">
                            <SelectValue placeholder="Chọn Tỉnh / Thành" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((p) => (
                              <SelectItem key={p.code} value={p.code.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Quận / Huyện</Label>
                        <Select 
                          onValueChange={onDistrictChange} 
                          value={selectedDistrictCode}
                          disabled={!selectedProvinceCode}
                        >
                          <SelectTrigger className="rounded-xl h-11 bg-background">
                            <SelectValue placeholder="Chọn Quận / Huyện" />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map((d) => (
                              <SelectItem key={d.code} value={d.code.toString()}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold">Phường / Xã</Label>
                        <Select 
                          onValueChange={onWardChange} 
                          value={wards.find(w => w.name === formData.ward)?.code.toString() || ""}
                          disabled={!selectedDistrictCode}
                        >
                          <SelectTrigger className="rounded-xl h-11 bg-background">
                            <SelectValue placeholder="Chọn Phường / Xã" />
                          </SelectTrigger>
                          <SelectContent>
                            {wards.map((w) => (
                              <SelectItem key={w.code} value={w.code.toString()}>
                                {w.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="street" className="text-sm font-bold">Địa chỉ chi tiết (Số nhà, tên đường)</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="street"
                          name="street"
                          placeholder="Số nhà, tên đường..."
                          className="pl-10 rounded-xl h-11"
                          value={formData.street}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
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
                            <p className="font-bold">Thanh toán qua ứng dụng ngân hàng hoặc ví VNPAY</p>
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
                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                              {item.sku}
                              {item.attributes && item.attributes.length > 0 && (
                                <> - {item.attributes.map((a: any) => a.value).join(", ")}</>
                              )}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground">SL: x{item.quantity}</p>
                              <div className="text-right">
                                {item.originalPrice && item.originalPrice > item.price && (
                                  <p className="text-[10px] text-muted-foreground line-through mb-0.5">
                                    {formatPrice(item.originalPrice * item.quantity)}
                                  </p>
                                )}
                                <p className="font-bold text-sm text-primary">{formatPrice(item.price * item.quantity)}</p>
                              </div>
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
                      {subtotal < 500000 && (
                        <div className="bg-primary/10 p-2 rounded-lg border border-primary/20 text-[10px] text-primary font-medium text-center">
                          Mua thêm <span className="font-bold">{formatPrice(500000 - subtotal)}</span> để được miễn phí vận chuyển
                        </div>
                      )}
                      <Separator className="my-2" />
                      
                      {/* Coupon Section */}
                      <div className="py-2">
                        <Label className="text-xs font-bold mb-2 block">Mã giảm giá</Label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Nhập mã giảm giá..." 
                            className="h-10 rounded-xl"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            disabled={!!appliedCouponCode}
                          />
                          {!appliedCouponCode ? (
                            <Button 
                              type="button" 
                              className="h-10 rounded-xl px-4 font-bold"
                              onClick={handleApplyCoupon}
                              disabled={isApplyingCoupon || !couponCode}
                            >
                              {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Áp dụng"}
                            </Button>
                          ) : (
                            <Button 
                              type="button" 
                              variant="destructive"
                              className="h-10 rounded-xl px-4 font-bold"
                              onClick={handleRemoveCoupon}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {appliedCouponCode && (
                          <p className="text-[11px] text-success font-bold mt-1 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Đã áp dụng mã: {appliedCouponCode}
                          </p>
                        )}
                      </div>

                      <Separator className="my-2" />

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-bold">Giảm giá</span>
                        <span className="font-bold text-success">-{formatPrice(discountAmount)}</span>
                      </div>

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
                      className="w-full h-14 rounded-2xl text-lg font-black gradient-hero shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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

      {/* Address Book Dialog */}
      <Dialog open={showAddressBook} onOpenChange={setShowAddressBook}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Sổ địa chỉ của bạn
            </DialogTitle>
            <DialogDescription>
              Chọn một địa chỉ đã lưu để nhận hàng nhanh chóng
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {user?.addresses?.map((address: any) => (
              <Card 
                key={address._id} 
                className={cn(
                  "border border-border/50 hover:border-primary/50 transition-all cursor-pointer group rounded-2xl",
                  address.isDefault && "bg-primary/5 border-primary/20"
                )}
                onClick={() => selectAddressFromBook(address)}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{address.receiverName}</span>
                      {address.isDefault && <Badge className="text-[9px] h-4 bg-primary/20 text-primary border-none">Mặc định</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {address.phone}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" /> 
                      <span className="truncate max-w-[300px]">{address.street}, {address.ward}, {address.district}, {address.city}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add New Address Dialog */}
      <Dialog open={isAddingNewAddress} onOpenChange={(open) => {
        if(!open) resetAddressForm();
        setIsAddingNewAddress(open);
      }}>
        <DialogContent className="max-w-xl rounded-3xl">
          <form onSubmit={onSubmitNewAddress}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Thêm địa chỉ giao hàng mới
              </DialogTitle>
              <DialogDescription>
                Địa chỉ này sẽ được lưu vào sổ địa chỉ để sử dụng cho các lần sau
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold">Tên người nhận</Label>
                <Input 
                  required
                  placeholder="Họ và tên"
                  className="rounded-xl"
                  value={addressForm.receiverName}
                  onChange={(e) => setAddressForm({...addressForm, receiverName: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold">Số điện thoại</Label>
                <Input 
                  required
                  placeholder="Số điện thoại"
                  className="rounded-xl"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold">Tỉnh / Thành phố</Label>
                <Select value={modalSelectedProvinceCode} onValueChange={onNewAddressProvinceChange}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Chọn Tỉnh / Thành phố" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.code} value={p.code.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold">Quận / Huyện</Label>
                <Select 
                  value={modalSelectedDistrictCode} 
                  onValueChange={onNewAddressDistrictChange}
                  disabled={!modalSelectedProvinceCode}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Chọn Quận / Huyện" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalDistricts.map((d) => (
                      <SelectItem key={d.code} value={d.code.toString()}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold">Phường / Xã</Label>
                <Select 
                  value={modalWards.find(w => w.name === addressForm.ward)?.code.toString() || ""} 
                  onValueChange={(val) => {
                    const ward = modalWards.find(w => w.code.toString() === val);
                    if (ward) setAddressForm({...addressForm, ward: ward.name});
                  }}
                  disabled={!modalSelectedDistrictCode}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Chọn Phường / Xã" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalWards.map((w) => (
                      <SelectItem key={w.code} value={w.code.toString()}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-bold">Địa chỉ chi tiết (Tòa nhà, số nhà, tên đường)</Label>
                <Input 
                  required
                  placeholder="Số nhà, tên đường..."
                  className="rounded-xl"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddingNewAddress(false)} className="rounded-xl">Hủy</Button>
              <Button type="submit" disabled={isSubmittingNewAddress} className="rounded-xl gradient-hero px-8">
                {isSubmittingNewAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu và Sử dụng"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

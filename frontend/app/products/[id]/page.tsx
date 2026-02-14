"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Minus,
  Plus,
  Check,
  Truck,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { productApi } from "@/services/api";

type Product = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: { url: string; publicId: string }[];
  category: { _id: string; name: string };
  brand: { _id: string; name: string };
  rating: number;
  featured?: boolean;
  numReviews: number;
  specs: { key: string; value: string }[];
  variants: {
    sku: string;
    price: number;
    stock: number;
    attributes: { key: string; value: string }[];
  }[];
  totalStock: number;
};

// Mock reviews for now as backend might not have this ready
const mockReviews = [
  {
    id: 1,
    user: "Nguyễn Văn A",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    rating: 5,
    date: "15/01/2024",
    content:
      "Sản phẩm tuyệt vời! Máy chạy mượt mà, camera chụp rất đẹp. Giao hàng nhanh, đóng gói cẩn thận.",
    helpful: 24,
  },
  {
    id: 2,
    user: "Trần Thị B",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    rating: 4,
    date: "10/01/2024",
    content: "Máy đẹp, hiệu năng tốt. Pin dùng được cả ngày. Chỉ có điều giá hơi cao.",
    helpful: 18,
  },
];

export default function ProductDetailPage() {
  const params = useParams() as { id?: string | string[] };
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(3);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!idParam) return;
      try {
        setLoading(true);
        const res = await productApi.getProductDetail(idParam);
        setProduct(res.data.data || res.data);
      } catch (error) {
        console.error("Failed to fetch product", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin sản phẩm",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [idParam]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentVariant = product?.variants?.[selectedVariantIndex];
  const currentPrice = currentVariant?.price || product?.price || 0;
  const currentStock = currentVariant?.stock || product?.totalStock || 0;
  // Use first image if no variant image logic is implemented yet, or if variant images are implemented they'd be here
  const images = product?.images?.map((img) => img.url) || [];

  const handleAddToCart = () => {
    if (!product) return;
    setCartItemCount((prev) => prev + quantity);
    toast({
      title: "Đã thêm vào giỏ hàng",
      description: `${product.name} x${quantity}`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Navigate to checkout
  };

  const nextImage = () => {
    if (images.length === 0) return;
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Không tìm thấy sản phẩm</h1>
        <Link href="/products">
          <Button>Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  // Calculate discount if originalPrice is available (mock logic for now or from API if added)
  const discountPercent = product.originalPrice
    ? Math.round((1 - currentPrice / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header
        cartItemCount={cartItemCount}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-primary transition-colors">
            Sản phẩm
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Product Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border">
              <AnimatePresence mode="wait">
                {images.length > 0 ? (
                  <motion.img
                    key={selectedImage}
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                      No Image
                   </div>
                )}
              </AnimatePresence>

              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badge */}
              {product.featured && (
                 <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground">HOT</Badge>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-primary font-medium mb-2">{product.brand?.name}</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating || 5) // Fallback to 5 if no rating
                          ? "fill-warning text-warning"
                          : "text-muted"
                      }`}
                    />
                  ))}
                  <span className="ml-1 font-semibold text-foreground">{product.rating || 5}</span>
                </div>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{product.numReviews || 0} đánh giá</span>
                <span className="text-muted-foreground">|</span>
                <span className={currentStock > 0 ? "text-success" : "text-destructive"}>
                  {currentStock > 0 ? "Còn hàng" : "Hết hàng"}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-end gap-3">
              <span className="text-3xl lg:text-4xl font-bold text-primary">
                {formatPrice(currentPrice)}
              </span>
              {/* If we had original price in standard schema, we could show it like this: */}
              {product.originalPrice && product.originalPrice > currentPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                    -{discountPercent}%
                  </Badge>
                </>
              )}
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed line-clamp-3">
                {product.description}
            </p>

            {/* Variants Selection */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3">
                  Tùy chọn:{" "}
                  <span className="font-normal text-muted-foreground">
                    {product.variants[selectedVariantIndex]?.sku}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, index) => {
                     // Try to get a meaningful label from attributes, fallback to SKU or Price
                     const label = variant.attributes.map(a => a.value).join(" / ") || variant.sku;
                     return (
                        <button
                          key={index}
                          onClick={() => setSelectedVariantIndex(index)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedVariantIndex === index
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-foreground"
                          }`}
                        >
                          {label}
                        </button>
                     );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Số lượng</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={currentStock === 0}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => (q < currentStock ? q + 1 : q))}
                    disabled={currentStock === 0 || quantity >= currentStock}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                    {currentStock} sản phẩm có sẵn
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                size="lg" 
                className="flex-1 h-12 text-base" 
                onClick={handleBuyNow}
                disabled={currentStock === 0}
              >
                Mua ngay
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={handleAddToCart}
                disabled={currentStock === 0}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Thêm vào giỏ
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-12 w-12"
                onClick={() => setIsWishlisted(!isWishlisted)}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isWishlisted ? "fill-destructive text-destructive" : ""
                  }`}
                />
              </Button>
              <Button size="icon" variant="outline" className="h-12 w-12">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Miễn phí vận chuyển</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Bảo hành 24 tháng</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">Đổi trả 30 ngày</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="specs" className="mb-12">
          <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0 gap-8">
            <TabsTrigger
              value="specs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3"
            >
              Thông số kỹ thuật
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3"
            >
              Đánh giá ({product.numReviews || 0})
            </TabsTrigger>
             <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3"
            >
              Mô tả chi tiết
            </TabsTrigger>
          </TabsList>

          <TabsContent value="specs" className="mt-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <tbody>
                  {product.specs && product.specs.length > 0 ? (
                      product.specs.map((spec, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-secondary/50" : ""}>
                          <td className="px-6 py-4 font-medium text-foreground w-1/3">
                            {spec.key}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{spec.value}</td>
                        </tr>
                      ))
                  ) : (
                      <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">Chưa có thông số kỹ thuật</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="description" className="mt-6">
              <div className="bg-card rounded-xl border border-border p-6 prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-line">{product.description}</p>
              </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              {/* Rating Summary */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-foreground">{product.rating || 0}</div>
                    <div className="flex items-center gap-1 mt-2 justify-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(product.rating || 0)
                              ? "fill-warning text-warning"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.numReviews || 0} đánh giá
                    </p>
                  </div>
                  {/* Mock logic for chart as we don't have review distribution yet */}
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-sm w-8">{star} ★</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full"
                            style={{ width: `0%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews List - Mocked for now */}
              <div className="space-y-4">
                {mockReviews.map((review) => (
                  <div key={review.id} className="bg-card rounded-xl border border-border p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={review.avatar}
                        alt={review.user}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{review.user}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < review.rating
                                        ? "fill-warning text-warning"
                                        : "text-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">{review.date}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Đã mua hàng
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{review.content}</p>
                        <button className="text-sm text-primary mt-3 hover:underline">
                          Hữu ích ({review.helpful})
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full">
                Xem thêm đánh giá
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

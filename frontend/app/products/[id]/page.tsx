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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

// Mock product data - in real app this would come from API
const productsData = [
  {
    id: 1,
    name: "iPhone 15 Pro Max 256GB",
    price: 34990000,
    originalPrice: 36990000,
    images: [
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&h=800&fit=crop",
    ],
    rating: 4.9,
    reviewCount: 256,
    badge: "hot" as const,
    category: "phone",
    brand: "Apple",
    description:
      "iPhone 15 Pro Max với chip A17 Pro mạnh mẽ nhất, camera 48MP với zoom quang học 5x, khung titan siêu nhẹ và bền bỉ. Trải nghiệm đỉnh cao của công nghệ smartphone.",
    specs: {
      "Màn hình": "6.7 inch Super Retina XDR OLED, 2796 x 1290 pixels, 120Hz ProMotion",
      "Chip": "Apple A17 Pro (3nm)",
      RAM: "8GB",
      "Bộ nhớ": "256GB",
      "Camera sau": "48MP + 12MP + 12MP (Telephoto 5x)",
      "Camera trước": "12MP TrueDepth",
      Pin: "4422 mAh, sạc nhanh 27W",
      "Hệ điều hành": "iOS 17",
      "Kết nối": "5G, Wi-Fi 6E, Bluetooth 5.3, USB-C",
      "Chất liệu": "Khung Titan, mặt kính Ceramic Shield",
    },
    colors: ["Titan Đen", "Titan Trắng", "Titan Xanh", "Titan Tự nhiên"],
    inStock: true,
  },
  {
    id: 2,
    name: "Samsung Galaxy S24 Ultra",
    price: 31990000,
    originalPrice: 33990000,
    images: [
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=800&fit=crop",
    ],
    rating: 4.8,
    reviewCount: 189,
    badge: "new" as const,
    category: "phone",
    brand: "Samsung",
    description:
      "Galaxy S24 Ultra với Galaxy AI tích hợp, S Pen nâng cấp, camera 200MP và khung titan cao cấp. Điện thoại Android mạnh mẽ nhất.",
    specs: {
      "Màn hình": "6.8 inch Dynamic AMOLED 2X, 3088 x 1440 pixels, 120Hz",
      Chip: "Snapdragon 8 Gen 3 for Galaxy",
      RAM: "12GB",
      "Bộ nhớ": "256GB",
      "Camera sau": "200MP + 12MP + 50MP + 10MP",
      "Camera trước": "12MP",
      Pin: "5000 mAh, sạc nhanh 45W",
      "Hệ điều hành": "Android 14, One UI 6.1",
      "Kết nối": "5G, Wi-Fi 7, Bluetooth 5.3",
      "Chất liệu": "Khung Titan, Gorilla Armor",
    },
    colors: ["Titan Đen", "Titan Xám", "Titan Tím", "Titan Vàng"],
    inStock: true,
  },
];

// Mock reviews
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
  {
    id: 3,
    user: "Lê Minh C",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    rating: 5,
    date: "05/01/2024",
    content:
      "Đã sử dụng 1 tuần, rất hài lòng. Đặc biệt ấn tượng với khả năng chụp ảnh trong điều kiện thiếu sáng.",
    helpful: 12,
  },
];

export default function ProductDetailPage() {
  const params = useParams() as { id?: string | string[] };
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = Number(idParam);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(3);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const product =
    productsData.find((p) => p.id === id) || productsData[0];

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

  const handleAddToCart = () => {
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
    setSelectedImage((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
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
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* Product Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>

              {/* Navigation arrows */}
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

              {/* Badge */}
              {product.badge && (
                <Badge
                  className={`absolute top-4 left-4 ${
                    product.badge === "hot"
                      ? "bg-destructive text-destructive-foreground"
                      : product.badge === "new"
                      ? "bg-success text-success-foreground"
                      : "bg-warning text-warning-foreground"
                  }`}
                >
                  {product.badge === "hot"
                    ? "HOT"
                    : product.badge === "new"
                    ? "MỚI"
                    : `GIẢM ${discountPercent}%`}
                </Badge>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
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
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-primary font-medium mb-2">{product.brand}</p>
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
                        i < Math.floor(product.rating)
                          ? "fill-warning text-warning"
                          : "text-muted"
                      }`}
                    />
                  ))}
                  <span className="ml-1 font-semibold text-foreground">{product.rating}</span>
                </div>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{product.reviewCount} đánh giá</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-success">Còn hàng</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-end gap-3">
              <span className="text-3xl lg:text-4xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
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
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>

            {/* Color Selection */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">
                Màu sắc:{" "}
                <span className="font-normal text-muted-foreground">
                  {product.colors[selectedColor]}
                </span>
              </h3>
              <div className="flex gap-2">
                {product.colors.map((color, index) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(index)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      selectedColor === index
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Số lượng</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button size="lg" className="flex-1 h-12 text-base" onClick={handleBuyNow}>
                Mua ngay
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={handleAddToCart}
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
              Đánh giá ({product.reviewCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="specs" className="mt-6">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <tbody>
                  {Object.entries(product.specs).map(([key, value], index) => (
                    <tr key={key} className={index % 2 === 0 ? "bg-secondary/50" : ""}>
                      <td className="px-6 py-4 font-medium text-foreground w-1/3">
                        {key}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              {/* Rating Summary */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-foreground">{product.rating}</div>
                    <div className="flex items-center gap-1 mt-2 justify-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < Math.floor(product.rating)
                              ? "fill-warning text-warning"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.reviewCount} đánh giá
                    </p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-sm w-8">{star} ★</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full"
                            style={{ width: `${star === 5 ? 70 : star === 4 ? 20 : 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews List */}
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

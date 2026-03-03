"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
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
  Box,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { productApi, reviewApi, cartApi } from "@/services/api";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";

type Product = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: { url: string; publicId: string }[];
  category: { _id: string; name: string; isActive?: boolean };
  brand: { _id: string; name: string; isActive?: boolean };
  averageRating: number;
  featured?: boolean;
  reviewCount: number;
  specs: { key: string; value: string }[];
  variants: {
    sku: string;
    price: number;
    discountPercentage?: number;
    stock: number;
    image?: { url: string; publicId: string };
    attributes: { key: string; value: string }[];
  }[];
  totalStock: number;
};

// Removed mock reviews

export default function ProductDetailPage() {
  const params = useParams() as { id?: string | string[] };
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const reviewsLimit = 10;
  
  const [isSubmittingReview, setIsSubmittingReview] = useState(false); // Maybe keep this if needed for a modal later, but the user wants it GONE from here. Actually, the user says 'bỏ phần đánh giá ở trang chi tiết' so let's remove it.
  
  const scrollGallery = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
        const scrollAmount = 300;
        scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    }
  };

  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!idParam) return;
      try {
        setLoading(true);
        const res = await productApi.getProductDetail(idParam);
        const data = res.data.data || res.data;
        
        // Safety check for active category/brand or product status
        if (!data || (data.category && data.category.isActive === false) || (data.brand && data.brand.isActive === false)) {
            toast({
              title: "Thông báo",
              description: "Sản phẩm hiện không khả dụng!",
              variant: "destructive",
            });
            router.push("/products");
            return;
        }

        setProduct(data);
      } catch (error) {
        console.error("Failed to fetch product", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin sản phẩm",
          variant: "destructive",
        });
        router.push("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [idParam, router]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!product?._id) return;
      try {
        setReviewsLoading(true);
        const res = await reviewApi.getReviewsByProduct(product._id, { page: reviewsPage, limit: reviewsLimit });
        const data = res.data;
        if (reviewsPage === 1) {
          setReviews(data.data || []);
        } else {
          setReviews((prev) => [...prev, ...(data.data || [])]);
        }
        setReviewsTotal(data.total || 0);
      } catch (error) {
        console.error("Failed to fetch reviews", error);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [product?._id, reviewsPage]);

  const handleLoadMoreReviews = () => {
    if (reviews.length < reviewsTotal) {
      setReviewsPage((prev) => prev + 1);
    }
  };


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
  const basePrice = currentVariant?.price ?? product?.price ?? 0;
  const currentDiscount = currentVariant?.discountPercentage || 0;
  const currentPrice = basePrice * (1 - currentDiscount / 100);
  const currentStock = currentVariant !== undefined ? currentVariant.stock : (product?.totalStock || 0);
  const images = product?.images?.map((img) => img.url) || [];

  // Cap quantity when stock changes or exceeds limit
  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) {
      setQuantity(currentStock);
    } else if (currentStock === 0) {
      setQuantity(1);
    }
  }, [currentStock, quantity]);

  useEffect(() => {
    const variantImg = product?.variants?.[selectedVariantIndex]?.image?.url;
    if (variantImg) {
      setActiveImageUrl(variantImg);
    } else {
      setActiveImageUrl(null);
    }
  }, [selectedVariantIndex, product]);

  // Group attributes for cleaner UI selection
  const attributeGroups = useMemo<Record<string, string[]>>(() => {
    if (!product?.variants) return {};
    const groups: Record<string, string[]> = {};
    product.variants.forEach(variant => {
      variant.attributes.forEach(attr => {
        if (!groups[attr.key]) groups[attr.key] = [];
        if (!groups[attr.key].includes(attr.value)) {
          groups[attr.key].push(attr.value);
        }
      });
    });
    return groups;
  }, [product]);

  // Track selected attributes to find matching variant
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Initialize selectedAttributes from selectedVariantIndex
  useEffect(() => {
    if (product?.variants?.[selectedVariantIndex]) {
      const initialAttrs: Record<string, string> = {};
      product.variants[selectedVariantIndex].attributes.forEach(attr => {
        initialAttrs[attr.key] = attr.value;
      });
      setSelectedAttributes(initialAttrs);
    }
  }, [product, selectedVariantIndex]);

  const handleAttributeSelect = (key: string, value: string) => {
    const newSelected = { ...selectedAttributes, [key]: value };
    setSelectedAttributes(newSelected);

    // Find a variant that matches this new selection exactly
    const exactMatchIndex = product?.variants.findIndex(variant => {
      // Check if this variant has all the currently selected attributes
      return Object.entries(newSelected).every(([sKey, sValue]) => 
        variant.attributes.some(attr => attr.key === sKey && attr.value === sValue)
      );
    });

    if (exactMatchIndex !== undefined && exactMatchIndex !== -1) {
      setSelectedVariantIndex(exactMatchIndex);
    } else {
      // If no exact match (e.g. this color doesn't exist for this storage), 
      // find the first variant that at least matches the attribute just clicked
      const fallbackIndex = product?.variants.findIndex(variant => 
        variant.attributes.some(attr => attr.key === key && attr.value === value)
      );
      if (fallbackIndex !== undefined && fallbackIndex !== -1) {
        setSelectedVariantIndex(fallbackIndex);
        
        // Update selectedAttributes to match the fallback variant's actual attributes
        const fallbackVariant = product?.variants[fallbackIndex];
        const updatedAttrs: Record<string, string> = {};
        fallbackVariant?.attributes.forEach(attr => {
          updatedAttrs[attr.key] = attr.value;
        });
        setSelectedAttributes(updatedAttrs);
      }
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    const effectiveSku = currentVariant?.sku && currentVariant.sku !== "N/A" ? currentVariant.sku : product._id;
    const cartId = `${product._id}-${effectiveSku}`;
    
    addItem({
      id: cartId,
      productId: product._id,
      name: product.name,
      sku: effectiveSku,
      price: currentPrice,
      originalPrice: basePrice,
      discountPercentage: currentDiscount,
      quantity: quantity,
      image: currentVariant?.image?.url || images[0] || "",
      attributes: currentVariant?.attributes || [],
    });

    toast({
      variant: "success",
      title: "Đã thêm vào giỏ hàng",
      description: `${product.name} x${quantity}`,
    });
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const handleBuyNow = () => {
    if (!product) return;

    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Thông báo",
        description: "Vui lòng đăng nhập để tiếp tục thanh toán",
      });
      const currentPath = window.location.pathname + window.location.search;
      router.push(`/auth?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    const effectiveSku = currentVariant?.sku && currentVariant.sku !== "N/A" ? currentVariant.sku : product._id;
    const buyNowItem = {
      id: `${product._id}-${effectiveSku}`,
      productId: product._id,
      name: product.name,
      sku: effectiveSku,
      price: currentPrice,
      originalPrice: basePrice,
      discountPercentage: currentDiscount,
      quantity: quantity,
      image: currentVariant?.image?.url || images[0] || "",
      attributes: currentVariant?.attributes || [],
    };
    sessionStorage.setItem("buyNowItem", JSON.stringify(buyNowItem));
    router.push('/checkout?buyNow=true');
  };

  const nextImage = () => {
    if (images.length === 0) return;
    setActiveImageUrl(null);
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setActiveImageUrl(null);
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

  const discountPercent = currentVariant?.discountPercentage || (product?.originalPrice
    ? Math.round((1 - currentPrice / product.originalPrice) * 100)
    : 0);

  const oldPriceToDisplay = currentVariant?.discountPercentage ? basePrice : product?.originalPrice;

  return (
    <div className="min-h-screen bg-background">
      <Header
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
          <div className="space-y-6">
            <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] border border-border/60 bg-white shadow-xl shadow-muted/10 group">
              <AnimatePresence mode="wait">
                {images.length > 0 || activeImageUrl ? (
                  <motion.img
                    key={activeImageUrl || selectedImage}
                    src={activeImageUrl || images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain p-12 group-hover:scale-105 transition-transform duration-700 ease-out"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                   <div className="flex h-full items-center justify-center text-muted-foreground/30 bg-muted/20">
                      <Box className="h-20 w-20" />
                   </div>
                )}
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.preventDefault(); prevImage(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/10 text-white backdrop-blur-md transition-all hover:bg-black/20 opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); nextImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/10 text-white backdrop-blur-md transition-all hover:bg-black/20 opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              <div className="absolute top-3 right-3 z-20 flex flex-row items-center gap-2">
                 {product.featured && (
                   <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 gap-1 px-3 py-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      HOT
                   </Badge>
                 )}
                 {discountPercent > 0 && (
                   <Badge className="bg-destructive text-destructive-foreground gap-1 px-3 py-1">
                      -{discountPercent}%
                   </Badge>
                 )}
              </div>
            </div>

            {images.length > 1 && (
                <div className="relative group/gallery px-1 py-4">
                  <div 
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-3 py-1 scroll-smooth no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setSelectedImage(idx);
                                setActiveImageUrl(null);
                            }}
                            className={`relative w-[106px] h-[106px] min-w-[106px] rounded-xl overflow-hidden border-2 transition-all duration-300 shrink-0 flex items-center justify-center ${
                                (!activeImageUrl && selectedImage === idx) || activeImageUrl === img 
                                    ? "border-primary shadow-md ring-2 ring-primary/20" 
                                    : "border-border/40 bg-white hover:border-primary/40"
                            }`}
                        >
                            <img
                                src={img}
                                alt={`${product.name} - ${idx + 1}`}
                                className="w-[85%] h-[85%] object-cover"
                            />
                        </button>
                    ))}
                  </div>
                  
                  <div className="absolute top-1/2 -translate-y-1/2 -left-2 -right-2 flex justify-between pointer-events-none">
                    <button 
                        onClick={(e) => { e.preventDefault(); scrollGallery('left'); }}
                        className="p-2 rounded-full bg-white shadow-xl border border-border/40 text-foreground pointer-events-auto hover:bg-primary hover:text-white transition-all opacity-0 group-hover/gallery:opacity-100 -translate-x-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={(e) => { e.preventDefault(); scrollGallery('right'); }}
                        className="p-2 rounded-full bg-white shadow-xl border border-border/40 text-foreground pointer-events-auto hover:bg-primary hover:text-white transition-all opacity-0 group-hover/gallery:opacity-100 translate-x-2"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
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

              <div className="flex items-center gap-4 flex-wrap">
                {product.reviewCount > 0 && (
                  <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border/40">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(product.averageRating || 0)
                              ? "fill-warning text-warning"
                              : "text-muted/40"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-black text-foreground">{product.averageRating}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                   {product.reviewCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-border"></div>}
                   <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-[10px]">{product.reviewCount || 0} Đánh giá</span>
                </div>

                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-border"></div>
                   <Badge variant="outline" className={`rounded-full px-4 py-1 font-black text-[10px] uppercase tracking-wider ${currentStock > 0 ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                      {currentStock > 0 ? "Còn hàng" : "Hết hàng"}
                   </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-3xl lg:text-4xl font-bold text-primary">
                {formatPrice(currentPrice)}
              </span>
              {oldPriceToDisplay && oldPriceToDisplay > currentPrice && (
                <>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(oldPriceToDisplay)}
                  </span>
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                    -{discountPercent}%
                  </Badge>
                </>
              )}
            </div>


            {product.variants && product.variants.length > 0 && Object.keys(attributeGroups).length > 0 && (
              <div className="space-y-6">
                {Object.entries(attributeGroups).map(([key, values]) => (
                  <div key={key}>
                    <h3 className="font-semibold text-foreground mb-3">{key}</h3>
                    <div className="flex flex-wrap gap-3">
                      {values.map((value) => {
                        const isSelected = selectedAttributes[key] === value;
                        // For beauty like the image, check if this is "Màu sắc" or something with images
                        const variantWithThisAttr = product.variants.find(v => 
                           v.attributes.some(a => a.key === key && a.value === value)
                        );
                        const variantImage = (variantWithThisAttr as any)?.image?.url;

                        return (
                          <button
                            key={value}
                            onClick={() => handleAttributeSelect(key, value)}
                            className={`relative min-w-[80px] p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-primary/50 bg-card"
                            }`}
                          >
                            {variantImage && key === "Màu sắc" && (
                              <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                                <img src={variantImage} alt={value} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex flex-col items-start">
                              <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {value}
                              </span>
                            </div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

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

            <div className="flex gap-3">
              <Button 
                size="lg" 
                className="flex-1 h-12 text-base" 
                onClick={handleBuyNow}
                disabled={currentStock === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  "Mua ngay"
                )}
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
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    variant: "success",
                    title: "Thành công",
                    description: "Đã sao chép liên kết thành công",
                  });
                }}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

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
              Đánh giá ({product.reviewCount || 0})
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
              <div className="bg-card rounded-xl border border-border p-6 w-full overflow-hidden">
                  <div 
                      className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed break-words [word-break:break-word] hyphens-auto"
                      dangerouslySetInnerHTML={{ __html: product.description || "Chưa có mô tả chi tiết cho sản phẩm này." }}
                  />
              </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-8 mb-10">
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="text-center md:border-r md:border-border md:pr-10">
                <div className="text-6xl font-black text-foreground tracking-tighter mb-2">{product.averageRating || 0}</div>
                <div className="flex items-center gap-1 justify-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i < Math.floor(product.averageRating || 0)
                          ? "fill-warning text-warning"
                          : "text-muted/40"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  {product.reviewCount || 0} Đánh giá
                </p>
              </div>
              <div className="flex-1 w-full space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter(r => Math.round(r.rating) === star).length;
                  const total = reviews.length || 1;
                  const percentage = Math.round((count / total) * 100);
                  
                  return (
                    <div key={star} className="flex items-center gap-4 group">
                      <div className="flex items-center gap-1 w-12 shrink-0">
                        <span className="text-sm font-black text-foreground">{star}</span>
                        <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                      </div>
                      <div className="flex-1 h-2.5 bg-secondary/50 rounded-full overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="absolute inset-y-0 left-0 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                        />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground w-10 text-right group-hover:text-foreground transition-colors">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

              <div className="space-y-4">
              
                {reviewsLoading && reviewsPage === 1 ? (
                  <div className="flex flex-col items-center justify-center p-20 gap-4 bg-card rounded-2xl border border-dashed">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-sm font-bold text-muted-foreground animate-pulse">Đang tải phản hồi khách hàng...</p>
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center p-20 text-muted-foreground bg-card rounded-2xl border border-dashed">
                    <Box className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">Chưa có đánh giá nào cho sản phẩm này.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <AnimatePresence mode="popLayout">
                      {reviews.map((review: any, idx: number) => (
                        <motion.div 
                          key={review._id} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative shrink-0">
                               <img
                                src={review.userId?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.userId?._id}`}
                                alt={review.userId?.fullName || "Người dùng"}
                                className="w-14 h-14 rounded-2xl object-cover bg-secondary p-0.5 border border-border/50 group-hover:border-primary/50 transition-colors"
                              />
                              <div className="absolute -bottom-1 -right-1 bg-success text-white rounded-full p-1 border-2 border-white shadow-sm">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div>
                                  <h4 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">{review.userId?.fullName || "Người dùng ẩn danh"}</h4>
                                  <div className="flex items-center gap-3 mt-1 text-xs">
                                    <div className="flex items-center">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-3.5 h-3.5 ${
                                            i < (review.rating || 5)
                                              ? "fill-warning text-warning"
                                              : "text-muted/40"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-muted-foreground font-medium">
                                      {new Date(review.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-[10px] font-black uppercase tracking-wider h-fit py-1 px-3">
                                  Đã mua hàng
                                </Badge>
                              </div>
                              <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{review.comment || review.content}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {reviews.length < reviewsTotal && (
                <Button variant="outline" className="w-full mt-4" onClick={handleLoadMoreReviews} disabled={reviewsLoading}>
                  {reviewsLoading ? "Đang tải..." : "Xem thêm đánh giá"}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

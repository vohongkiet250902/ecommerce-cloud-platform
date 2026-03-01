"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Package,
  Tag,
  Layers,
  Calendar,
  Box,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Info,
  DollarSign,
  ShoppingCart,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

import { productApi, categoryApi, brandApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AddProductModal from "../AddProductModal";

/* ================= TYPES ================= */

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: any;
  brandId: any;
  category?: { _id: string; name: string };
  brand?: { _id: string; name: string };
  images: {
    url: string;
    publicId: string;
    _id: string;
  }[];
  variants: {
    sku: string;
    price: number;
    discountPercentage: number;
    finalPrice: number;
    stock: number;
    attributes: {
      key: string;
      value: string;
    }[];
    image: { url: string; publicId: string } | null;
    status: string;
  }[];
  specs: {
    key: string;
    value: string;
  }[];
  totalStock: number;
  status: string;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Category {
  _id: string;
  name: string;
}

interface Brand {
  _id: string;
  name: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const productId = params.id as string;

  const scrollGallery = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
        const scrollAmount = 300;
        scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    }
  };

  /* ================= FETCH DATA ================= */
  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    try {
      setLoading(true);
      const productRes = await productApi.getProduct(productId);
      const productData = productRes.data.data || productRes.data;
      
      if (!productData) throw new Error("Product data not found");
      
      setProduct(productData);

      // Extract IDs safely
      const catId = productData.categoryId && typeof productData.categoryId === "object" 
        ? productData.categoryId?._id 
        : productData.categoryId || productData.category?._id;
        
      const bId = productData.brandId && typeof productData.brandId === "object" 
        ? productData.brandId?._id 
        : productData.brandId || productData.brand?._id;

      // Parallel fetching for performance and non-blocking errors
      const getCategoryInfo = async () => {
        if (!catId) {
          if (productData.category) setCategory(productData.category);
          return;
        }
        try {
          const categoriesRes = await categoryApi.getCategories();
          const categories = categoriesRes.data.data || categoriesRes.data;
          
          if (Array.isArray(categories)) {
            const findCategory = (cats: any[], id: string): any => {
                for (const cat of cats) {
                    if (cat._id === id) return cat;
                    if (cat.children && Array.isArray(cat.children)) {
                        const found = findCategory(cat.children, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            setCategory(findCategory(categories, catId));
          } else if (productData.category) {
            setCategory(productData.category);
          }
        } catch (e) {
          console.error("Failed to fetch categories", e);
          if (productData.category) setCategory(productData.category);
        }
      };

      const getBrandInfo = async () => {
        // 1. Check if brand is already populated in productData
        const possibleBrand = (typeof productData.brandId === "object" && productData.brandId?.name) 
          ? productData.brandId 
          : productData.brand;
          
        if (possibleBrand && possibleBrand.name) {
          setBrand(possibleBrand);
          return;
        }

        if (!bId) return;

        try {
          // 2. Try fetching all brands (more reliable as it's used in the list page)
          const brandsRes = await brandApi.getBrands();
          const brandsData = brandsRes.data.data || brandsRes.data;
          
          if (Array.isArray(brandsData)) {
            const found = brandsData.find((b: any) => b._id === bId);
            if (found) {
              setBrand(found);
              return;
            }
          }

          // 3. Fallback to single brand fetch
          const brandRes = await brandApi.getBrand(bId);
          const brandFinal = brandRes.data?.data || brandRes.data;
          if (brandFinal) setBrand(brandFinal);
        } catch (e) {
          console.error("Failed to fetch brand info", e);
        }
      };

      // Run both parallel
      await Promise.allSettled([getCategoryInfo(), getBrandInfo()]);

    } catch (error) {
      console.error("Failed to fetch product", error);
      toast({
        variant: "destructive",
        title: "Lỗi tải dữ liệu",
        description: "Không thể lấy thông tin sản phẩm. Vui lòng kiểm tra lại kết nối.",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextImage = () => {
    if (product?.images?.length) {
      setActiveImage((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product?.images?.length) {
      setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId, toast]);

  /* ================= HELPERS ================= */
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 gap-1 px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Đang bán
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20 gap-1 px-3 py-1">
            <XCircle className="h-3.5 w-3.5" />
            Ngừng bán
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 gap-1 px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            Nháp
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32 rounded-full" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-4">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            <div className="flex gap-8">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-[70vh] flex-col items-center justify-center gap-6"
      >
        <div className="p-6 rounded-full bg-destructive/10">
            <AlertTriangle className="h-16 w-16 text-destructive" />
        </div>
        <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Không tìm thấy sản phẩm</h2>
            <p className="text-muted-foreground">Sản phẩm có thể đã bị xóa hoặc đường dẫn không đúng.</p>
        </div>
        <Button size="lg" onClick={() => router.push("/admin/products")} className="rounded-full px-8">
          <ArrowLeft className="mr-2 h-5 w-5" />
          Quay lại danh sách
        </Button>
      </motion.div>
    );
  }

  const minPrice = product.variants && product.variants.length > 0 
    ? Math.min(...product.variants.map(v => v.price)) 
    : 0;
  const maxPrice = product.variants && product.variants.length > 0 
    ? Math.max(...product.variants.map(v => v.price)) 
    : 0;

  const finalPrices = product.variants && product.variants.length > 0
    ? product.variants.map(v => v.price * (1 - (v.discountPercentage || 0) / 100))
    : [0];
  const minFinal = Math.min(...finalPrices);
  const maxFinal = Math.max(...finalPrices);
  const hasDiscount = product.variants?.some(v => (v.discountPercentage || 0) > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumbs & Header Actions */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4 pt-4"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
            <Link href="/admin/products" className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
                <Package className="h-4 w-4" />
                Sản phẩm
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="truncate max-w-[200px] font-semibold text-foreground">{product.name}</span>
        </div>
        
        <div className="flex items-center gap-3">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-full h-9 px-4 gap-2 border-border/60 transition-all hover:border-primary hover:text-primary hover:bg-primary/5 group/back" 
                            onClick={() => router.push("/admin/products")}
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-1" />
                            Quay lại
                        </Button>
                    </TooltipTrigger>
                </Tooltip>
            </TooltipProvider>

            <Button size="sm" className="rounded-full h-9 px-5 gap-2 shadow-sm font-semibold" onClick={() => setIsModalOpen(true)}>
                <Edit className="h-4 w-4" />
                Chỉnh sửa
            </Button>
        </div>
      </motion.div>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Photos - lg:span-5 */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 space-y-6"
        >
            <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] border border-border/60 bg-white shadow-xl shadow-muted/10 group">
                {product.images?.[activeImage] ? (
                    <Image
                        src={product.images[activeImage].url}
                        alt={product.name}
                        fill
                        className="object-contain p-12 group-hover:scale-105 transition-transform duration-700 ease-out"
                        priority
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30 bg-muted/20">
                        <Box className="h-20 w-20" />
                    </div>
                )}
                
                {/* Navigation Buttons */}
                {product.images && product.images.length > 1 && (
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
                
                {/* Image overlay decorations */}
                <div className="absolute top-3 right-3 z-20 flex flex-row items-center gap-2">
                    {product.isFeatured && (
                      <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 gap-1 px-3 py-1">
                        <Tag className="h-3.5 w-3.5" />
                        Nổi bật
                      </Badge>
                    )}
                    {getStatusBadge(product.status)}
                </div>
            </div>

            {product.images && product.images.length > 1 && (
                <div className="relative group/gallery px-1 py-4">
                  <div 
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto gap-3 py-1 scroll-smooth no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {product.images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveImage(idx)}
                            className={cn(
                                "relative min-w-[110px] aspect-square overflow-hidden rounded-2xl border-2 transition-all duration-300 shrink-0",
                                activeImage === idx 
                                    ? "border-primary shadow-lg ring-4 ring-primary/10" 
                                    : "border-border/40 bg-white hover:border-primary/40"
                            )}
                        >
                            <Image
                                src={img.url}
                                alt={`${product.name} - ${idx + 1}`}
                                fill
                                className="object-cover p-2"
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

            {/* Quick Stats moved from right column */}
            <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center justify-center p-3 rounded-[1.5rem] bg-indigo-50/30 border border-indigo-100/50 text-indigo-700 shadow-sm">
                    <Calendar className="h-4 w-4 mb-1.5 opacity-60" />
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 text-center">Khởi tạo</span>
                    <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">
                        {product.createdAt ? format(new Date(product.createdAt), "dd/MM/yyyy") : "---"}
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-[1.5rem] bg-emerald-50/30 border border-emerald-100/50 text-emerald-700 shadow-sm overflow-hidden">
                    <Tag className="h-4 w-4 mb-1.5 opacity-60" />
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 text-center">Danh mục</span>
                    <span className="text-[10px] font-semibold mt-0.5 truncate w-full text-center px-1">{category?.name || "N/A"}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-[1.5rem] bg-amber-50/30 border border-amber-100/50 text-amber-700 shadow-sm overflow-hidden">
                    <Box className="h-4 w-4 mb-1.5 opacity-60" />
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 text-center">Thương hiệu</span>
                    <span className="text-[10px] font-semibold mt-0.5 truncate w-full text-center px-1">{brand?.name || "N/A"}</span>
                </div>
            </div>
        </motion.div>

        {/* Right: Info - lg:span-6 */}
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-6 space-y-8"
        >
            <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {product.name}
                </h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-1">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giá sản phẩm</p>
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-primary">
                            {minFinal === maxFinal ? formatPrice(minFinal) : `${formatPrice(minFinal)} - ${formatPrice(maxFinal)}`}
                        </span>
                        {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through opacity-70">
                                {minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`}
                            </span>
                        )}
                    </div>
                </div>
                
                <Separator orientation="vertical" className="h-10 hidden sm:block" />

                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tồn kho tổng</p>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-xl font-bold",
                            product.totalStock > 20 ? "text-emerald-500" : product.totalStock > 0 ? "text-amber-500" : "text-rose-500"
                        )}>
                            {product.totalStock}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">sản phẩm</span>
                    </div>
                </div>
            </div>

            <Card className="border-border/40 shadow-xl shadow-muted/5 overflow-hidden bg-background border-none outline-1 outline-border/20">
                <CardContent className="p-0">
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="w-full justify-start rounded-none h-14 bg-transparent border-b border-border/40 px-6 gap-8">
                            <TabsTrigger value="details" className="relative h-full px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all font-semibold">
                                <Info className="h-4 w-4 mr-2" />
                                Tổng quan
                            </TabsTrigger>
                            <TabsTrigger value="variants" className="relative h-full px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all font-semibold">
                                <Layers className="h-4 w-4 mr-2" />
                                Biến thể
                            </TabsTrigger>
                            <TabsTrigger value="history" className="relative h-full px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all font-semibold">
                                <Clock className="h-4 w-4 mr-2" />
                                Lịch sử thay đổi
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="p-6">
                            <TabsContent value="details" className="mt-0 focus-visible:ring-0">
                                <div className="space-y-6">
                                    {/* Specs section integrated into overview */}
                                    {product.specs && product.specs.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                Thông số kỹ thuật
                                            </h4>
                                            <div className="rounded-2xl border border-border/40 overflow-hidden bg-white">
                                                <Table>
                                                    <TableHeader className="bg-muted/30">
                                                        <TableRow className="border-border/40 hover:bg-muted/30">
                                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 w-1/3">Thông số</TableHead>
                                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Giá trị</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {product.specs.map((spec, i) => (
                                                            <TableRow key={i} className="border-border/40 hover:bg-muted/10 transition-colors">
                                                                <TableCell className="text-xs font-semibold text-muted-foreground">{spec.key}</TableCell>
                                                                <TableCell className="text-xs font-medium text-foreground">{spec.value}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            Mô tả chi tiết
                                        </h4>
                                        <div className="p-6 rounded-[2rem] border border-border/60 bg-white/30 backdrop-blur-sm shadow-inner shadow-muted/5 w-full overflow-hidden">
                                            <div 
                                                className="prose prose-sm max-w-none text-muted-foreground leading-relaxed break-words [word-break:break-word] hyphens-auto"
                                                dangerouslySetInnerHTML={{ __html: product.description || "Chưa có mô tả chi tiết cho sản phẩm này." }}
                                            />
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="variants" className="mt-0 focus-visible:ring-0">
                                <div className="rounded-2xl border border-border/40 overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="border-border/40 hover:bg-muted/30">
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 w-[60px]">Ảnh</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">SKU</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Phân loại</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-right">Giá</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-right">Kho</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {product.variants.map((v, i) => (
                                                <TableRow key={i} className="border-border/40 hover:bg-muted/10 transition-colors">
                                                    <TableCell>
                                                        <div className="h-10 w-10 relative rounded-md overflow-hidden bg-muted border border-border">
                                                            {v.image?.url ? (
                                                                <Image 
                                                                    src={v.image.url} 
                                                                    alt={v.sku} 
                                                                    fill 
                                                                    className="object-cover" 
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground uppercase opacity-50">N/A</div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{v.sku}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {v.attributes.map((attr, idx) => (
                                                                <Badge key={idx} variant="secondary" className="text-[9px] h-5 rounded-md font-semibold border-none">
                                                                    {attr.value}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-sm">
                                                        <div className="flex flex-col items-end">
                                                            {v.discountPercentage > 0 ? (
                                                                <>
                                                                    <span className="text-xs text-muted-foreground line-through opacity-70">
                                                                        {formatPrice(v.price)}
                                                                    </span>
                                                                    <span className="font-bold text-primary">
                                                                        {formatPrice(v.price * (1 - v.discountPercentage / 100))}
                                                                    </span>
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 bg-red-50 text-red-600 border-red-100 mt-1">
                                                                        -{v.discountPercentage}%
                                                                    </Badge>
                                                                </>
                                                            ) : (
                                                                <span className="font-bold text-primary">
                                                                    {formatPrice(v.price)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={cn(
                                                            "text-xs font-semibold",
                                                            v.stock > 0 ? "text-emerald-500" : "text-rose-500"
                                                        )}>
                                                            {v.stock > 0 ? v.stock : "Hết"}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 focus-visible:ring-0">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card className="bg-muted/30 border-none shadow-none">
                                            <CardContent className="pt-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                        <Calendar className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ngày tạo</p>
                                                        <p className="text-lg font-bold text-foreground">
                                                            {product.createdAt ? format(new Date(product.createdAt), "dd/MM/yyyy", { locale: vi }) : "N/A"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {product.createdAt ? format(new Date(product.createdAt), "HH:mm:ss", { locale: vi }) : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-muted/30 border-none shadow-none">
                                            <CardContent className="pt-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                        <Clock className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Cập nhật cuối</p>
                                                        <p className="text-lg font-bold text-foreground">
                                                            {product.updatedAt ? format(new Date(product.updatedAt), "dd/MM/yyyy", { locale: vi }) : "N/A"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {product.updatedAt ? format(new Date(product.updatedAt), "HH:mm:ss", { locale: vi }) : ""}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

        </motion.div>
      </div>

      <AddProductModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={product}
        onSuccess={() => {
            fetchData();
            setIsModalOpen(false);
        }}
      />
    </div>
  );
}

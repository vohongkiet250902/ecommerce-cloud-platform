"use client";

import { useEffect, useState } from "react";
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
    stock: number;
    attributes: {
      key: string;
      value: string;
    }[];
    image: string | null;
    status: string;
  }[];
  specs: {
    key: string;
    value: string;
  }[];
  totalStock: number;
  status: string;
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

  const productId = params.id as string;

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
      console.error("Error fetching product detail:", error);
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: "Không thể tải thông tin sản phẩm",
      });
    } finally {
      setLoading(false);
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
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-background" />
                </div>
            </div>
            <p className="text-muted-foreground animate-pulse font-medium">Đang tải dữ liệu...</p>
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
                         <Button variant="outline" size="sm" className="rounded-full h-9 px-4 gap-2 border-border/60 hover:bg-muted" onClick={() => router.push("/admin/products")}>
                            <ArrowLeft className="h-4 w-4" />
                            Quay lại
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Về danh sách</TooltipContent>
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
            className="lg:col-span-5 space-y-6"
        >
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-border/60 bg-white shadow-xl shadow-muted/20 group">
                {product.images?.[activeImage] ? (
                    <Image
                        src={product.images[activeImage].url}
                        alt={product.name}
                        fill
                        className="object-contain p-8 group-hover:scale-105 transition-transform duration-700 ease-out"
                        priority
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground/30 bg-muted/20">
                        <Box className="h-20 w-20" />
                    </div>
                )}
                
                {/* Image overlay decorations */}
                <div className="absolute top-6 right-6">
                    {getStatusBadge(product.status)}
                </div>
            </div>

            {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4 p-2">
                    {product.images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveImage(idx)}
                            className={cn(
                                "relative aspect-square overflow-hidden rounded-2xl border-2 transition-all duration-300",
                                activeImage === idx 
                                    ? "border-primary shadow-lg ring-4 ring-primary/10" 
                                    : "border-transparent bg-muted/20 hover:border-border hover:bg-muted/40"
                            )}
                        >
                            <Image
                                src={img.url}
                                alt={`${product.name} - ${idx + 1}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </motion.div>

        {/* Right: Info - lg:span-7 */}
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-7 space-y-8"
        >
            <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {product.name}
                </h1>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-1">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giá sản phẩm</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-primary">
                            {minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`}
                        </span>
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
                            <TabsTrigger value="specs" className="relative h-full px-0 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all font-semibold">
                                <Box className="h-4 w-4 mr-2" />
                                Thông số
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="p-6">
                            <TabsContent value="details" className="mt-0 focus-visible:ring-0">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/50">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU Gốc</p>
                                            <p className="font-mono text-sm">{product.variants?.[0]?.sku || "N/A"}</p>
                                        </div>
                                        <div className="space-y-1 p-3 rounded-xl bg-muted/20 border border-border/50">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Đường dẫn (Slug)</p>
                                            <p className="text-sm truncate font-medium text-muted-foreground">{product.slug}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            Mô tả chi tiết
                                        </h4>
                                        <div 
                                            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed bg-white/50 p-5 rounded-2xl border border-border/40"
                                            dangerouslySetInnerHTML={{ __html: product.description || "Chưa có mô tả chi tiết cho sản phẩm này." }}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="variants" className="mt-0 focus-visible:ring-0">
                                <div className="rounded-2xl border border-border/40 overflow-hidden bg-white">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow className="border-border/40 hover:bg-muted/30">
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">SKU</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10">Phân loại</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-right">Giá</TableHead>
                                                <TableHead className="text-[10px] font-bold uppercase tracking-wider h-10 text-right">Kho</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {product.variants.map((v, i) => (
                                                <TableRow key={i} className="border-border/40 hover:bg-muted/10 transition-colors">
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
                                                    <TableCell className="text-right font-bold text-primary text-sm">
                                                        {formatPrice(v.price)}
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

                            <TabsContent value="specs" className="mt-0 focus-visible:ring-0">
                                {product.specs && product.specs.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-1">
                                        {product.specs.map((spec, i) => (
                                            <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0 group">
                                                <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{spec.key}</span>
                                                <span className="text-sm font-medium text-foreground">{spec.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                        <AlertTriangle className="h-10 w-10 mb-2" />
                                        <p className="text-sm font-medium">Chưa có thông số kỹ thuật</p>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-[1.5rem] bg-indigo-50/50 border border-indigo-100/50 text-indigo-700 shadow-sm">
                    <Calendar className="h-5 w-5 mb-2 opacity-60" />
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Khởi tạo</span>
                    <span className="text-[11px] font-semibold mt-1">
                        {product.createdAt ? format(new Date(product.createdAt), "dd/MM/yyyy") : "---"}
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-[1.5rem] bg-emerald-50/50 border border-emerald-100/50 text-emerald-700 shadow-sm">
                    <Tag className="h-5 w-5 mb-2 opacity-60" />
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Danh mục</span>
                    <span className="text-[11px] font-semibold mt-1 truncate max-w-full text-center">{category?.name || "N/A"}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-[1.5rem] bg-amber-50/50 border border-amber-100/50 text-amber-700 shadow-sm">
                    <Box className="h-5 w-5 mb-2 opacity-60" />
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Thương hiệu</span>
                    <span className="text-[11px] font-semibold mt-1 truncate max-w-full text-center">{brand?.name || "N/A"}</span>
                </div>
            </div>
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

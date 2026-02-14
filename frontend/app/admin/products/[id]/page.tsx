"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
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

import { productApi, categoryApi, brandApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

/* ================= TYPES ================= */

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brandId: string;
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

  const productId = params.id as string;

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productRes = await productApi.getProduct(productId);
        const productData = productRes.data.data || productRes.data;
        setProduct(productData);

        // Fetch category and brand details if needed
        // Assuming we have APIs for single category/brand or we can just fetch all and find
        // Optimally, the product response should populate these or we fetch them separately
        // Here we'll fetch list and find, or use specific endpoints if available.
        // Based on api.ts, we have getCategories and getBrands. 
        // Ideally we should use getCategory(id) and getBrand(id) if available.
        // api.ts has getBrand(id) but categoryApi only has getCategories. 
        // Let's just fetch all for now or rely on what we have.
        // Actually, let's try to fetch specific ones if possible, otherwise list.
        
        if (productData.categoryId) {
            // Note: api.ts might not have getCategory by ID for public/admin easily exposed as single
            // let's check api.ts again via memory or context. 
            // reviewed api.ts: categoryApi has updateCategory, deleteCategory, createCategory, getCategories.
            // It does NOT have getCategory(id). 
            // However, getCategories returns a tree. We can flatten and find.
            const categoriesRes = await categoryApi.getCategories();
            const categories = categoriesRes.data.data || categoriesRes.data;
            
            const findCategory = (cats: any[], id: string): any => {
                for (const cat of cats) {
                    if (cat._id === id) return cat;
                    if (cat.children) {
                        const found = findCategory(cat.children, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            setCategory(findCategory(categories, productData.categoryId));
        }

        if (productData.brandId) {
             const brandRes = await brandApi.getBrand(productData.brandId);
             setBrand(brandRes.data.data || brandRes.data);
        }

      } catch (error) {
        toast({
          variant: "destructive",
          title: "❌ Lỗi",
          description: "Không thể tải thông tin sản phẩm",
        });
        // router.push("/admin/products");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId, toast, router]);

  /* ================= HELPERS ================= */
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 hover:bg-green-600">Đang bán</Badge>;
      case "inactive":
        return <Badge variant="destructive">Ngừng bán</Badge>;
      case "draft":
        return <Badge variant="secondary">Nháp</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /* ================= RENDER ================= */
  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-semibold">Không tìm thấy sản phẩm</h2>
        <Button onClick={() => router.push("/admin/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/admin/products")}
            className="h-10 w-10 border-muted-foreground/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Package className="h-4 w-4" />
              <span>SKU: {product.variants?.[0]?.sku || "N/A"}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="flex items-center gap-1">
                {getStatusBadge(product.status)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions could go here, e.g. Edit button */}
         {/* Note: Edit functionality is modal-based in the list view currently. 
             If we strictly follow the list view pattern, we might need a way to open that modal here, 
             or we just link back to list. For now simple view is fine. 
         */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" />
                Thông tin chung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium text-muted-foreground">Tên sản phẩm</label>
                    <p className="text-base font-medium">{product.name}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-muted-foreground">Slug</label>
                    <p className="text-base font-medium text-muted-foreground">{product.slug}</p>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-muted-foreground">Danh mục</label>
                    <div className="flex items-center gap-2 mt-1">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{category?.name || "---"}</span>
                    </div>
                 </div>
                 <div>
                    <label className="text-sm font-medium text-muted-foreground">Thương hiệu</label>
                    <div className="flex items-center gap-2 mt-1">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{brand?.name || "---"}</span>
                    </div>
                 </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Mô tả</label>
                <div 
                    className="prose prose-sm max-w-none text-muted-foreground bg-muted/30 p-4 rounded-md"
                    dangerouslySetInnerHTML={{ __html: product.description || "Chưa có mô tả" }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Variants / Pricing */}
          <Card>
            <CardHeader>
               <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Biến thể & Giá
              </CardTitle>
              <CardDescription>
                Danh sách các phiên bản của sản phẩm
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Thuộc tính</TableHead>
                            <TableHead>Giá bán</TableHead>
                            <TableHead>Tồn kho</TableHead>
                            {/* <TableHead>Trạng thái</TableHead> */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {product.variants.map((variant, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{variant.sku}</TableCell>
                                <TableCell>
                                    {variant.attributes.map(attr => (
                                        <Badge key={attr.key} variant="outline" className="mr-1">
                                            {attr.value}
                                        </Badge>
                                    ))}
                                </TableCell>
                                <TableCell className="font-semibold text-primary">
                                    {formatPrice(variant.price)}
                                </TableCell>
                                <TableCell>
                                    {variant.stock > 0 ? (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>{variant.stock}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-red-600">
                                            <XCircle className="h-4 w-4" />
                                            <span>Hết hàng</span>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
          
           {/* Specifications */}
           {product.specs && product.specs.length > 0 && (
            <Card>
                <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Box className="h-4 w-4 text-primary" />
                    Thông số kỹ thuật
                </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            {product.specs.map((spec, index) => (
                                <TableRow key={index}>
                                    <TableCell className="w-1/3 font-medium text-muted-foreground">{spec.key}</TableCell>
                                    <TableCell>{spec.value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
           )}
        </div>

        {/* Right Column - Images & Meta */}
        <div className="space-y-6">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hình ảnh</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                    {product.images && product.images.length > 0 ? (
                        <>
                            {/* Main Image */}
                            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                                <Image
                                    src={product.images[0].url}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                            {/* Gallery Grid */}
                            {product.images.length > 1 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {product.images.slice(1).map((img, idx) => (
                                        <div key={idx} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                                            <Image
                                                src={img.url}
                                                alt={`${product.name} - ${idx + 1}`}
                                                fill
                                                className="object-cover hover:scale-110 transition-transform"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                            Không có hình ảnh
                        </div>
                    )}
                </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Lịch sử
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                 <span className="text-muted-foreground">Ngày tạo</span>
                 <span className="font-medium">
                    {product.createdAt ? format(new Date(product.createdAt), "dd/MM/yyyy HH:mm") : "N/A"}
                 </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-sm">
                 <span className="text-muted-foreground">Cập nhật lần cuối</span>
                 <span className="font-medium">
                    {product.updatedAt ? format(new Date(product.updatedAt), "dd/MM/yyyy HH:mm") : "N/A"}
                 </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

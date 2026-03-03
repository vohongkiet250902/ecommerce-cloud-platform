"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
  X,
  AlertTriangle,
  Filter,
  Search,
} from "lucide-react";
import { useForm } from "react-hook-form";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import AddProductModal from "./AddProductModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { productApi, categoryApi, brandApi } from "@/services/api";
import { cn } from "@/lib/utils";

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
    discountPercentage: number;
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
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  filterableAttributes: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  children: Category[];
  id: string;
}

interface Brand {
  _id: string;
  name: string;
}

interface ProductFormData {
  name: string;
  categoryId: string;
  brandId: string;
  price: string;
  salePrice: string;
  stock: string;
  status: "active" | "inactive" | "draft";
}

/* ================= CONFIG ================= */

const statusConfig = {
  active: {
    label: "Đang bán",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Ngừng bán",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  draft: {
    label: "Nháp",
    className: "bg-warning/10 text-warning border-warning/20",
  },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

const validateFormData = (
  data: ProductFormData,
): { valid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.length < 3) {
    errors.name = "Tên sản phẩm phải có ít nhất 3 ký tự";
  }

  if (!data.categoryId) {
    errors.categoryId = "Vui lòng chọn danh mục";
  }

  if (!data.brandId) {
    errors.brandId = "Vui lòng chọn thương hiệu";
  }

  const price = parseFloat(data.price);
  if (isNaN(price) || price < 0) {
    errors.price = "Giá không hợp lệ";
  }

  if (data.salePrice) {
    const salePrice = parseFloat(data.salePrice);
    if (isNaN(salePrice) || salePrice < 0) {
      errors.salePrice = "Giá sale không hợp lệ";
    }
  }

  const stock = parseFloat(data.stock);
  if (isNaN(stock) || stock < 0) {
    errors.stock = "Tồn kho không hợp lệ";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/* ================= PAGE ================= */

const flattenCategories = (categories: Category[], level = 0): (Category & { level: number })[] => {
  return categories.flatMap((category) => [
    { ...category, level },
    ...(category.children ? flattenCategories(category.children, level + 1) : []),
  ]);
};

export default function ProductsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Status toggle states
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusToToggle, setStatusToToggle] = useState<{ product: Product; status: string } | null>(null);

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");

  const [catSearch, setCatSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesStatus =
        statusFilter === "all" ? true : product.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" 
          ? true 
          : (typeof product.categoryId === "object" 
              ? (product.categoryId as any)?._id === categoryFilter 
              : product.categoryId === categoryFilter || (product as any).category?._id === categoryFilter);
      const matchesBrand =
        brandFilter === "all"
          ? true
          : (typeof product.brandId === "object"
              ? (product.brandId as any)?._id === brandFilter
              : product.brandId === brandFilter || (product as any).brand?._id === brandFilter);

      return matchesStatus && matchesCategory && matchesBrand;
    });
  }, [products, statusFilter, categoryFilter, brandFilter]);


  const form = useForm<ProductFormData>({
    defaultValues: {
      name: "",
      categoryId: "",
      brandId: "",
      price: "0",
      salePrice: "",
      stock: "0",
      status: "draft",
    },
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes, brandsRes] = await Promise.all([
          productApi.getAdminProducts(),
          categoryApi.getAdminCategories(),
          brandApi.getAdminBrands(),
        ]);
        setProducts(productsRes.data.data || productsRes.data);
        setCategories(categoriesRes.data.data || categoriesRes.data);
        setBrands(brandsRes.data.data || brandsRes.data);
      } catch {
        toast({
          variant: "destructive",
          title: "❌ Lỗi",
          description: "Không thể tải dữ liệu sản phẩm",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Handle add product
  const onSubmit = async (data: ProductFormData) => {
    const validation = validateFormData(data);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const submitData = {
        name: data.name,
        categoryId: data.categoryId,
        brandId: data.brandId,
        price: parseFloat(data.price),
        salePrice: data.salePrice ? parseFloat(data.salePrice) : undefined,
        stock: parseFloat(data.stock),
        status: data.status,
      };

      await productApi.createProduct(submitData);

      toast({
        title: "Thành công",
        description: "Đã thêm sản phẩm mới thành công.",
      });

      setIsModalOpen(false);
      form.reset();

      // Reload product list
      const res = await productApi.getAdminProducts();
      setProducts(res.data.data || res.data);
    } catch {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể thêm sản phẩm. Vui lòng thử lại sau.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete product (open modal)
  const handleDelete = useCallback((product: Product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  }, [toast]);

  // Handle status toggle
  const handleToggleStatus = (product: Product, newStatus: string) => {
    if (newStatus === "inactive") {
      setStatusToToggle({ product, status: newStatus });
      setStatusConfirmOpen(true);
      return;
    }
    executeToggleStatus(product, newStatus);
  };

  const executeToggleStatus = async (product: Product, newStatus: string) => {
    try {
      await productApi.updateProduct(product._id, { status: newStatus });
      setStatusConfirmOpen(false);
      setStatusToToggle(null);
      
      toast({
        variant: "success",
        title: "Thành công",
        description: `Sản phẩm "${product.name}" hiện đã ${newStatus === "active" ? "được kích hoạt" : "ngừng hoạt động"}.`
      });
      // Refresh list
      const res = await productApi.getAdminProducts();
      setProducts(res.data.data || res.data);
    } catch (error: any) {
      setStatusConfirmOpen(false);
      setStatusToToggle(null);
      toast({
        variant: "destructive",
        title: "Cập nhật thất bại",
        description: error.response?.data?.message || "Không thể cập nhật trạng thái sản phẩm.",
      });
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setIsDeleting(true);
      
      // Double-check stock before deleting
      const totalStock = productToDelete.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || productToDelete.totalStock || 0;
      
      if (totalStock > 0) {
        setDeleteConfirmOpen(false); // Close modal first
        toast({
          variant: "destructive",
          title: "Không thể xóa sản phẩm",
          description: `Sản phẩm này còn ${totalStock} sản phẩm trong kho. Bạn chỉ có thể ngừng kinh doanh sản phẩm này thay vì xóa.`,
        });
        return;
      }
      
      await productApi.deleteProduct(productToDelete._id);
      setDeleteConfirmOpen(false); // Close modal on success
      
      toast({
        variant: "success",
        title: "Thành công",
        description: "Đã xóa sản phẩm thành công.",
      });

      setProducts((prev) => prev.filter((p) => p._id !== productToDelete._id));
    } catch (error: any) {
      setDeleteConfirmOpen(false); // Close modal on error
      const errorMsg = error.response?.data?.message || "Không thể xóa sản phẩm";
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMsg,
      });
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Sản phẩm",
        render: (product: Product) => (
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 relative rounded-md overflow-hidden bg-muted border border-border shrink-0">
               {product.images?.[0]?.url ? (
                   <Image 
                      src={product.images[0].url} 
                      alt={product.name} 
                      fill 
                      className="object-cover" 
                   />
               ) : (
                   <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Img</div>
               )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="font-medium line-clamp-1 text-foreground">{product.name}</p>
                {product.isFeatured && (
                  <Badge className="bg-amber-500 text-[10px] h-5 px-2.5 text-white border-none shrink-0 font-semibold shadow-sm">
                    Nổi bật
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "category",
        header: "Danh mục",
        render: (product: Product) => {
          // Extract IDs robustly (might be populated objects or IDs)
          const catId = typeof product.categoryId === "object" 
            ? (product.categoryId as any)?._id 
            : product.categoryId || (product as any).category?._id;
            
          const bId = typeof product.brandId === "object" 
            ? (product.brandId as any)?._id 
            : product.brandId || (product as any).brand?._id;

          const category = flatCategories.find((c) => c._id === catId);
          const brand = brands.find((b) => b._id === bId);

          return (
            <div>
              <p className="font-medium">{category?.name || (product as any).category?.name || "N/A"}</p>
              <p className="text-sm text-muted-foreground">
                {brand?.name || (product as any).brand?.name || "N/A"}
              </p>
            </div>
          );
        },
      },
      {
        key: "price",
        header: "Giá",
        render: (product: Product) => {
          const variants = product.variants || [];
          if (variants.length === 0) return <p className="font-semibold text-muted-foreground italic">N/A</p>;
          
          const prices = variants.map((v) => v.price);
          const finalPrices = variants.map((v) => v.price * (1 - (v.discountPercentage || 0) / 100));
          
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const minFinal = Math.min(...finalPrices);
          const maxFinal = Math.max(...finalPrices);

          const hasDiscount = variants.some(v => v.discountPercentage > 0);

          return (
            <div className="flex flex-col">
              <p className="font-bold text-primary">
                {minFinal === maxFinal 
                  ? formatPrice(minFinal) 
                  : `${formatPrice(minFinal)} - ${formatPrice(maxFinal)}`}
              </p>
              {hasDiscount && (
                <p className="text-xs text-muted-foreground line-through opacity-70">
                   {minPrice === maxPrice 
                    ? formatPrice(minPrice) 
                    : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: "stock",
        header: "Tồn kho",
        render: (product: Product) => (
          <span
            className={cn(
              "font-medium",
              (product.totalStock || 0) === 0
                ? "text-destructive"
                : (product.totalStock || 0) < 10
                  ? "text-warning"
                  : "text-foreground",
            )}
          >
            {product.totalStock || 0}
          </span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (product: Product) => {
          const status = product.status || "draft";
          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
          return (
            <Badge
              variant="outline"
              className={cn("font-medium", config.className)}
            >
              {config.label}
            </Badge>
          );
        },
      },
      {
        key: "actions",
        header: "",
        render: (product: Product) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="transition-all"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dropdown-content">
              <DropdownMenuItem onClick={() => router.push(`/admin/products/${product._id}`)}>
                <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSelectedProduct(product);
                setIsModalOpen(true);
              }}>
                <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => handleToggleStatus(product, product.status === "active" ? "inactive" : "active")}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      product.status === "active" ? "bg-success" : "bg-destructive",
                    )}
                  />
                  {product.status === "active" ? "Ngừng hoạt động" : "Kích hoạt lại"}
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(product)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Xóa sản phẩm
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleDelete, flatCategories, brands, router],

  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sản phẩm</h1>
          <p className="text-muted-foreground">Quản lý danh sách sản phẩm</p>
        </div>
        <Button onClick={() => {
          setSelectedProduct(null);
          setIsModalOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tổng sản phẩm</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-foreground">{products.length}</span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Đang bán</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-success">
              {products.filter((p) => p.status === "active").length}
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Hết hàng</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-destructive">
              {products.filter((p) => p.totalStock === 0).length}
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Tồn kho thấp</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-warning">
              {products.filter((p) => p.totalStock > 0 && p.totalStock < 10).length}
            </span>
          </div>
        </div>
      </div>



      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          data={filteredProducts}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Tìm kiếm sản phẩm..."
          pageSize={10}
          filterNode={
            <div className="flex items-center gap-2">
              {/* Category Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed bg-background/50 border-border/40">
                    <Filter className="h-4 w-4" />
                    <span>
                      {categoryFilter === "all" 
                        ? "Tất cả danh mục" 
                        : flatCategories.find(c => c._id === categoryFilter)?.name || "Danh mục"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-content w-64 max-h-[400px] flex flex-col p-0">
                  <div className="p-2 border-b sticky top-0 bg-popover z-10">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Tìm danh mục..."
                        value={catSearch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCatSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="pl-7 h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[280px] py-1">
                    <DropdownMenuItem onClick={() => {
                      setCategoryFilter("all");
                      setCatSearch("");
                    }}>
                      Tất cả danh mục
                    </DropdownMenuItem>
                    {flatCategories
                      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                      .map((c) => (
                        <DropdownMenuItem 
                          key={c._id} 
                          onClick={() => {
                            setCategoryFilter(c._id);
                            setCatSearch("");
                          }}
                          className={cn(c.level > 0 && "text-muted-foreground")}
                        >
                          <span className="flex items-center">
                            {Array.from({ length: c.level }).map((_, i) => (
                              <span key={i} className="w-4 h-px" />
                            ))}
                            {c.level > 0 && <span className="mr-1 text-xs opacity-50">└─</span>}
                            {c.name}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    {flatCategories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).length === 0 && (
                      <div className="py-2 text-center text-xs text-muted-foreground italic">
                        Không tìm thấy danh mục
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Brand Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed bg-background/50 border-border/40">
                    <Filter className="h-4 w-4" />
                    <span>
                      {brandFilter === "all" 
                        ? "Tất cả thương hiệu" 
                        : brands.find(b => b._id === brandFilter)?.name || "Thương hiệu"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-content w-64 max-h-[400px] flex flex-col p-0">
                  <div className="p-2 border-b sticky top-0 bg-popover z-10">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Tìm thương hiệu..."
                        value={brandSearch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrandSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="pl-7 h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[280px] py-1">
                    <DropdownMenuItem onClick={() => {
                      setBrandFilter("all");
                      setBrandSearch("");
                    }}>
                      Tất cả thương hiệu
                    </DropdownMenuItem>
                    {brands
                      .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                      .map((b) => (
                        <DropdownMenuItem key={b._id} onClick={() => {
                          setBrandFilter(b._id);
                          setBrandSearch("");
                        }}>
                          {b.name}
                        </DropdownMenuItem>
                      ))}
                    {brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).length === 0 && (
                      <div className="py-2 text-center text-xs text-muted-foreground italic">
                        Không tìm thấy thương hiệu
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed bg-background/50 border-border/40">
                    <Filter className="h-4 w-4" />
                    <span>
                      {statusFilter === "all" 
                        ? "Tất cả trạng thái" 
                        : statusFilter === "active" ? "Đang bán" : "Ngừng bán"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dropdown-content">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    Tất cả trạng thái
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                    Đang bán
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>
                    Ngừng bán
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />
      )}

      <AddProductModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={selectedProduct} // Pass selected product
        onSuccess={async (newProduct) => {
          const res = await productApi.getAdminProducts();
          setProducts(res.data.data || res.data);
          setSelectedProduct(null);
        }}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận xóa
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground">
              Bạn có chắc chắn muốn xóa sản phẩm{" "}
              <span className="font-bold text-foreground">
                {productToDelete?.name}
              </span>
              ?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="border-dashed bg-background/50 border-border/40"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa sản phẩm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Confirm Dialog */}
      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận ngừng hoạt động
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-foreground font-medium">
              Bạn có chắc chắn muốn ngừng hoạt động sản phẩm{" "}
              <span className="font-bold text-primary">
                "{statusToToggle?.product.name}"
              </span>?
            </p>
            <div className="p-4 bg-muted/50 rounded-lg border border-warning/20 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-warning text-lg leading-none">⚠️</span>
                <span>
                  Sản phẩm này sẽ không còn hiển thị với khách hàng trên cửa hàng. Bạn có thể kích hoạt lại bất cứ lúc nào.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusConfirmOpen(false);
                setStatusToToggle(null);
              }}
              className="border-dashed bg-background/50 border-border/40"
            >
              Hủy
            </Button>
            <Button
              variant="default"
              onClick={() => {
                if (statusToToggle) {
                  executeToggleStatus(statusToToggle.product, statusToToggle.status);
                }
              }}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

const flattenCategories = (categories: Category[]): Category[] => {
  return categories.flatMap((category) => [
    category,
    ...(category.children ? flattenCategories(category.children) : []),
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

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesStatus =
        statusFilter === "all" ? true : product.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" ? true : product.categoryId === categoryFilter;

      return matchesStatus && matchesCategory;
    });
  }, [products, statusFilter, categoryFilter]);


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
          productApi.getProducts(),
          categoryApi.getCategories(),
          brandApi.getBrands(),
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
        title: "✅ Thành công",
        description: "Thêm sản phẩm thành công",
      });

      setIsModalOpen(false);
      form.reset();

      // Reload product list
      const res = await productApi.getProducts();
      setProducts(res.data.data || res.data);
    } catch {
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: "Không thể thêm sản phẩm",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete product (open modal)
  const handleDelete = useCallback((product: Product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  }, []);

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      setIsDeleting(true);
      await productApi.deleteProduct(productToDelete._id);
      
      toast({
        title: "✅ Thành công",
        description: "Xóa sản phẩm thành công",
        variant: "success",
      });

      setProducts((prev) => prev.filter((p) => p._id !== productToDelete._id));
      setDeleteConfirmOpen(false);
    } catch {
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: "Không thể xóa sản phẩm",
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
            <div>
              <p className="font-medium line-clamp-1 text-foreground">{product.name}</p>
            </div>
          </div>
        ),
      },
      {
        key: "category",
        header: "Danh mục",
        render: (product: Product) => {
          const category = flatCategories.find(
            (c) => c._id === product.categoryId,
          );
          const brand = brands.find((b) => b._id === product.brandId);

          return (
            <div>
              <p>{category?.name || "N/A"}</p>
              <p className="text-sm text-muted-foreground">
                {brand?.name || "N/A"}
              </p>
            </div>
          );
        },
      },
      {
        key: "price",
        header: "Giá",
        render: (product: Product) => {
          const price = product.variants?.[0]?.price || 0;
          return <p className="font-semibold">{formatPrice(price)}</p>;
        },
      },
      {
        key: "stock",
        header: "Tồn kho",
        render: (product: Product) => (
          <span
            className={cn(
              "font-medium",
              product.totalStock === 0
                ? "text-destructive"
                : product.totalStock < 10
                  ? "text-warning"
                  : "text-foreground",
            )}
          >
            {product.totalStock}
          </span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (product: Product) => {
          const config = statusConfig[product.status as keyof typeof statusConfig] || statusConfig.draft;
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
              <Button variant="ghost" size="icon">
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
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDelete(product)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Xóa
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

      {/* Filters */}
       <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive" | "draft")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent className="dropdown-content">
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang bán</SelectItem>
            <SelectItem value="inactive">Ngừng bán</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent className="dropdown-content">
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {flatCategories.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                    <span style={{ paddingLeft: `${(c as any).level * 10}px` }}>
                        {c.name}
                    </span>
                </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        />
      )}

      <AddProductModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={selectedProduct} // Pass selected product
        onSuccess={async (newProduct) => {
          const res = await productApi.getProducts();
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
    </div>
  );
}

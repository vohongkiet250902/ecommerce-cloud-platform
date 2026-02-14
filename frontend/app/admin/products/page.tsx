"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";

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
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories],
  );


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

  // Handle delete product
  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

      try {
        await productApi.deleteProduct(id);
        toast({
          title: "✅ Thành công",
          description: "Xóa sản phẩm thành công",
        });

        setProducts((prev) => prev.filter((p) => p._id !== id));
      } catch {
        toast({
          variant: "destructive",
          title: "❌ Lỗi",
          description: "Không thể xóa sản phẩm",
        });
      }
    },
    [toast],
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Sản phẩm",
        render: (product: Product) => (
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-sm text-muted-foreground">{product._id}</p>
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
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(product._id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleDelete, flatCategories, brands],

  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sản phẩm</h1>
          <p className="text-muted-foreground">Quản lý danh sách sản phẩm</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
          <p className="text-2xl font-bold text-foreground">
            {products.length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Đang bán</p>
          <p className="text-2xl font-bold text-success">
            {products.filter((p) => p.status === "active").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Hết hàng</p>
          <p className="text-2xl font-bold text-destructive">
            {products.filter((p) => p.totalStock === 0).length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tồn kho thấp</p>
          <p className="text-2xl font-bold text-warning">
            {products.filter((p) => p.totalStock > 0 && p.totalStock < 10).length}
          </p>
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          data={products}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Tìm kiếm sản phẩm..."
        />
      )}

      <AddProductModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categories={categories}
        brands={brands}
        onSuccess={async () => {
          const res = await productApi.getProducts();
          setProducts(res.data.data || res.data);
        }}
      />
    </div>
  );
}

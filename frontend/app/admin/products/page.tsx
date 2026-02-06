"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Eye, MoreHorizontal, Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { productApi, categoryApi, brandApi } from "@/services/api";
import { cn } from "@/lib/utils";

/* ================= TYPES ================= */

interface Product {
  _id: string;
  name: string;
  category: {
    _id: string;
    name: string;
  };
  brand: {
    _id: string;
    name: string;
  };
  price: number;
  salePrice?: number;
  stock: number;
  status: "active" | "inactive" | "draft";
  image?: string;
}

interface Category {
  _id: string;
  name: string;
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
  data: ProductFormData
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

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
    [toast]
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
        render: (product: Product) => (
          <div>
            <p>{product.category?.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">
              {product.brand?.name || "N/A"}
            </p>
          </div>
        ),
      },
      {
        key: "price",
        header: "Giá",
        render: (product: Product) =>
          product.salePrice ? (
            <div>
              <p className="font-semibold text-destructive">
                {formatPrice(product.salePrice)}
              </p>
              <p className="text-sm line-through text-muted-foreground">
                {formatPrice(product.price)}
              </p>
            </div>
          ) : (
            <p className="font-semibold">{formatPrice(product.price)}</p>
          ),
      },
      {
        key: "stock",
        header: "Tồn kho",
        render: (product: Product) => (
          <span
            className={cn(
              "font-medium",
              product.stock === 0
                ? "text-destructive"
                : product.stock < 10
                  ? "text-warning"
                  : "text-foreground"
            )}
          >
            {product.stock}
          </span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (product: Product) => {
          const config = statusConfig[product.status];
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
    [handleDelete]
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
          <p className="text-2xl font-bold text-foreground">{products.length}</p>
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
            {products.filter((p) => p.stock === 0).length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tồn kho thấp</p>
          <p className="text-2xl font-bold text-warning">
            {products.filter((p) => p.stock > 0 && p.stock < 10).length}
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
      
      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">Thêm sản phẩm mới</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  form.reset();
                  setFormErrors({});
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên sản phẩm</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập tên sản phẩm" {...field} />
                        </FormControl>
                        {formErrors.name && (
                          <p className="text-sm text-destructive">
                            {formErrors.name}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Danh mục</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                          >
                            <option value="">-- Chọn danh mục --</option>
                            {categories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        {formErrors.categoryId && (
                          <p className="text-sm text-destructive">
                            {formErrors.categoryId}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Brand */}
                  <FormField
                    control={form.control}
                    name="brandId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thương hiệu</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                          >
                            <option value="">-- Chọn thương hiệu --</option>
                            {brands.map((brand) => (
                              <option key={brand._id} value={brand._id}>
                                {brand.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        {formErrors.brandId && (
                          <p className="text-sm text-destructive">
                            {formErrors.brandId}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá gốc (đ)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        {formErrors.price && (
                          <p className="text-sm text-destructive">
                            {formErrors.price}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sale Price */}
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giá sale (đ)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0 (tùy chọn)"
                            {...field}
                          />
                        </FormControl>
                        {formErrors.salePrice && (
                          <p className="text-sm text-destructive">
                            {formErrors.salePrice}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Stock */}
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tồn kho</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        {formErrors.stock && (
                          <p className="text-sm text-destructive">
                            {formErrors.stock}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trạng thái</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                          >
                            <option value="draft">Nháp</option>
                            <option value="active">Đang bán</option>
                            <option value="inactive">Ngừng bán</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setIsModalOpen(false);
                        form.reset();
                        setFormErrors({});
                      }}
                      disabled={isSubmitting}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Thêm
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

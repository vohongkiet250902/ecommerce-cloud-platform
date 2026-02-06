"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, MoreHorizontal, Loader2, X } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { brandApi } from "@/services/api"; 
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/* ================= TYPES ================= */

interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  isActive: boolean;
}

/* ================= CONFIG ================= */

const statusConfig = {
  active: {
    label: "Đang hoạt động",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Ngừng hoạt động",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const validateFormData = (data: { name: string; slug: string; status: string }) => {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.length < 3) {
    errors.name = "Tên thương hiệu phải có ít nhất 3 ký tự";
  }

  if (!data.slug || data.slug.length < 3) {
    errors.slug = "Slug phải có ít nhất 3 ký tự";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/* ================= PAGE ================= */

export default function BrandsPage() {
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      status: "active",
    },
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await brandApi.getBrands();
        setBrands(res.data.data || res.data);
      } catch {
        toast({
          variant: "destructive",
          title: "❌ Lỗi",
          description: "Không thể tải dữ liệu thương hiệu",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  // Handle add brand
  const onSubmit = async (data: { name: string; slug: string; status: string }) => {
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
        slug: data.slug,
        status: data.status,
      };

      await brandApi.createBrand(submitData);

      toast({
        title: "✅ Thành công",
        description: "Thêm thương hiệu thành công",
      });

      setIsModalOpen(false);
      form.reset();

      // Reload brand list
      const res = await brandApi.getBrands();
      setBrands(res.data.data || res.data);
    } catch {
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: "Không thể thêm thương hiệu",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete brand
  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Bạn có chắc muốn xóa thương hiệu này?")) return;

      try {
        await brandApi.deleteBrand(id);
        toast({
          title: "✅ Thành công",
          description: "Xóa thương hiệu thành công",
        });

        setBrands((prev) => prev.filter((b) => b._id !== id));
      } catch {
        toast({
          variant: "destructive",
          title: "❌ Lỗi",
          description: "Không thể xóa thương hiệu",
        });
      }
    },
    [toast]
  );

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Thương hiệu",
        render: (brand: Brand) => (
          <div>
            <p className="font-medium">{brand.name}</p>
            <p className="text-sm text-muted-foreground">{brand._id}</p>
          </div>
        ),
      },
      {
        key: "slug",
        header: "Website",
        render: (brand: Brand) => <span>{brand.slug}</span>,
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (brand: Brand) => {
          const config = statusConfig[brand.isActive ? "active" : "inactive"];
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
        render: (brand: Brand) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dropdown-content">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(brand._id)}
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
          <h1 className="text-2xl font-bold">Thương hiệu</h1>
          <p className="text-muted-foreground">Quản lý danh sách thương hiệu</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm thương hiệu
        </Button>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DataTable
          data={brands}
          columns={columns}
          searchKey="name"
          searchPlaceholder="Tìm kiếm thương hiệu..."
        />
      )}

      {/* Add Brand Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold">Thêm thương hiệu mới</h2>
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
                        <FormLabel>Tên thương hiệu</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập tên thương hiệu" {...field} />
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

                  {/* Slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhập slug" {...field} />
                        </FormControl>
                        {formErrors.slug && (
                          <p className="text-sm text-destructive">
                            {formErrors.slug}
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
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Ngừng hoạt động</option>
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

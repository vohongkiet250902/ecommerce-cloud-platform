"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/shared/DataTable";
import { useToast } from "@/hooks/use-toast";
import { brandApi } from "@/services/api";
import type { RootState, AppDispatch } from "@/store";
import { fetchBrandsThunk, type Brand } from "@/store/brands/brands.slice";

/* ================= TYPES ================= */

const formSchema = z.object({
  name: z.string().min(1, "Tên thương hiệu không được để trống"),
  slug: z.string().optional(), // Used as Website URL
  logo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

/* ================= PAGE ================= */

export default function BrandsPage() {
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();

  /* ===== Redux ===== */
  const { data: brands, loading } = useSelector(
    (state: RootState) => state.brands
  );

  const [initialized, setInitialized] = useState(false);

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Delete Confirm States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      logo: "",
    },
  });

  /* ===== Fetch ===== */
  useEffect(() => {
    dispatch(fetchBrandsThunk()).finally(() => {
      setInitialized(true);
    });
  }, [dispatch]);

  /* ===== Handlers ===== */
  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedBrand(null);
    form.reset({ name: "", slug: "", logo: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setDialogMode("edit");
    setSelectedBrand(brand);
    form.reset({
      name: brand.name,
      slug: brand.slug, // Maps to "Website" input
      logo: brand.logo || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (brand: Brand) => {
    setBrandToDelete(brand);
    setDeleteConfirmOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (dialogMode === "edit" && selectedBrand) {
        await brandApi.updateBrand(selectedBrand._id, values);
        toast({ title: "Cập nhật thành công", variant: "success" });
      } else {
        await brandApi.createBrand(values);
        toast({ title: "Tạo thương hiệu thành công", variant: "success" });
      }

      dispatch(fetchBrandsThunk());
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description:
          error?.response?.data?.message || "Không thể lưu thương hiệu",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;
    setIsDeleting(true);
    try {
      await brandApi.deleteBrand(brandToDelete._id);
      toast({ title: "Đã xóa thương hiệu", variant: "success" });
      dispatch(fetchBrandsThunk());
      setDeleteConfirmOpen(false);
    } catch (error: any) {
      toast({
        title: "Lỗi xóa",
        description:
          error?.response?.data?.message || "Không thể xóa thương hiệu",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setBrandToDelete(null);
    }
  };

  /* ===== Table Columns ===== */
  const tableColumns = useMemo(
    () => [
      {
        key: "name",
        header: "Thương hiệu",
        render: (brand: Brand) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center p-2 overflow-hidden border border-border/40">
              {brand.logo ? (
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <span className="font-bold text-xs text-muted-foreground">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="font-medium">{brand.name}</span>
          </div>
        ),
      },
      {
        key: "slug", // Key is slug
        header: "Website", // Header is Website
        render: (b: Brand) => b.slug ? (
          <a 
            href={b.slug} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm truncate max-w-[200px] block"
          >
            {b.slug}
          </a>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
      },
      {
        key: "productCount",
        header: "Sản phẩm",
        render: (b: Brand) => (
          <Badge variant="secondary" className="font-normal">
            {b.productCount ?? 0} sản phẩm
          </Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (brand: Brand) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-muted"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => handleOpenEdit(brand)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleOpenDelete(brand)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  );

  /* ===== Stats ===== */
  const totalBrands = brands.length;
  const totalProducts = useMemo(
    () => brands.reduce((s, b) => s + (b.productCount ?? 0), 0),
    [brands]
  );

  if (!initialized && loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thương hiệu</h1>
          <p className="text-muted-foreground">
            Quản lý các đối tác và thương hiệu sản phẩm
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Thêm thương hiệu
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">
            Tổng thương hiệu
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold">{totalBrands}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">
            Tổng sản phẩm liên kết
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-primary">{totalProducts}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={brands}
        columns={tableColumns}
        searchKey="name"
        searchPlaceholder="Tìm kiếm thương hiệu..."
      />

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit"
                ? "Chỉnh sửa thương hiệu"
                : "Thêm thương hiệu mới"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/logo.png"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên thương hiệu</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên thương hiệu..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://website.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Hủy
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {dialogMode === "edit" ? "Lưu thay đổi" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
              Bạn có chắc chắn muốn xóa thương hiệu{" "}
              <span className="font-bold text-foreground">
                {brandToDelete?.name}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Xóa thương hiệu"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

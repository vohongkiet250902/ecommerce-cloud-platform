"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
  ImagePlus,
  CloudUpload,
  X,
  Filter,
  Search,
  ArrowUpDown,
} from "lucide-react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
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
import { brandApi, uploadApi } from "@/services/api";
import type { RootState, AppDispatch } from "@/store";
import { fetchAdminBrandsThunk, type Brand } from "@/store/brands/brands.slice";

/* ================= TYPES ================= */

const formSchema = z.object({
  name: z.string().min(1, "Tên thương hiệu không được để trống"),
  slug: z.string().min(1, "Website không được để trống"), // Used as Website URL
  logo: z.string().min(1, "Logo thương hiệu không được để trống"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

/* ================= PAGE ================= */

export default function BrandsPage() {
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();

  /* ===== State ===== */
  const { data: reduxBrands, loading } = useSelector((state: RootState) => state.brands);
  const [initialized, setInitialized] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Filter & Sort states
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState<"name" | "products">("name");

  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  // Delete Confirm States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status Confirm States
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusToToggle, setStatusToToggle] = useState<{ brand: Brand; status: boolean } | null>(null);

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
      logo: "",
      isActive: true,
    },
  });

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("files", file);

      const res = await uploadApi.uploadMultiple(formData);
      const imageUrl = res.data.data.images[0].url;

      form.setValue("logo", imageUrl, { shouldValidate: true });
      toast({
        title: "Tải ảnh thành công",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Tải ảnh thất bại",
        variant: "destructive",
        description: "Đã có lỗi xảy ra khi tải ảnh lên. Vui lòng kiểm tra lại dung lượng/định dạng ảnh và thử lại.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAdminBrands = useCallback(async () => {
    try {
      await dispatch(fetchAdminBrandsThunk()).unwrap();
    } catch (error) {
      console.error(error);
    } finally {
      setInitialized(true);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchAdminBrands();
  }, [fetchAdminBrands]);

  /* ===== Handlers ===== */
  const handleOpenCreate = () => {
    setDialogMode("create");
    setSelectedBrand(null);
    form.reset({ name: "", slug: "", logo: "", isActive: true });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setDialogMode("edit");
    setSelectedBrand(brand);
    form.reset({
      name: brand.name,
      slug: brand.slug, // Maps to "Website" input
      logo: brand.logo || "",
      isActive: brand.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (brand: Brand) => {
    setBrandToDelete(brand);
    setDeleteConfirmOpen(true);
  };

  const handleToggleStatus = (brand: Brand, newStatus: boolean) => {
    if (!newStatus) {
      setStatusToToggle({ brand, status: newStatus });
      setStatusConfirmOpen(true);
      return;
    }
    executeToggleStatus(brand, newStatus);
  };

  const executeToggleStatus = async (brand: Brand, newStatus: boolean) => {
    try {
      await brandApi.toggleBrandStatus(brand._id, newStatus);
      toast({ 
        title: "✅ Cập nhật thành công", 
        variant: "success",
        description: `Thương hiệu "${brand.name}" hiện đã ${newStatus ? "được kích hoạt" : "ngừng hoạt động"}.`
      });
      dispatch(fetchAdminBrandsThunk());
      setStatusConfirmOpen(false);
      setStatusToToggle(null);
    } catch (error) {
      toast({
        title: "❌ Cập nhật thất bại",
        description: "Đã xảy ra lỗi khi thay đổi trạng thái thương hiệu. Vui lòng thử lại sau.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      // Kiểm tra trùng lặp tên (chỉ khi tạo mới hoặc đổi tên khi edit)
      const isDuplicate = reduxBrands.some((b: Brand) => 
        b.name.toLowerCase() === values.name.toLowerCase() && 
        (dialogMode === "create" || b._id !== selectedBrand?._id)
      );

      if (isDuplicate) {
        toast({
          title: "❌ Tên thương hiệu đã tồn tại",
          description: `Thương hiệu "${values.name}" đã có trong hệ thống. Vui lòng chọn tên khác.`,
          variant: "destructive",
        });
        return;
      }

      if (dialogMode === "edit" && selectedBrand) {
        await brandApi.updateBrand(selectedBrand._id, values);
        toast({ title: "✅ Cập nhật thành công", variant: "success" });
      } else {
        await brandApi.createBrand(values);
        toast({ title: "✅ Tạo thương hiệu thành công", variant: "success" });
      }

      dispatch(fetchAdminBrandsThunk());
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "❌ Thao tác thất bại",
        description: dialogMode === "edit" 
          ? "Không thể cập nhật thông tin thương hiệu. Vui lòng kiểm tra lại."
          : "Không thể thêm thương hiệu mới. Vui lòng kiểm tra lại.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;
    setIsDeleting(true);
    try {
      await brandApi.deleteBrand(brandToDelete._id);
      toast({ title: "✅ Đã xóa thương hiệu", variant: "success" });
      dispatch(fetchAdminBrandsThunk());
    } catch (error) {
      toast({
        title: "❌ Không thể xóa",
        description: "Đã xảy ra lỗi khi xóa. Thương hiệu này có thể đang liên kết với các sản phẩm, vui lòng thử 'Ngừng hoạt động' thay vì xóa.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setBrandToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  /* ===================== DERIVED DATA ===================== */
  const filteredBrands = useMemo(() => {
    let filtered = reduxBrands;

    // Filter by Status (Search is handled by DataTable internally)
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => 
        statusFilter === "active" ? b.isActive : !b.isActive
      );
    }

    // Sort by Name (A-Z) hoặc Sản phẩm
    return [...filtered].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "products") return (b.productCount ?? 0) - (a.productCount ?? 0);
      return 0;
    });
  }, [reduxBrands, statusFilter, sortBy]);

  const { totalBrandsCount, totalProductsCount } = useMemo(() => {
    return {
      totalBrandsCount: reduxBrands.length,
      totalProductsCount: reduxBrands.reduce((acc: number, b: Brand) => acc + (b.productCount ?? 0), 0)
    };
  }, [reduxBrands]);

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
                <div 
                  className="w-full h-full flex items-center justify-center text-primary font-bold text-sm bg-primary/10 rounded-md ring-1 ring-primary/20"
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
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
        key: "isActive",
        header: "Trạng thái",
        render: (b: Brand) => (
          b.isActive ? (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-normal">
              Đang hoạt động
            </Badge>
          ) : (
            <Badge variant="destructive" className="font-normal">
              Ngừng hoạt động
            </Badge>
          )
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
                  size="icon-sm"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 dropdown-content">
                <DropdownMenuItem onClick={() => handleOpenEdit(brand)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => handleToggleStatus(brand, !brand.isActive)}>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        brand.isActive ? "bg-success" : "bg-destructive",
                      )}
                    />
                    {brand.isActive ? "Ngừng hoạt động" : "Kích hoạt lại"}
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => handleOpenDelete(brand)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Xóa thương hiệu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [dispatch, toast]
  );

  /* ===== Stats ===== */
  // Moved into useMemo for accuracy and Redux sync

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
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm transition-colors hover:bg-muted/5">
          <p className="text-sm text-muted-foreground font-medium">
            Tổng thương hiệu
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold">{totalBrandsCount}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm transition-colors hover:bg-muted/5">
          <p className="text-sm text-muted-foreground font-medium">
            Tổng sản phẩm liên kết
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-bold text-primary">{totalProductsCount}</p>
          </div>
        </div>
      </div>

      <DataTable
        data={filteredBrands}
        columns={tableColumns}
        searchKey="name"
        searchPlaceholder="Tìm kiếm thương hiệu..."
        pageSize={10}
        filterNode={
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed bg-background/50 border-border/40">
                  <Filter className="h-4 w-4" />
                  <span>{statusFilter === "all" ? "Tất cả trạng thái" : statusFilter === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Đang hoạt động</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Ngừng hoạt động</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed bg-background/50 border-border/40">
                  <ArrowUpDown className="h-4 w-4" />
                  <span>Sắp xếp: {sortBy === "name" ? "Tên A-Z" : "Nhiều sản phẩm nhất"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => setSortBy("name")}>Tên A-Z</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("products")}>Nhiều sản phẩm nhất</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
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
                    <FormLabel>Logo thương hiệu</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {field.value ? (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border group">
                            <Image
                              src={field.value}
                              alt="Brand Logo"
                              fill
                              className="object-contain bg-muted/30 p-4"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => field.onChange("")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "relative w-full h-40 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors",
                              isUploading && "pointer-events-none opacity-60"
                            )}
                            onClick={() => document.getElementById("logo-upload")?.click()}
                          >
                            {isUploading ? (
                              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            ) : (
                              <>
                                <CloudUpload className="h-10 w-10 text-muted-foreground" />
                                <div className="text-center">
                                  <p className="text-sm font-medium">Nhấn để tải logo lên</p>
                                  <p className="text-xs text-muted-foreground">PNG, JPG hoặc SVG</p>
                                </div>
                              </>
                            )}
                            <input
                              id="logo-upload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleUploadImage}
                            />
                          </div>
                        )}
                      </div>
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

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border/50 p-3 shadow-sm transition-colors hover:bg-muted/5">
                    <div className="space-y-0.5">
                      <FormLabel>Trạng thái hoạt động</FormLabel>
                      <div className="text-[12px] text-muted-foreground">
                        Hiển thị thương hiệu này trên cửa hàng
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="border-dashed bg-background/50 border-border/40">
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Xóa thương hiệu"
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
              Bạn có chắc chắn muốn ngừng hoạt động thương hiệu{" "}
              <span className="font-bold text-primary">
                "{statusToToggle?.brand.name}"
              </span>?
            </p>
            <div className="p-4 bg-muted/50 rounded-lg border border-warning/20 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-warning text-lg leading-none">⚠️</span>
                <span>
                  Hành động này có thể làm ẩn các sản phẩm thuộc thương hiệu này khỏi cửa hàng.
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
                  executeToggleStatus(statusToToggle.brand, statusToToggle.status);
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

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FolderTree,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Search,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import slugify from "slugify";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { RootState, AppDispatch } from "@/store";
import { fetchAdminCategoriesThunk } from "@/store/categories/categories.slice";
import { categoryApi } from "@/services/api";

/* ===================== TYPES ===================== */
export interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  productCount?: number;
  isActive: boolean;
  children?: Category[];
}

const formSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên danh mục"),
  slug: z.string(),
  isActive: z.boolean(),
});

interface FormValues {
  [key: string]: any;
  name: string;
  slug: string;
  isActive: boolean;
}

/* ===================== COMPONENTS ===================== */

interface ItemProps {
  category: Category;
  level?: number;
  onEdit: (c: Category) => void;
  onAddChild: (c: Category) => void;
  onDelete: (c: Category) => void;
  onStatusToggle: (c: Category, status: boolean) => void;
  deletingId: string | null;
}

const CategoryItem = ({
  category,
  level = 0,
  onEdit,
  onAddChild,
  onDelete,
  onStatusToggle,
  deletingId,
}: ItemProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between p-3 sm:p-4 hover:bg-secondary/30 transition-colors border-b border-border/40 last:border-0 group",
          level > 0 && "bg-secondary/10",
        )}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        {/* LEFT */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={cn(
              "w-5 h-5 flex items-center justify-center rounded-sm transition-colors",
              hasChildren
                ? "cursor-pointer hover:bg-muted"
                : "opacity-0 pointer-events-none",
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </div>

          <FolderTree className="h-5 w-5 text-primary shrink-0" />

          <div className={cn("flex flex-col min-w-0", !category.isActive && "opacity-50")}>
            <span className="font-medium text-foreground truncate">
              {category.name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              /{category.slug}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {!category.isActive && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
              Ngừng hoạt động
            </Badge>
          )}
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {category.productCount ?? 0} sản phẩm
          </Badge>

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
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </DropdownMenuItem>

              {!category.parentId && (
                <DropdownMenuItem 
                  onClick={() => onAddChild(category)}
                  disabled={!category.isActive}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm danh mục con
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => onStatusToggle(category, !category.isActive)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      category.isActive ? "bg-success" : "bg-destructive",
                    )}
                  />
                  {category.isActive ? "Ngừng hoạt động" : "Kích hoạt lại"}
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={deletingId === category._id}
                onClick={() => onDelete(category)}
              >
                {deletingId === category._id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Xóa danh mục
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {hasChildren &&
        isExpanded &&
        category.children?.map((child) => (
          <CategoryItem
            key={child._id}
            category={child}
            level={level + 1}
            onEdit={onEdit}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onStatusToggle={onStatusToggle}
            deletingId={deletingId}
          />
        ))}
    </>
  );
};

/* ===================== PAGE ===================== */
export default function CategoriesPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();

  const { data: reduxCategories, loading } = useSelector((state: RootState) => state.categories);
  const [initialized, setInitialized] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search & Sort & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "products">("name");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "root" | "child">("all");

  // Modal states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<
    "create" | "edit" | "create_child"
  >("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

  // Status toggle confirm state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [statusToToggle, setStatusToToggle] = useState<{ cat: Category; status: boolean } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      isActive: true,
    },
  });

  const { reset } = form;

  const fetchAdminCategories = useCallback(async () => {
    try {
      await dispatch(fetchAdminCategoriesThunk()).unwrap();
    } catch (error) {
      console.error(error);
    } finally {
      setInitialized(true);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchAdminCategories();
  }, [fetchAdminCategories]);

  // Generate slug automatically when name changes
  const watchedName = form.watch("name");
  useEffect(() => {
    const slug = watchedName
      ? slugify(watchedName, {
          lower: true,
          strict: true,
          locale: "vi",
        })
      : "";
    form.setValue("slug", slug, { shouldValidate: true });
  }, [watchedName, form]);

  /* ===================== DERIVED DATA ===================== */
  const categories = useMemo(() => {
    // 1. Filtering logic
    const filterTree = (list: Category[]): Category[] => {
      return list
        .map((cat) => ({
          ...cat,
          children: cat.children ? filterTree(cat.children) : [],
        }))
        .filter((cat) => {
          const matchesSearch = searchQuery === "" || 
                               cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               cat.slug.toLowerCase().includes(searchQuery.toLowerCase());
          
          const ownStatusMatches = statusFilter === "all" ? true : 
                                   statusFilter === "active" ? cat.isActive : !cat.isActive;

          const ownLevelMatches = levelFilter === "all" ? true :
                                  levelFilter === "root" ? !cat.parentId : cat.parentId;

          const hasMatchingChildren = cat.children && cat.children.length > 0;
          
          // Giữ lại danh mục nếu:
          // 1. Bản thân nó khớp tất cả các bộ lọc (search, status, level)
          // 2. HOẶC nó có danh mục con khớp (để giữ được cấu trúc cây khi search hoặc lọc)
          return (matchesSearch && ownStatusMatches && ownLevelMatches) || hasMatchingChildren;
        });
    };

    let processed = filterTree(reduxCategories);

    // 2. Sorting logic
    const sortTree = (list: Category[]): Category[] => {
      return [...list]
        .sort((a, b) => {
          if (sortBy === "name") return a.name.localeCompare(b.name);
          if (sortBy === "products") return (b.productCount || 0) - (a.productCount || 0);
          return 0;
        })
        .map((cat) => ({
          ...cat,
          children: cat.children ? sortTree(cat.children) : [],
        }));
    };

    return sortTree(processed);
  }, [reduxCategories, searchQuery, sortBy, statusFilter, levelFilter]);

  const { totalCategories, totalRootCategories, totalProducts } = useMemo(() => {
    const countTotalCategories = (list: Category[]): number => {
      return list.reduce((acc, cat) => {
        const childrenCount = cat.children ? countTotalCategories(cat.children) : 0;
        return acc + 1 + childrenCount;
      }, 0);
    };

    const totalCats = countTotalCategories(reduxCategories);
    const totalRoots = reduxCategories.length;
    const totalProds = reduxCategories.reduce((acc: number, cat) => acc + (cat.productCount || 0), 0);

    return { totalCategories: totalCats, totalRootCategories: totalRoots, totalProducts: totalProds };
  }, [reduxCategories]);

  /* ===================== HANDLERS ===================== */
  const handleOpenCreateResponse = () => {
    setDialogMode("create");
    setSelectedCategory(null);
    form.reset({ name: "", slug: "", isActive: true });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setDialogMode("edit");
    setSelectedCategory(cat);
    form.reset({ name: cat.name, slug: cat.slug, isActive: cat.isActive });
    setIsDialogOpen(true);
  };

  const handleOpenAddChild = (parent: Category) => {
    if (parent.parentId) {
      toast({
        title: "❌ Giới hạn cấp bậc",
        description: "Hệ thống hiện tại chỉ hỗ trợ tối đa 2 cấp danh mục.",
        variant: "destructive",
      });
      return;
    }
    if (!parent.isActive) {
      toast({
        title: "❌ Danh mục đã tắt",
        description: "Không thể thêm danh mục con vào danh mục đang ngừng hoạt động.",
        variant: "destructive",
      });
      return;
    }
    setDialogMode("create_child");
    setSelectedCategory(parent);
    form.reset({ name: "", slug: "", isActive: true });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (cat: Category) => {
    setCategoryToDelete(cat);
    setDeleteConfirmOpen(true);
  };

  const handleToggleStatus = async (cat: Category, newStatus: boolean) => {
    // Luôn yêu cầu xác nhận khi tắt trạng thái (dù là danh mục cha hay con)
    if (!newStatus) {
      setStatusToToggle({ cat, status: newStatus });
      setStatusConfirmOpen(true);
      return;
    }
    await executeToggleStatus(cat, newStatus);
  };

  const executeToggleStatus = async (cat: Category, newStatus: boolean) => {
    try {
      const idsToUpdate: string[] = [cat._id];
      
      // Cascade deactivation to children
      if (!newStatus) {
        const collectIds = (c: Category) => {
          c.children?.forEach(child => {
            idsToUpdate.push(child._id);
            collectIds(child);
          });
        };
        collectIds(cat);
      }

      const promises = idsToUpdate.map(id => categoryApi.toggleCategoryStatus(id, newStatus));
      await Promise.all(promises);

      toast({ 
        title: "✅ Cập nhật thành công", 
        variant: "success",
        description: !newStatus && idsToUpdate.length > 1 
          ? `Đã ngừng hoạt động "${cat.name}" và ${idsToUpdate.length - 1} danh mục con liên quan.` 
          : `Trạng thái của "${cat.name}" đã được cập nhật.`
      });
      
      dispatch(fetchAdminCategoriesThunk());
      setStatusConfirmOpen(false);
      setStatusToToggle(null);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Không thể cập nhật trạng thái";
      toast({
        title: "❌ Cập nhật thất bại",
        description: typeof msg === "string" ? msg : "Đã xảy ra lỗi không xác định khi cập nhật trạng thái.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (dialogMode === "edit" && selectedCategory) {
        const statusChangedToFalse = selectedCategory.isActive && !values.isActive;
        
        await categoryApi.updateCategory(selectedCategory._id, values);
        
        if (statusChangedToFalse) {
          const idsToUpdate: string[] = [];
          const collectIds = (c: Category) => {
            c.children?.forEach(child => {
              idsToUpdate.push(child._id);
              collectIds(child);
            });
          };
          collectIds(selectedCategory);
          if (idsToUpdate.length > 0) {
            await Promise.all(idsToUpdate.map(id => categoryApi.toggleCategoryStatus(id, false)));
          }
        }
        
        toast({ title: "✅ Cập nhật thành công", variant: "success" });
      } else if (dialogMode === "create") {
        await categoryApi.createCategory({ ...values, parentId: null });
        toast({ title: "✅ Tạo danh mục thành công", variant: "success" });
      } else if (dialogMode === "create_child" && selectedCategory) {
        await categoryApi.createCategory({
          ...values,
          parentId: selectedCategory._id,
        });
        toast({ title: "✅ Tạo danh mục con thành công", variant: "success" });
      }

      dispatch(fetchAdminCategoriesThunk());
      setIsDialogOpen(false);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Có lỗi xảy ra";
      toast({
        title: "❌ Tên danh mục đã tồn tại",
        description: typeof msg === "string" ? msg : "Tên danh mục này đã tồn tại. Vui lòng chọn tên khác.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      // Check for children
      if (categoryToDelete.children && categoryToDelete.children.length > 0) {
        setDeleteConfirmOpen(false);
        toast({
          title: "❌ Không thể xóa",
          description: "Danh mục này đang chứa danh mục con. Vui lòng chuyển hoặc xóa danh mục con trước.",
          variant: "destructive",
        });
        return;
      }

      setDeletingId(categoryToDelete._id);
      await categoryApi.deleteCategory(categoryToDelete._id);
      setDeleteConfirmOpen(false);
      
      toast({ title: "✅ Đã xóa danh mục", variant: "success" });
      dispatch(fetchAdminCategoriesThunk());
    } catch (error: any) {
      setDeleteConfirmOpen(false);
      const msg = error?.response?.data?.message || "Không thể xóa danh mục";
      const description = typeof msg === "string" ? msg : (Array.isArray(msg) ? msg.join(", ") : JSON.stringify(msg));
      
      toast({
        title: "❌ Không thể xóa",
        description: description.includes("tồn kho") 
          ? "Danh mục này vẫn còn sản phẩm. Vui lòng chuyển sản phẩm sang danh mục khác hoặc ngừng hoạt động thay vì xóa."
          : description,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setCategoryToDelete(null);
    }
  };

  if (!initialized && loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Danh mục sản phẩm
          </h1>
          <p className="text-muted-foreground">
            Quản lý cấu trúc danh mục cho cửa hàng của bạn
          </p>
        </div>
        <Button
          onClick={handleOpenCreateResponse}
          className="shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm danh mục gốc
        </Button>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">
            Tổng danh mục
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold">{totalCategories}</span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">
            Danh mục gốc
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-primary">
              {totalRootCategories}
            </span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">
            Tổng sản phẩm liên kết
          </p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-green-600">
              {totalProducts}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-muted/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-semibold flex items-center gap-2 shrink-0">
            <FolderTree className="h-4 w-4" />
            Cấu trúc danh mục
          </h3>

          <div className="flex flex-col md:flex-row gap-2 flex-1 md:justify-end">
             {/* Search */}
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm kiếm danh mục..." 
                className="pl-8 h-10 text-sm bg-background/50 border-border/40 focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>



            {/* Status Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed bg-background/50 border-border/40">
                  <Filter className="h-4 w-4" />
                  <span>
                    {statusFilter === "all" ? "Tất cả trạng thái" : statusFilter === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("active")}>Đang hoạt động</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("inactive")}>Ngừng hoạt động</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed bg-background/50 border-border/40">
                  <ArrowUpDown className="h-4 w-4" />
                  <span>Sắp xếp: {sortBy === "name" ? "Tên (A-Z)" : "Số sản phẩm"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => setSortBy("name")}>Theo tên (A-Z)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("products")}>Theo số sản phẩm</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="bg-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FolderTree className="h-8 w-8 opacity-50" />
            </div>
            <p className="font-medium mb-1">Chưa có danh mục nào</p>
            <p className="text-sm">
              Hãy tạo danh mục đầu tiên để bắt đầu quản lý sản phẩm
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleOpenCreateResponse}
            >
              Tạo ngay
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {categories.map((cat) => (
              <CategoryItem
                key={cat._id}
                category={cat}
                onEdit={handleOpenEdit}
                onAddChild={handleOpenAddChild}
                onDelete={handleOpenDelete}
                onStatusToggle={handleToggleStatus}
                deletingId={deletingId}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===================== FORM DIALOG ===================== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "edit"
                ? "Chỉnh sửa danh mục"
                : dialogMode === "create_child"
                  ? `Thêm danh mục con cho "${selectedCategory?.name}"`
                  : "Thêm danh mục mới"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên danh mục</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên danh mục..." {...field} />
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
                    <FormLabel>
                      Đường dẫn
                      <span className="text-xs text-muted-foreground ml-2 font-normal">
                        (Tự động tạo)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-muted/50" />
                    </FormControl>
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
                        {field.value
                          ? "Danh mục đang hoạt động và hiển thị cho khách hàng"
                          : "Danh mục đang bị ẩn khỏi cửa hàng"}
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
                  {dialogMode === "edit" ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ===================== DELETE CONFIRM DIALOG ===================== */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận xóa
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-muted-foreground">
              Bạn có chắc chắn muốn xóa danh mục{" "}
              <span className="font-bold text-foreground">
                "{categoryToDelete?.name}"
              </span>
              ?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deletingId !== null}
              className="border-dashed bg-background/50 border-border/40"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa danh mục"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ===================== STATUS TOGGLE CONFIRM DIALOG ===================== */}
      <Dialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận tắt trạng thái
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <p className="text-foreground font-medium">
              Bạn đang chuẩn bị tắt trạng thái của danh mục{" "}
              <span className="font-bold text-primary">
                "{statusToToggle?.cat.name}"
              </span>
            </p>
            <div className="p-4 bg-muted/50 rounded-lg border border-warning/20 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-warning text-lg leading-none">⚠️</span>
                <span>
                  {statusToToggle?.cat.children && statusToToggle.cat.children.length > 0 ? (
                    <>
                      Hành động này sẽ <strong>ngừng hoạt động tất cả danh mục con</strong> trực thuộc danh mục này. 
                      Sản phẩm liên quan sẽ bị ẩn khỏi cửa hàng.
                    </>
                  ) : (
                    <>
                      Danh mục này sẽ bị ẩn khỏi cửa hàng. Các sản phẩm chỉ thuộc duy nhất danh mục này cũng sẽ không hiển thị cho khách hàng.
                    </>
                  )}
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
                  executeToggleStatus(statusToToggle.cat, statusToToggle.status);
                }
              }}
            >
              Tiếp tục tắt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

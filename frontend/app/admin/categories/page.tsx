"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FolderTree,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import slugify from "slugify";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { fetchCategoriesThunk } from "@/store/categories/categories.slice";
import { categoryApi } from "@/services/api";

/* ===================== TYPES ===================== */
export interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  productCount?: number;
  children?: Category[];
}

const formSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên danh mục"),
  slug: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

/* ===================== COMPONENTS ===================== */

interface ItemProps {
  category: Category;
  level?: number;
  onEdit: (c: Category) => void;
  onAddChild: (c: Category) => void;
  onDelete: (c: Category) => void;
  deletingId: string | null;
}

const CategoryItem = ({
  category,
  level = 0,
  onEdit,
  onAddChild,
  onDelete,
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

          <div className="flex flex-col min-w-0">
            <span className="font-medium text-foreground truncate">
              {category.name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              /{category.slug}
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {category.productCount ?? 0} sản phẩm
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <DropdownMenuItem onClick={() => onAddChild(category)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm danh mục con
                </DropdownMenuItem>
              )}

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

  const { data: categories, loading } = useSelector(
    (state: RootState) => state.categories,
  );

  const [initialized, setInitialized] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  useEffect(() => {
    dispatch(fetchCategoriesThunk()).finally(() => {
      setInitialized(true);
    });
  }, [dispatch]);

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

  /* ===================== STATS ===================== */
  const { totalCategories, totalProducts } = useMemo(() => {
    const count = (list: Category[]): { cats: number; prods: number } => {
      return list.reduce(
        (acc, cat) => {
          const childrenCount = cat.children
            ? count(cat.children)
            : { cats: 0, prods: 0 };
          return {
            cats: acc.cats + 1 + childrenCount.cats,
            prods: acc.prods + (cat.productCount || 0) + childrenCount.prods,
          };
        },
        { cats: 0, prods: 0 },
      );
    };
    const res = count(categories);
    return { totalCategories: res.cats, totalProducts: res.prods };
  }, [categories]);

  /* ===================== HANDLERS ===================== */
  const handleOpenCreateResponse = () => {
    setDialogMode("create");
    setSelectedCategory(null);
    form.reset({ name: "", slug: "" });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setDialogMode("edit");
    setSelectedCategory(cat);
    form.reset({ name: cat.name, slug: cat.slug });
    setIsDialogOpen(true);
  };

  const handleOpenAddChild = (parent: Category) => {
    if (parent.parentId) {
      toast({
        title: "Không thể tạo danh mục con",
        description: "Hệ thống hiện tại chỉ hỗ trợ tối đa 2 cấp danh mục.",
        variant: "destructive",
      });
      return;
    }
    setDialogMode("create_child");
    setSelectedCategory(parent);
    form.reset({ name: "", slug: "" });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (cat: Category) => {
    if (cat.children && cat.children.length > 0) {
      toast({
        title: "Không thể xóa",
        description:
          "Danh mục này đang chứa danh mục con. Vui lòng xóa danh mục con trước.",
        variant: "destructive",
      });
      return;
    }
    setCategoryToDelete(cat);
    setDeleteConfirmOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (dialogMode === "edit" && selectedCategory) {
        await categoryApi.updateCategory(selectedCategory._id, values);
        toast({ title: "Cập nhật thành công", variant: "success" });
      } else if (dialogMode === "create") {
        await categoryApi.createCategory({ ...values, parentId: null });
        toast({ title: "Tạo danh mục gốc thành công", variant: "success" });
      } else if (dialogMode === "create_child" && selectedCategory) {
        await categoryApi.createCategory({
          ...values,
          parentId: selectedCategory._id,
        });
        toast({ title: "Tạo danh mục con thành công", variant: "success" });
      }

      dispatch(fetchCategoriesThunk());
      setIsDialogOpen(false);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Có lỗi xảy ra";
      toast({
        title: "Thất bại",
        description: Array.isArray(msg) ? msg.join(", ") : msg,
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setDeletingId(categoryToDelete._id);
      await categoryApi.deleteCategory(categoryToDelete._id);
      toast({ title: "Đã xóa danh mục", variant: "success" });
      dispatch(fetchCategoriesThunk());
      setDeleteConfirmOpen(false);
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Không thể xóa danh mục";
      toast({
        title: "Xóa thất bại",
        description: typeof msg === "string" ? msg : JSON.stringify(msg),
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
              {categories.length}
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
        <div className="p-4 border-b border-border/40 bg-muted/40">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Cấu trúc danh mục
          </h3>
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

          <div className="py-4">
            <p className="text-muted-foreground">
              Bạn có chắc chắn muốn xóa danh mục{" "}
              <span className="font-bold text-foreground">
                {categoryToDelete?.name}
              </span>
              ?
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deletingId !== null}
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
    </div>
  );
}

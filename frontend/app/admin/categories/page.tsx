"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FolderTree,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { RootState, AppDispatch } from "@/store";
import { fetchCategoriesThunk } from "@/store/categories/categories.slice";
import { categoryApi } from "@/services/api";

/* ===================== TYPES ===================== */
interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  productCount?: number;
  children?: Category[];
}

/* ===================== SLUG ===================== */
const generateSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

/* ===================== CATEGORY ITEM ===================== */
interface ItemProps {
  category: Category;
  level?: number;
  onEdit: (c: Category) => void;
  onAddChild: (c: Category) => void;
  onDelete: (id: string) => void;
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
  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors border-b border-border last:border-0",
          level > 0 && "bg-secondary/20",
        )}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        {/* LEFT */}
        <div className="flex items-center gap-3">
          {category.children?.length ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <div className="w-4" />
          )}

          <FolderTree className="h-5 w-5 text-primary" />

          <div>
            <p className="font-medium text-foreground">{category.name}</p>
            <p className="text-sm text-muted-foreground">/{category.slug}</p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {category.productCount ?? 0} sản phẩm
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="dropdown-content">
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
                className="text-destructive"
                disabled={deletingId === category._id}
                onClick={() => onDelete(category._id)}
              >
                {deletingId === category._id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {category.children?.map((child) => (
        <CategoryItem
          key={child._id}
          category={child}
          level={level + 1}
          {...{ onEdit, onAddChild, onDelete, deletingId }}
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

  const [editing, setEditing] = useState<Category | null>(null);
  const [parentForChild, setParentForChild] = useState<Category | null>(null);
  const [showParentModal, setShowParentModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [nameError, setNameError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const parentInputRef = useRef<HTMLInputElement>(null);
  const childInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(fetchCategoriesThunk()).finally(() => {
      setInitialized(true);
    });
  }, [dispatch]);

  useEffect(() => {
    if (showParentModal) {
      setTimeout(() => {
        parentInputRef.current?.focus();
      }, 1);
    }
  }, [showParentModal]);

  useEffect(() => {
    if (showChildModal && parentForChild) {
      setTimeout(() => {
        childInputRef.current?.focus();
      }, 1);
    }
  }, [showChildModal, parentForChild]);

  /* ===================== STATS ===================== */
  const countCategories = (list: Category[]): number =>
    list.reduce(
      (total, cat) =>
        total + 1 + (cat.children ? countCategories(cat.children) : 0),
      0,
    );

  const countProducts = (list: Category[]): number =>
    list.reduce(
      (total, cat) =>
        total +
        (cat.productCount || 0) +
        (cat.children ? countProducts(cat.children) : 0),
      0,
    );

  const totalCategories = useMemo(() => {
    return countCategories(categories);
  }, [categories]);

  const totalProducts = useMemo(() => {
    return countProducts(categories);
  }, [categories]);

  /* ===================== HANDLERS ===================== */
  const openAddParent = () => {
    setEditing(null);
    setForm({ name: "", slug: "" });
    setNameError("");
    setShowParentModal(true);
  };

  const openEditParent = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug });
    setNameError("");
    setShowParentModal(true);
  };

  const openAddChild = (cat: Category) => {
    if (cat.parentId) {
      toast({
        title: "❌ Không thể tạo danh mục con",
        description: "Danh mục con không thể có thêm cấp con",
        variant: "destructive",
      });
      return;
    }

    setParentForChild(cat);
    setForm({ name: "", slug: "" });
    setNameError("");
    setShowChildModal(true);
  };

  const handleSaveParent = async () => {
    if (!form.name.trim()) {
      setNameError("Vui lòng nhập tên danh mục");
      return;
    }

    try {
      setSubmitting(true);

      if (editing) {
        await categoryApi.updateCategory(editing._id, form);
      } else {
        await categoryApi.createCategory({ ...form, parentId: null });
      }

      toast({
        title: "✅ Thành công",
        description: "Lưu danh mục thành công",
        variant: "success",
      });
      setShowParentModal(false);
      setEditing(null);
      setForm({ name: "", slug: "" });
      dispatch(fetchCategoriesThunk());
    } catch (err: any) {
      handleCategoryError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveChild = async () => {
    if (!form.name.trim()) {
      setNameError("Vui lòng nhập tên danh mục");
      return;
    }
    if (!parentForChild) return;

    try {
      setSubmitting(true);

      await categoryApi.createCategory({
        ...form,
        parentId: parentForChild._id,
      });

      toast({
        title: "✅ Thành công",
        description: "Thêm danh mục con thành công",
        variant: "success",
      });
      setShowChildModal(false);
      setParentForChild(null);
      setForm({ name: "", slug: "" });
      dispatch(fetchCategoriesThunk());
    } catch (err: any) {
      handleCategoryError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteCategory = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDeleteCategory = async () => {
    if (!confirmDeleteId) return;

    const findCategory = (list: Category[]): Category | null => {
      for (const c of list) {
        if (c._id === confirmDeleteId) return c;
        if (c.children?.length) {
          const found = findCategory(c.children);
          if (found) return found;
        }
      }
      return null;
    };

    const category = findCategory(categories);

    if (category?.children && category.children.length > 0) {
      toast({
        title: "❌ Không thể xóa danh mục",
        description: "Danh mục đang chứa danh mục con",
        variant: "destructive",
      });
      setConfirmDeleteId(null);
      return;
    }

    try {
      setDeletingId(confirmDeleteId);
      await categoryApi.deleteCategory(confirmDeleteId);

      toast({
        title: "✅ Thành công",
        description: "Đã xóa danh mục thành công",
        variant: "success",
      });

      dispatch(fetchCategoriesThunk());
    } catch (err: any) {
      const rawMessage = err?.response?.data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : rawMessage;

      toast({
        title: "❌ Không thể xóa danh mục",
        description: message || "Danh mục này không thể xóa",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleCategoryError = (err: any) => {
    const data = err?.response?.data;

    if (typeof data?.message === "string") {
      if (
        data.message.toLowerCase().includes("slug") ||
        data.message.toLowerCase().includes("exist")
      ) {
        setNameError("Tên danh mục đã tồn tại");
      } else {
        setNameError(data.message);
      }
      return;
    }

    if (Array.isArray(data?.message)) {
      setNameError(data.message.join(", "));
      return;
    }

    setNameError("Tên danh mục đã tồn tại");
  };

  /* ===================== LOADING STATE ===================== */

  if (!initialized && loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ===================== RENDER ===================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh mục</h1>
          <p className="text-muted-foreground">Quản lý danh mục sản phẩm</p>
        </div>
        <Button onClick={openAddParent}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm danh mục
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng danh mục</p>
          <p className="text-2xl font-bold">{totalCategories}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Danh mục gốc</p>
          <p className="text-2xl font-bold text-primary">{categories.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
          <p className="text-2xl font-bold text-success">{totalProducts}</p>
        </div>
      </div>

      {/* Tree */}
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Cây danh mục</h3>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FolderTree className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">Chưa có danh mục nào</p>
            <p className="text-sm">Hãy tạo danh mục đầu tiên để bắt đầu</p>
          </div>
        ) : (
          categories.map((cat) => (
            <CategoryItem
              key={cat._id}
              category={cat}
              onEdit={openEditParent}
              onAddChild={openAddChild}
              onDelete={deleteCategory}
              deletingId={deletingId}
            />
          ))
        )}
      </div>

      {/* ===================== MODAL CHA ===================== */}
      {showParentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center modal-overlay">
          <form
            className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 modal-content"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveParent();
            }}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold">
                {editing ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
              </h2>
              <X
                className="cursor-pointer"
                onClick={() => {
                  setShowParentModal(false);
                  setEditing(null);
                  setNameError("");
                  setForm({ name: "", slug: "" });
                }}
              />
            </div>

            <Label>Tên danh mục</Label>
            <Input
              ref={parentInputRef}
              value={form.name}
              onChange={(e) => {
                setForm({
                  name: e.target.value,
                  slug: generateSlug(e.target.value),
                });
                if (nameError) setNameError("");
              }}
              className={nameError ? "border-red-500" : ""}
            />
            {nameError && <p className="text-sm text-red-500">{nameError}</p>}

            <Label>Đường dẫn (tự động)</Label>
            <Input
              value={form.slug}
              disabled
              className="bg-muted cursor-not-allowed"
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={() => {
                  setShowParentModal(false);
                  setEditing(null);
                  setNameError("");
                  setForm({ name: "", slug: "" });
                }}
              >
                Hủy
              </Button>

              <Button type="submit" className="w-1/2" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ===================== MODAL CON ===================== */}
      {showChildModal && parentForChild && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center modal-overlay">
          <form
            className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 modal-content"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveChild();
            }}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold">
                Thêm danh mục con của "{parentForChild.name}"
              </h2>
              <X
                className="cursor-pointer"
                onClick={() => {
                  setShowChildModal(false);
                  setEditing(null);
                  setNameError("");
                  setForm({ name: "", slug: "" });
                }}
              />
            </div>

            <Label>Tên danh mục con</Label>
            <Input
              ref={childInputRef}
              value={form.name}
              onChange={(e) => {
                setForm({
                  name: e.target.value,
                  slug: generateSlug(e.target.value),
                });
                if (nameError) setNameError("");
              }}
              className={nameError ? "border-red-500" : ""}
            />
            {nameError && <p className="text-sm text-red-500">{nameError}</p>}

            <Label>Đường dẫn (tự động)</Label>
            <Input
              value={form.slug}
              disabled
              className="bg-muted cursor-not-allowed"
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={() => {
                  setShowChildModal(false);
                  setParentForChild(null);
                  setNameError("");
                  setForm({ name: "", slug: "" });
                }}
              >
                Hủy
              </Button>

              <Button type="submit" className="w-1/2" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </div>
      )}
      {/* ===================== DELETE CONFIRMATION ===================== */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center modal-overlay">
          <div className="bg-card w-full max-w-sm rounded-xl p-6 space-y-4 modal-content">
            <h2 className="font-bold text-lg">Xác nhận xóa</h2>

            <p className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn xóa thương hiệu{" "}
              <span className="font-semibold text-foreground">
                {categories
                  .flatMap((cat) =>
                    cat.children ? [cat, ...cat.children] : [cat],
                  )
                  .find((c) => c._id === confirmDeleteId)?.name || ""}
              </span>
              ?
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => setConfirmDeleteId(null)}
              >
                Hủy
              </Button>

              <Button
                variant="destructive"
                className="w-1/2"
                onClick={confirmDeleteCategory}
                disabled={deletingId === confirmDeleteId}
              >
                {deletingId === confirmDeleteId ? "Đang xóa..." : "Xóa"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

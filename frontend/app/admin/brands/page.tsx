"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Edit, Trash2, MoreHorizontal, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useToast } from "@/hooks/use-toast";
import { brandApi } from "@/services/api";
import type { RootState, AppDispatch } from "@/store";
import { fetchBrandsThunk } from "@/store/brands/brands.slice";

/* ================= TYPES ================= */

interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  productCount?: number;
  isActive: boolean;
}

/* ================= PAGE ================= */

export default function BrandsPage() {
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const nameInputRef = useRef<HTMLInputElement>(null);

  /* ===== Redux ===== */
  const { data: brands, loading } = useSelector(
    (state: RootState) => state.brands,
  );

  /* ===== Modal state ===== */
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [slugError, setSlugError] = useState("");
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo: "",
  });

  /* ===== Fetch ===== */
  useEffect(() => {
    dispatch(fetchBrandsThunk()).finally(() => {
      setInitialized(true);
    });
  }, [dispatch]);

  useEffect(() => {
    if (showBrandModal) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [showBrandModal]);

  /* ===== Stats ===== */
  const totalBrands = brands.length;
  const totalProducts = useMemo(
    () => brands.reduce((s, b) => s + (b.productCount ?? 0), 0),
    [brands],
  );

  /* ================= SAVE ================= */

  const handleSaveBrand = async () => {
    let hasError = false;

    if (!form.name.trim()) {
      setNameError("Tên thương hiệu không được để trống");
      hasError = true;
    }

    if (!form.slug.trim()) {
      setSlugError("Đường dẫn Website không được để trống");
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);

    try {
      if (editingBrand) {
        await brandApi.updateBrand(editingBrand._id, form);
        toast({
          variant: "success",
          title: "✅ Thành công",
          description: "Cập nhật thương hiệu thành công",
        });
      } else {
        await brandApi.createBrand(form);
        toast({
          variant: "success",
          title: "✅ Thành công",
          description: "Thêm thương hiệu thành công",
        });
      }

      dispatch(fetchBrandsThunk());
      closeBrandModal();
    } catch {
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: "Không thể lưu thương hiệu",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= DELETE ================= */

  const confirmDeleteBrand = async () => {
    if (!deletingBrand) return;

    try {
      await brandApi.deleteBrand(deletingBrand._id);
      dispatch(fetchBrandsThunk());

      toast({
        variant: "success",
        title: "✅ Thành công",
        description: "Xóa thương hiệu thành công",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "❌ Lỗi",
        description: "Không thể xóa thương hiệu",
      });
    } finally {
      setShowDeleteModal(false);
      setDeletingBrand(null);
    }
  };

  /* ================= MODAL HANDLERS ================= */

  const openAddModal = () => {
    setEditingBrand(null);
    setForm({ name: "", slug: "", logo: "" });
    setNameError("");
    setShowBrandModal(true);
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      logo: brand.logo ?? "",
    });
    setNameError("");
    setShowBrandModal(true);
  };

  const closeBrandModal = () => {
    setShowBrandModal(false);
    setEditingBrand(null);
    setNameError("");
    setSlugError("");
    setForm({ name: "", slug: "", logo: "" });
  };

  /* ================= TABLE ================= */

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Thương hiệu",
        render: (brand: Brand) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center p-2 overflow-hidden">
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
                <span className="font-bold text-xs">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="font-medium">{brand.name}</span>
          </div>
        ),
      },
      {
        key: "slug",
        header: "Đường dẫn Website",
        render: (b: Brand) => (
          <span className="text-muted-foreground">{b.slug}</span>
        ),
      },
      {
        key: "productCount",
        header: "Sản phẩm",
        render: (b: Brand) => (
          <Badge variant="secondary">{b.productCount ?? 0} sản phẩm</Badge>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (brand: Brand) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dropdown-content">
              <DropdownMenuItem onClick={() => openEditModal(brand)}>
                <Edit className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  setDeletingBrand(brand);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  /* ================= LOADING STATE ================= */

  if (!initialized && loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Thương hiệu</h1>
          <p className="text-muted-foreground">Quản lý thương hiệu sản phẩm</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm thương hiệu
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Tổng thương hiệu</p>
          <p className="text-2xl font-bold">{totalBrands}</p>
        </div>
        <div className="bg-card p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
          <p className="text-2xl font-bold text-primary">{totalProducts}</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={brands}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Tìm kiếm thương hiệu..."
      />

      {/* ================= ADD / EDIT MODAL ================= */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center modal-overlay">
          <form
            className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 modal-content"
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveBrand();
            }}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold">
                {editingBrand ? "Chỉnh sửa thương hiệu" : "Thêm thương hiệu"}
              </h2>
              <X className="cursor-pointer" onClick={closeBrandModal} />
            </div>

            <Label>Logo (URL ảnh)</Label>
            <Input
              placeholder="https://..."
              value={form.logo}
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
            />

            <Label>Tên thương hiệu</Label>
            <Input
              ref={nameInputRef}
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (nameError) setNameError("");
              }}
              className={nameError ? "border-red-500" : ""}
            />
            {nameError && <p className="text-sm text-red-500">{nameError}</p>}

            <Label>Đường dẫn Website</Label>
            <Input
              value={form.slug}
              onChange={(e) => {
                setForm({ ...form, slug: e.target.value });
                if (slugError) setSlugError("");
              }}
              className={slugError ? "border-red-500" : ""}
            />
            {slugError && <p className="text-sm text-red-500">{slugError}</p>}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={closeBrandModal}
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

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {showDeleteModal && deletingBrand && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center modal-overlay">
          <div className="bg-card w-full max-w-sm rounded-xl p-6 space-y-4 modal-content">
            <h2 className="font-bold text-lg text-center">Xác nhận xóa</h2>

            <p className="text-sm text-center text-muted-foreground">
              Bạn có chắc chắn muốn xóa thương hiệu{" "}
              <span className="font-semibold text-foreground">
                {deletingBrand.name}
              </span>
              ?
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="w-1/2"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingBrand(null);
                }}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                className="w-1/2"
                onClick={confirmDeleteBrand}
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import slugify from "slugify";
import { X, Plus, Upload, Trash2, UploadCloud, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import apiClient from "@/services/api";
import { uploadApi } from "@/services/api";

const productSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  slug: z.string().min(1),
  categoryId: z.string().min(1, "Danh mục là bắt buộc"),
  brandId: z.string().min(1, "Thương hiệu là bắt buộc"),
  description: z.string().min(1, "Mô tả là bắt buộc"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ImageType {
  url: string;
  publicId: string;
}

interface Category {
  _id: string;
  name: string;
  children?: Category[];
}

interface Brand {
  _id: string;
  name: string;
}

interface Spec {
  key: string;
  value: string;
}

interface Variant {
  sku: string;
  price: number;
  stock: number;
  attributes: Attribute[];
}

interface Attribute {
  key: string;
  value: string;
}

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onSuccess?: (newProduct: any) => void;
}

export default function AddProductModal({ open, onOpenChange, initialData, onSuccess }: AddProductModalProps) {
  const categories = useSelector(
    (state: RootState) => state.categories.data,
  ) as Category[];

  const brands = useSelector(
    (state: RootState) => state.brands.data,
  ) as Brand[];

  const flattenCategories = (list: Category[], level = 0): any[] => {
    return list.flatMap((item) => [
      { ...item, level },
      ...(item.children ? flattenCategories(item.children, level + 1) : []),
    ]);
  };

  const flatCategories = useMemo(
    () => flattenCategories(categories || []),
    [categories],
  );

  const [images, setImages] = useState<ImageType[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([
    { key: "", value: "" },
  ]);
  const [variants, setVariants] = useState<Variant[]>([
    { sku: "", price: 0, stock: 0, attributes: [{ key: "", value: "" }] }
  ]);
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
      categoryId: "",
      brandId: "",
      description: "",
    },
  });

  const productName = watch("name");

  useEffect(() => {
    const slug = productName
      ? slugify(productName, {
          lower: true,
          strict: true,
          locale: "vi",
        })
      : "";
    setValue("slug", slug);
  }, [productName, setValue]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name,
          slug: initialData.slug,
          categoryId: initialData.categoryId,
          brandId: initialData.brandId,
          description: initialData.description,
        });
        setSpecs(initialData.specs || [{ key: "", value: "" }]);
        setImages(initialData.images || []);
        setVariants(initialData.variants || [{ sku: "", price: 0, stock: 0, attributes: [{ key: "", value: "" }] }]);
        setIsActive(initialData.status === "active");
      } else {
        reset({
          name: "",
          slug: "",
          categoryId: "",
          brandId: "",
          description: "",
        });
        setSpecs([{ key: "", value: "" }]);
        setImages([]);
        setVariants([{ sku: "", price: 0, stock: 0, attributes: [{ key: "", value: "" }] }]);
        setIsActive(true);
      }
    }
  }, [open, initialData, reset]);

  const uploadImageToServer = async (
    files: FileList | File[],
  ): Promise<ImageType[] | undefined> => {
    try {
      setUploading(true);

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const res = await uploadApi.uploadMultiple(formData);

      const data = res.data?.data || res.data;
      const uploadedImages = data.images || data;

      if (!uploadedImages) throw new Error("Không nhận được dữ liệu ảnh từ server");

      return Array.isArray(uploadedImages) ? uploadedImages : [uploadedImages];
    } catch (error: any) {
      console.error("Upload Error:", error);
      const errorMsg = error.response?.data?.message || error.message || "Upload thất bại";
      toast({
        title: "Lỗi tải ảnh",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const results = await uploadImageToServer(e.target.files);

    if (results?.length) {
      setImages((prev) => [...prev, ...results]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const addSpec = () => {
    setSpecs((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeSpec = (index: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSpec = (index: number, field: "key" | "value", val: string) => {
    setSpecs((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: val } : s))
    );
  };

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: "",
        price: 0,
        stock: 0,
        attributes: [{ key: "", value: "" }],
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  const addVariantAttribute = (variantIndex: number) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? { ...v, attributes: [...v.attributes, { key: "", value: "" }] }
          : v
      )
    );
  };

  const removeVariantAttribute = (variantIndex: number, attrIndex: number) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              attributes: v.attributes.filter((_, j) => j !== attrIndex),
            }
          : v
      )
    );
  };

  const updateVariantAttribute = (
    variantIndex: number,
    attrIndex: number,
    field: "key" | "value",
    val: string
  ) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              attributes: v.attributes.map((a, j) =>
                j === attrIndex ? { ...a, [field]: val } : a
              ),
            }
          : v
      )
    );
  };

  const onSubmit = async (data: ProductFormData) => {
    // Validate variants
    if (variants.length === 0) {
      toast({ title: "Sản phẩm phải có ít nhất 1 biến thể", variant: "destructive" });
      return;
    }

    // Validate SKU không trùng
    const skus = variants.map((v) => v.sku.trim());
    const unique = new Set(skus);

    if (skus.some((s) => !s) || unique.size !== skus.length) {
      toast({ title: "SKU không được trống và không được trùng", variant: "destructive" });
      return;
    }

    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      categoryId: data.categoryId,
      brandId: data.brandId,
      images: images.map((img) => ({
        url: img.url,
        publicId: img.publicId || null,
      })),
      specs: specs.filter((s) => s.key.trim() && s.value.trim()),
      variants: variants.map((v) => ({
        sku: v.sku.trim(),
        price: Number(v.price),
        stock: Number(v.stock),
        attributes: v.attributes.filter((a) => a.key.trim() && a.value.trim()),
        status: "active",
      })),
      status: isActive ? "active" : "inactive",
    };

    try {
      const url = initialData
        ? `/admin/products/${initialData._id}`
        : `/admin/products`;
      const method = initialData ? "put" : "post";

      await (apiClient[method] as any)(url, payload);

      toast({
        title: initialData ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!",
      });

      reset();
      setImages([]);
      setSpecs([{ key: "", value: "" }]);
      setVariants([{ sku: "", price: 0, stock: 0, attributes: [{ key: "", value: "" }] }]);
      onOpenChange(false);
      onSuccess?.(payload);
    } catch (error: any) {
      console.error("Submit Error:", error);
      const errorMsg = error.response?.data?.message || error.message || "Lỗi khi lưu sản phẩm";
      toast({
        title: "Lỗi",
        description: errorMsg,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold">
            {initialData ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(90vh-160px)] px-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
                <TabsTrigger value="variants">Biến thể</TabsTrigger>
                <TabsTrigger value="media">Hình ảnh</TabsTrigger>
                <TabsTrigger value="specs">Thông số</TabsTrigger>
                <TabsTrigger value="settings">Cài đặt</TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Info */}
              <TabsContent value="basic" className="space-y-5 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">
                      Tên sản phẩm <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="VD: iPhone 15 Pro Max 256GB"
                      {...register("name")}
                      className="mt-1.5"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      placeholder="tu-dong-tao-tu-ten"
                      {...register("slug")}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="categoryId">
                      Danh mục <span className="text-destructive">*</span>
                    </Label>
                    <Select onValueChange={(v) => setValue("categoryId", v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {flatCategories.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {"  ".repeat(c.level)}{c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="brandId">
                      Thương hiệu <span className="text-destructive">*</span>
                    </Label>
                    <Select onValueChange={(v) => setValue("brandId", v)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Chọn thương hiệu" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => (
                          <SelectItem key={b._id} value={b._id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.brandId && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.brandId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">
                      Mô tả chi tiết <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Mô tả đầy đủ về sản phẩm, tính năng nổi bật..."
                      rows={5}
                      {...register("description")}
                      className="mt-1.5"
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.description.message}
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Variants */}
              <TabsContent value="variants" className="space-y-5 mt-0">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Biến thể sản phẩm</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariant}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Thêm biến thể
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {variants.map((variant, i) => (
                      <div key={i} className="border border-border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Biến thể {i + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariant(i)}
                            disabled={variants.length === 1}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`variant-sku-${i}`}>
                              SKU <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`variant-sku-${i}`}
                              placeholder="VD: IP15PM-256-BK"
                              value={variant.sku}
                              onChange={(e) => updateVariant(i, "sku", e.target.value)}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`variant-price-${i}`}>
                              Giá (VNĐ) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`variant-price-${i}`}
                              type="number"
                              placeholder="0"
                              value={variant.price}
                              onChange={(e) => updateVariant(i, "price", Number(e.target.value))}
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`variant-stock-${i}`}>Tồn kho</Label>
                            <Input
                              id={`variant-stock-${i}`}
                              type="number"
                              placeholder="0"
                              value={variant.stock}
                              onChange={(e) => updateVariant(i, "stock", Number(e.target.value))}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label>Thuộc tính</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addVariantAttribute(i)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Thêm thuộc tính
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {variant.attributes.map((attr, j) => (
                              <div key={j} className="flex items-center gap-2">
                                <Input
                                  placeholder="VD: Màu sắc"
                                  value={attr.key}
                                  onChange={(e) => updateVariantAttribute(i, j, "key", e.target.value)}
                                  className="flex-1"
                                />
                                <Input
                                  placeholder="VD: Đỏ"
                                  value={attr.value}
                                  onChange={(e) => updateVariantAttribute(i, j, "value", e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeVariantAttribute(i, j)}
                                  disabled={variant.attributes.length === 1}
                                >
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Images */}
              <TabsContent value="media" className="space-y-5 mt-0">
                <div>
                  <Label className="mb-3 block">Hình ảnh sản phẩm</Label>
                  <div className="grid grid-cols-4 gap-4">
                    {images.map((img, i) => (
                      <div
                        key={i}
                        className="relative group rounded-xl overflow-hidden border border-border aspect-square"
                      >
                        <Image
                          src={img.url}
                          alt={`Product ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                        {i === 0 && (
                          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                            Ảnh chính
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="border-2 border-dashed border-border rounded-xl aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {uploading ? (
                        <UploadCloud className="h-6 w-6 animate-pulse" />
                      ) : (
                        <Upload className="h-6 w-6" />
                      )}
                      <span className="text-xs font-medium">
                        {uploading ? "Đang tải..." : "Tải ảnh lên"}
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Hỗ trợ JPG, PNG, WebP. Tối đa 5MB/ảnh. Ảnh đầu tiên sẽ là ảnh chính.
                  </p>
                </div>
              </TabsContent>

              {/* Tab 4: Specs */}
              <TabsContent value="specs" className="space-y-5 mt-0">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Thông số kỹ thuật</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSpec}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Thêm thông số
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {specs.map((spec, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Input
                          placeholder="VD: RAM"
                          value={spec.key}
                          onChange={(e) => updateSpec(i, "key", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="VD: 8GB"
                          value={spec.value}
                          onChange={(e) => updateSpec(i, "value", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeSpec(i)}
                          disabled={specs.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 5: Settings */}
              <TabsContent value="settings" className="space-y-5 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/5">
                    <div>
                      <p className="font-medium text-foreground">
                        Trạng thái hiển thị
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Sản phẩm sẽ hiển thị trên website khi bật
                      </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={uploading}>
              <Plus className="h-4 w-4 mr-1" />
              {initialData ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
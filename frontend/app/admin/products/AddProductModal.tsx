"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import slugify from "slugify";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

/* ================= SCHEMA ================= */

const productSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  slug: z.string().min(1),
  categoryId: z.string().min(1, "Danh mục là bắt buộc"),
  brandId: z.string().min(1, "Thương hiệu là bắt buộc"),
  description: z.string().min(1, "Mô tả là bắt buộc"),
});

type ProductFormData = z.infer<typeof productSchema>;

/* ================= TYPES ================= */

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

interface Attribute {
  key: string;
  value: string;
}

interface Variant {
  sku: string;
  price: number;
  stock: number;
  attributes: Attribute[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ================= COMPONENT ================= */

export default function AddProductModal({ open, onOpenChange }: Props) {
  /* ================= REDUX ================= */

  const categories = useSelector(
    (state: RootState) => state.categories.data,
  ) as Category[];

  const brands = useSelector(
    (state: RootState) => state.brands.data,
  ) as Brand[];

  /* ================= FLATTEN CATEGORY ================= */

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

  /* ================= STATE ================= */

  const [variants, setVariants] = useState<Variant[]>([]);
  const [images, setImages] = useState<ImageType[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isActive, setIsActive] = useState(true);

  /* ================= FORM ================= */

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  /* ================= AUTO SLUG ================= */

  useEffect(() => {
    const slug = slugify(productName || "", {
      lower: true,
      strict: true,
      locale: "vi",
    });

    setValue("slug", slug);
  }, [productName, setValue]);

  /* ================= RESET WHEN CLOSE MODAL ================= */

  useEffect(() => {
    if (!open) {
      reset();
      setVariants([]);
      setImages([]);
      setIsActive(true);
      setImageUrlInput("");
    }
  }, [open, reset]);

  /* ================= UPLOAD IMAGE ================= */

  const uploadImageToServer = async (
    file: File,
  ): Promise<ImageType[] | undefined> => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("files", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/products/upload-multiple`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      return data.images;
    } catch (error) {
      console.error(error);
      toast.error("Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const results = await uploadImageToServer(e.target.files[0]);

    if (results?.length) {
      setImages((prev) => [...prev, ...results]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddImageByUrl = () => {
    if (!imageUrlInput.trim()) return;

    setImages((prev) => [
      ...prev,
      {
        url: imageUrlInput,
        publicId: "",
      },
    ]);

    setImageUrlInput("");
  };

  /* ================= VARIANTS ================= */

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

  const updateAttribute = (
    vIndex: number,
    aIndex: number,
    field: "key" | "value",
    value: string,
  ) => {
    const newVariants = [...variants];
    newVariants[vIndex].attributes[aIndex][field] = value;
    setVariants(newVariants);
  };

  const addAttribute = (vIndex: number) => {
    const newVariants = [...variants];
    newVariants[vIndex].attributes.push({ key: "", value: "" });
    setVariants(newVariants);
  };

  /* ================= SUBMIT ================= */

  const onSubmit = async (data: ProductFormData) => {
    if (variants.length === 0) {
      toast.error("Sản phẩm phải có ít nhất 1 biến thể");
      return;
    }

    // Validate SKU không trùng
    const skus = variants.map((v) => v.sku.trim());
    const unique = new Set(skus);

    if (skus.includes("") || unique.size !== skus.length) {
      toast.error("SKU không được trống và không được trùng");
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error();

      toast.success("Thêm sản phẩm thành công!");

      reset();
      setVariants([]);
      setImages([]);
      setIsActive(true);
      onOpenChange(false);
    } catch {
      toast.error("Tạo sản phẩm thất bại");
    }
  };

  /* ================= UI ================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] p-0">
        <DialogHeader className="px-8 pt-6">
          <DialogTitle className="text-2xl font-bold">
            Thêm sản phẩm mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(80vh-160px)] px-8 py-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid grid-cols-3 mb-8">
                <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
                <TabsTrigger value="images">Hình ảnh</TabsTrigger>
                <TabsTrigger value="variants">Biến thể</TabsTrigger>
              </TabsList>

              {/* ================= BASIC INFO ================= */}
              <TabsContent value="basic" className="space-y-6 p-1">
                <div className="grid grid-cols-2 gap-6">
                  {/* Tên sản phẩm */}
                  <div className="space-y-2">
                    <Label>
                      Tên sản phẩm <span className="text-destructive">*</span>
                    </Label>
                    <Input {...register("name")} className="mt-1.5" />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label>Đường dẫn (tự động)</Label>
                    <Input
                      {...register("slug")}
                      disabled
                      className="mt-1.5 bg-muted cursor-not-allowed"
                    />
                  </div>

                  {/* Danh mục */}
                  <div className="space-y-2">
                    <Label>
                      Danh mục <span className="text-destructive">*</span>
                    </Label>

                    <Select
                      value={watch("categoryId")}
                      onValueChange={(value) =>
                        setValue("categoryId", value, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>

                      <SelectContent className="max-h-60 overflow-y-auto border border-border shadow-md">
                        {flatCategories.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {"— ".repeat(c.level)} {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {errors.categoryId && (
                      <p className="text-sm text-destructive">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>

                  {/* Thương hiệu */}
                  <div className="space-y-2">
                    <Label>
                      Thương hiệu <span className="text-destructive">*</span>
                    </Label>

                    <Select
                      value={watch("brandId")}
                      onValueChange={(value) =>
                        setValue("brandId", value, { shouldValidate: true })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Chọn thương hiệu" />
                      </SelectTrigger>

                      <SelectContent className="max-h-60 overflow-y-auto border border-border shadow-md">
                        {brands.map((b) => (
                          <SelectItem key={b._id} value={b._id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {errors.brandId && (
                      <p className="text-sm text-destructive">
                        {errors.brandId.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mô tả */}
                <div className="space-y-2">
                  <Label>
                    Mô tả sản phẩm <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    {...register("description")}
                    className="mt-1.5"
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* ================= IMAGES ================= */}
              <TabsContent value="images" className="space-y-6 p-1">
                <Label>Hình ảnh sản phẩm</Label>

                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-border p-6 text-center rounded-lg hover:border-primary transition">
                    {uploading ? "Đang upload..." : "Click để tải ảnh"}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAddImage}
                  />
                </label>

                {/* Hoặc nhập URL */}
                <div className="space-y-2">
                  <Label>Hoặc nhập URL ảnh</Label>

                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                    />

                    <Button type="button" onClick={handleAddImageByUrl}>
                      Thêm
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative border rounded-xl overflow-hidden aspect-square"
                    >
                      <div className="relative w-full h-full">
                        <Image
                          src={img.url}
                          alt="product"
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ================= VARIANTS ================= */}
              <TabsContent value="variants" className="space-y-6 p-1">
                <Button type="button" onClick={addVariant}>
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm biến thể
                </Button>

                {variants.map((v, i) => (
                  <div key={i} className="border p-6 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Biến thể #{i + 1}</h3>
                      <Trash2
                        className="w-4 h-4 text-destructive cursor-pointer"
                        onClick={() => removeVariant(i)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        placeholder="SKU"
                        value={v.sku}
                        onChange={(e) =>
                          updateVariant(i, "sku", e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Giá"
                        value={v.price}
                        onChange={(e) =>
                          updateVariant(i, "price", +e.target.value)
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Tồn kho"
                        value={v.stock}
                        onChange={(e) =>
                          updateVariant(i, "stock", +e.target.value)
                        }
                      />
                    </div>

                    {v.attributes.map((a, j) => (
                      <div key={j} className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Thuộc tính"
                          value={a.key}
                          onChange={(e) =>
                            updateAttribute(i, j, "key", e.target.value)
                          }
                        />
                        <Input
                          placeholder="Giá trị"
                          value={a.value}
                          onChange={(e) =>
                            updateAttribute(i, j, "value", e.target.value)
                          }
                        />
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addAttribute(i)}
                    >
                      Thêm thuộc tính
                    </Button>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <Separator />

          <div className="flex justify-end px-8 py-4">
            <div className="flex gap-3 w-full max-w-md">
              <Button
                type="button"
                variant="outline"
                className="w-1/2"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>

              <Button type="submit" className="w-1/2" disabled={uploading}>
                {uploading ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import slugify from "slugify";
import { 
  Plus, 
  Trash2, 
  X, 
  UploadCloud, 
  Image as ImageIcon, 
  Package, 
  Layers, 
  List, 
  Tags,
  Save,
  Info,
  DollarSign,
  Box,
  Barcode
} from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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

  const [variants, setVariants] = useState<Variant[]>([
    { sku: "", price: 0, stock: 0, attributes: [{ key: "", value: "" }] }
  ]);
  const [specs, setSpecs] = useState<Attribute[]>([]);
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
    if (!productName) return;
    const slug = slugify(productName, {
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
      setVariants([{ sku: "", price: 0, stock: 0, attributes: [{ key: "", value: "" }] }]);
      setSpecs([]);
      setImages([]);
      setIsActive(true);
      setImageUrlInput("");
    }
  }, [open, reset]);

  /* ================= UPLOAD IMAGE ================= */

  const uploadImageToServer = async (
    files: FileList | File[],
  ): Promise<ImageType[] | undefined> => {
    try {
      setUploading(true);

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

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
      toast({ title: "Upload thất bại", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const results = await uploadImageToServer(e.target.files);

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

  /* ================= SPECS ================= */

  const addSpec = () => {
    setSpecs((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeSpec = (index: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSpec = (index: number, field: "key" | "value", value: string) => {
    setSpecs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
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

  const removeAttribute = (vIndex: number, aIndex: number) => {
    const newVariants = [...variants];
    newVariants[vIndex].attributes = newVariants[vIndex].attributes.filter(
      (_, i) => i !== aIndex
    );
    setVariants(newVariants);
  };

  /* ================= SUBMIT ================= */

  const onSubmit = async (data: ProductFormData) => {
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
      
      // Filter images
      images: images.map((img) => ({
        url: img.url,
        publicId: img.publicId || null,
      })),

      // Filter specs
      specs: specs.filter((s) => s.key.trim() && s.value.trim()),

      // Filter variants
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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Tạo sản phẩm thất bại");
      }

      toast({ title: "Thêm sản phẩm thành công!", variant: "success" });

      reset();
      setVariants([]);
      setSpecs([]);
      setImages([]);
      setIsActive(true);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: err.message || "Tạo sản phẩm thất bại", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-border/60 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20">
          <DialogTitle className="text-xl font-bold flex items-center gap-3 text-primary relative">
            <Package className="h-6 w-6" />
            Thêm sản phẩm mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full">
              <div className="p-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-8 sticky top-0 bg-background/80 backdrop-blur-md z-30 shadow-sm border border-border/40 p-1.5 h-auto rounded-xl">
                    <TabsTrigger value="basic" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 transition-all">
                        <Info className="w-4 h-4 mr-2" />
                        Thông tin cơ bản
                    </TabsTrigger>
                    <TabsTrigger value="images" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 transition-all">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Hình ảnh & Media
                    </TabsTrigger>
                    <TabsTrigger value="specs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 transition-all">
                        <List className="w-4 h-4 mr-2" />
                        Thông số kỹ thuật
                    </TabsTrigger>
                    <TabsTrigger value="variants" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 transition-all">
                        <Tags className="w-4 h-4 mr-2" />
                        Biến thể & Giá
                    </TabsTrigger>
                  </TabsList>

                  {/* ================= BASIC INFO ================= */}
                  <TabsContent value="basic" className="space-y-8 mt-2 animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left Column (Main Info) */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-6">
                            <h3 className="font-semibold flex items-center text-foreground/80 text-lg">
                                <Package className="w-5 h-5 mr-2 text-primary" /> Thông tin chính
                            </h3>
                            <Separator className="bg-border/50" />
                            
                            <div className="space-y-3">
                              <Label className="text-base">Tên sản phẩm <span className="text-destructive">*</span></Label>
                              <Input 
                                {...register("name")} 
                                placeholder="VD: Laptop Dell XPS 15 9530..." 
                                className="h-12 text-lg bg-background/50 focus:bg-background transition-colors" 
                              />
                              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-3">
                              <Label className="text-base">Mô tả chi tiết <span className="text-destructive">*</span></Label>
                              <Textarea 
                                rows={12} 
                                {...register("description")} 
                                placeholder="Mô tả chi tiết về sản phẩm, tính năng nổi bật..." 
                                className="resize-y min-h-[200px] bg-background/50 focus:bg-background transition-colors leading-relaxed"
                              />
                              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                            </div>
                        </div>
                      </div>

                      {/* Right Column (Configuration) */}
                      <div className="space-y-6">
                        <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-6 sticky top-2">
                           <h3 className="font-semibold flex items-center text-foreground/80 text-lg">
                                <Layers className="w-5 h-5 mr-2 text-primary" /> Phân loại
                            </h3>
                            <Separator className="bg-border/50" />

                             <div className="space-y-3">
                                <Label>Danh mục <span className="text-destructive">*</span></Label>
                                <Select
                                  value={watch("categoryId")}
                                  onValueChange={(value) => setValue("categoryId", value, { shouldValidate: true })}
                                >
                                  <SelectTrigger className="h-10 bg-background/50">
                                    <SelectValue placeholder="Chọn danh mục" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {flatCategories.map((c) => (
                                      <SelectItem key={c._id} value={c._id}>
                                        <span style={{ paddingLeft: `${c.level * 10}px` }}>
                                          {c.level > 0 ? "— " : ""}
                                          {c.name}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
                              </div>

                              <div className="space-y-3">
                                <Label>Thương hiệu <span className="text-destructive">*</span></Label>
                                <Select
                                  value={watch("brandId")}
                                  onValueChange={(value) => setValue("brandId", value, { shouldValidate: true })}
                                >
                                  <SelectTrigger className="h-10 bg-background/50">
                                    <SelectValue placeholder="Chọn thương hiệu" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-60">
                                    {brands.map((b) => (
                                      <SelectItem key={b._id} value={b._id}>
                                        {b.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {errors.brandId && <p className="text-sm text-destructive">{errors.brandId.message}</p>}
                              </div>

                               <Separator className="bg-border/50 dashed" />

                             <div className="space-y-3">
                              <Label className="flex items-center justify-between">
                                  Đường dẫn tĩnh (Slug)
                                  <span className="text-xs text-muted-foreground font-normal">Auto-generated</span>
                              </Label>
                              <Input 
                                {...register("slug")} 
                                readOnly 
                                className="bg-muted/50 text-muted-foreground cursor-not-allowed border-dashed h-9 text-xs font-mono" 
                              />
                            </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ================= IMAGES ================= */}
                  <TabsContent value="images" className="space-y-6 mt-2 animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
                    <div className="flex flex-col gap-2 mb-4">
                      <h3 className="font-semibold text-lg flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-primary" />
                        Thư viện ảnh
                      </h3>
                      <p className="text-sm text-muted-foreground">Quản lý hình ảnh sản phẩm. Ảnh đầu tiên sẽ là ảnh đại diện.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Upload Area */}
                        <div className="lg:col-span-1 space-y-4">
                             <label className="group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-2xl aspect-square bg-primary/5 hover:bg-primary/10 transition-all duration-300 relative overflow-hidden">
                                <div className="text-center p-6 space-y-4 group-hover:scale-105 transition-transform z-10 relative">
                                  {uploading ? (
                                    <div className="flex flex-col items-center gap-3">
                                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                      <span className="font-medium text-primary">Đang tải lên...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="bg-background rounded-full p-4 shadow-sm mx-auto group-hover:shadow-md transition-shadow">
                                        <UploadCloud className="w-8 h-8 text-primary" />
                                      </div>
                                      <div>
                                          <span className="font-bold text-primary block text-lg mb-1">Tải ảnh lên</span>
                                          <span className="text-xs text-muted-foreground block">JPG, PNG, WEBP</span>
                                          <span className="text-xs text-muted-foreground block">(Max 5MB)</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  multiple
                                  disabled={uploading}
                                  onChange={handleAddImage}
                                />
                              </label>

                              <div className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
                                  <Label className="text-xs font-semibold uppercase text-muted-foreground">Hoặc nhập URL</Label>
                                  <div className="flex gap-2">
                                      <Input 
                                          className="flex-1 bg-background"
                                          placeholder="https://..." 
                                          value={imageUrlInput}
                                          onChange={(e) => setImageUrlInput(e.target.value)}
                                      />
                                      <Button type="button" onClick={handleAddImageByUrl} size="sm">Thêm</Button>
                                  </div>
                              </div>
                        </div>
                        
                        {/* Image Grid */}
                        <div className="lg:col-span-2">
                             <div className="bg-card border rounded-2xl p-6 shadow-sm min-h-[400px]">
                                {images.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                      {images.map((img, i) => (
                                        <div key={i} className="group relative border rounded-xl overflow-hidden aspect-square shadow-sm bg-background hover:shadow-md hover:ring-2 ring-primary transition-all duration-200">
                                          <Image
                                            src={img.url}
                                            alt="product"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 300px"
                                          />
                                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => removeImage(i)}
                                                className="rounded-full shadow-lg h-9 w-9"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                          </div>
                                          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md shadow-sm font-mono">
                                              #{i + 1}
                                          </div>
                                          {i === 0 && (
                                              <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full shadow-sm font-bold">
                                                  MAIN
                                              </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-4">
                                        <ImageIcon className="w-16 h-16" />
                                        <p className="text-lg font-medium">Chưa có hình ảnh nào</p>
                                    </div>
                                )}
                             </div>
                        </div>
                    </div>
                  </TabsContent>

                  {/* ================= SPECS ================= */}
                  <TabsContent value="specs" className="space-y-6 mt-2 animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
                    <div className="flex justify-between items-center border-b border-border/50 pb-4">
                        <div>
                            <h3 className="font-semibold text-lg flex items-center">
                                <List className="w-5 h-5 mr-2 text-primary" /> Thông số kỹ thuật
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">Hiển thị trong bảng thông số chi tiết của sản phẩm</p>
                        </div>
                        <Button type="button" onClick={addSpec} size="sm" className="gap-2 shadow-sm">
                            <Plus className="w-4 h-4"/> Thêm dòng
                        </Button>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        {specs.length === 0 ? (
                             <div className="text-center py-16 bg-muted/10 border-2 border-dashed border-muted-foreground/20 rounded-2xl flex flex-col items-center gap-4">
                                <div className="bg-muted/30 p-4 rounded-full">
                                    <List className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-foreground">Chưa có thông số kỹ thuật</p>
                                    <p className="text-muted-foreground text-sm">Thêm các thông số như RAM, CPU, Kích thước...</p>
                                </div>
                                <Button variant="outline" onClick={addSpec}>Thêm thông số ngay</Button>
                             </div>
                        ) : (
                            <div className="space-y-3">
                                {specs.map((item, i) => (
                                  <div key={i} className="flex gap-4 items-center group bg-card border rounded-xl p-3 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex-none w-8 flex justify-center text-muted-foreground font-mono text-sm">
                                        {i + 1}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                         <Input
                                          placeholder="Tên thông số (VD: RAM)"
                                          value={item.key}
                                          onChange={(e) => updateSpec(i, "key", e.target.value)}
                                          className="bg-transparent border-transparent hover:border-input focus:border-input transition-all font-medium"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground hidden sm:inline">:</span>
                                            <Input
                                              placeholder="Giá trị (VD: 16GB LPDDR5)"
                                              value={item.value}
                                              onChange={(e) => updateSpec(i, "value", e.target.value)}
                                              className="bg-transparent border-transparent hover:border-input focus:border-input transition-all"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeSpec(i)}
                                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                            </div>
                        )}
                    </div>
                  </TabsContent>

                  {/* ================= VARIANTS ================= */}
                  <TabsContent value="variants" className="space-y-6 mt-2 animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
                    <div className="flex justify-between items-center border-b border-border/50 pb-4">
                        <div>
                            <h3 className="font-semibold text-lg flex items-center">
                                <Tags className="w-5 h-5 mr-2 text-primary" /> Quản lý biến thể (SKU)
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">Mỗi biến thể tương ứng với một mã kho (SKU) riêng biệt</p>
                        </div>
                        <Button type="button" onClick={addVariant} size="sm" className="gap-2 shadow-sm">
                            <Plus className="w-4 h-4"/> Thêm biến thể
                        </Button>
                    </div>
                
                    <div className="space-y-6">
                        {variants.length === 0 ? (
                             <div className="text-center py-16 bg-destructive/5 border-2 border-dashed border-destructive/20 rounded-2xl">
                                <p className="text-destructive font-semibold">Bắt buộc phải có ít nhất 1 biến thể.</p>
                                <Button variant="link" className="text-destructive underline" onClick={addVariant}>Thêm biến thể</Button>
                             </div>
                        ) : (
                             variants.map((v, i) => (
                              <div key={i} className="bg-card border border-border/60 shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 group">
                                <div className="bg-muted/30 px-6 py-4 border-b border-border/50 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="font-mono bg-background shadow-sm">#{i + 1}</Badge>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-foreground/80">Biến thể sản phẩm</span>
                                            <span className="text-xs text-muted-foreground font-mono">{v.sku || "Chưa có SKU"}</span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeVariant(i)}
                                        className="text-muted-foreground hover:text-destructive h-8 opacity-70 group-hover:opacity-100 transition-opacity bg-background border border-transparent hover:border-border shadow-sm"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1.5" /> Xóa
                                    </Button>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                <Barcode className="w-3 h-3" /> Mã SKU
                                            </Label>
                                            <Input
                                              placeholder="VD: IP15-PRO-256-BLK"
                                              className="font-mono bg-background/50"
                                              value={v.sku}
                                              onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                            />
                                        </div>
                                         <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" /> Giá bán (VNĐ)
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                  type="number"
                                                  className="font-mono pl-8 bg-background/50"
                                                  min={0}
                                                  value={v.price}
                                                  onChange={(e) => updateVariant(i, "price", e.target.value)}
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                            </div>
                                        </div>
                                         <div className="space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                <Box className="w-3 h-3" /> Tồn kho
                                            </Label>
                                            <Input
                                              type="number"
                                              className="font-mono bg-background/50"
                                              min={0}
                                              value={v.stock}
                                              onChange={(e) => updateVariant(i, "stock", e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-muted/10 rounded-xl p-5 space-y-4 border border-dashed border-border/60">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-sm font-semibold flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-primary/70" />
                                                Thuộc tính định danh
                                            </Label>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-xs bg-background shadow-sm"
                                              onClick={() => addAttribute(i)}
                                            >
                                              <Plus className="w-3 h-3 mr-1" /> Thêm thuộc tính
                                            </Button>
                                        </div>
                                        
                                        <div className="grid gap-3">
                                            {v.attributes.map((a, j) => (
                                              <div key={j} className="grid grid-cols-[1fr,1fr,auto] gap-3 items-center group/attr">
                                                <Input
                                                  placeholder="Tên (VD: Màu sắc)"
                                                  className="h-9 bg-background shadow-sm focus:ring-1"
                                                  value={a.key}
                                                  onChange={(e) => updateAttribute(i, j, "key", e.target.value)}
                                                />
                                                <Input
                                                  placeholder="Giá trị (VD: Xanh Titan)"
                                                  className="h-9 bg-background shadow-sm focus:ring-1"
                                                  value={a.value}
                                                  onChange={(e) => updateAttribute(i, j, "value", e.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-50 group-hover/attr:opacity-100 transition-opacity"
                                                    onClick={() => removeAttribute(i, j)}
                                                >
                                                    <X className="w-4 h-4"/>
                                                </Button>
                                              </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                              </div>
                            ))
                        )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 border-t border-border/40 bg-background/80 backdrop-blur-md flex justify-end gap-3 sticky bottom-0 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-24 border-border/60 hover:bg-muted">
              Hủy
            </Button>
            <Button type="submit" disabled={uploading} className="w-40 shadow-md">
              {uploading ? (
                 <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></span>
                    Đang lưu...
                 </>
              ) : (
                <>
                    <Save className="w-4 h-4 mr-2" /> Lưu sản phẩm
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

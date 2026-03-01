"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useForm, Controller } from "react-hook-form";
import "react-quill-new/dist/quill.snow.css";

// CSS for Quill Editor to look better
const quillStyles = `
  .ql-container {
    min-height: 200px;
    font-size: 0.875rem;
    font-family: inherit;
  }
  .ql-editor {
    min-height: 200px;
  }
  .ql-toolbar.ql-snow {
    border-top: none;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid hsl(var(--border));
    background-color: hsl(var(--muted)/0.2);
  }
  .ql-container.ql-snow {
    border: none;
  }
`;
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import slugify from "slugify";
import { X, Plus, Upload, Trash2, UploadCloud, Search, ChevronDown, Check, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  description: z.string().refine((val) => {
    const stripped = val.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0;
  }, "Mô tả sản phẩm là bắt buộc"),
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
  discountPercentage: number;
  stock: number;
  attributes: Attribute[];
  image?: ImageType;
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

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full bg-muted animate-pulse rounded-md" />,
});

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
];

const generateSKU = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

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
    { sku: generateSKU(), price: 0, discountPercentage: 0, stock: 0, attributes: [{ key: "", value: "" }], image: undefined }
  ]);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [variantUploadingIndex, setVariantUploadingIndex] = useState<number | null>(null);
  const [catSearch, setCatSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const catInputRef = useRef<HTMLInputElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (catOpen) {
      setTimeout(() => catInputRef.current?.focus(), 50);
    }
  }, [catOpen]);

  useEffect(() => {
    if (brandOpen) {
      setTimeout(() => brandInputRef.current?.focus(), 50);
    }
  }, [brandOpen]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
    control,
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

  const selectedCategory = useMemo(() => 
    flatCategories.find(c => c._id === watch("categoryId")),
    [flatCategories, watch("categoryId")]
  );

  const selectedBrand = useMemo(() => 
    brands.find(b => b._id === watch("brandId")),
    [brands, watch("brandId")]
  );

  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name,
          slug: initialData.slug,
          categoryId: typeof initialData.categoryId === "object" ? initialData.categoryId?._id : (initialData.categoryId || initialData.category?._id),
          brandId: typeof initialData.brandId === "object" ? initialData.brandId?._id : (initialData.brandId || initialData.brand?._id),
          description: initialData.description,
        });
        setSpecs(initialData.specs || [{ key: "", value: "" }]);
        setImages(initialData.images || []);
        setVariants(initialData.variants || [{ sku: generateSKU(), price: 0, discountPercentage: 0, stock: 0, attributes: [{ key: "", value: "" }], image: undefined }]);
        setIsActive(initialData.status === "active");
        setIsFeatured(initialData.isFeatured || false);
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
        setVariants([{ sku: generateSKU(), price: 0, discountPercentage: 0, stock: 0, attributes: [{ key: "", value: "" }], image: undefined }]);
        setIsActive(true);
        setIsFeatured(false);
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
        sku: generateSKU(),
        price: 0,
        discountPercentage: 0,
        stock: 0,
        attributes: [{ key: "", value: "" }],
        image: undefined,
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

  const handleVariantImageUpload = async (variantIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setVariantUploadingIndex(variantIndex);
    const results = await uploadImageToServer(e.target.files);
    if (results?.length) {
      updateVariant(variantIndex, "image", results[0]);
    }
    setVariantUploadingIndex(null);
  };

  const removeVariantImage = (variantIndex: number) => {
    updateVariant(variantIndex, "image", undefined);
  };

  const onSubmit = async (data: ProductFormData) => {
    // Validate variants
    if (variants.length === 0) {
      toast({ 
        title: "Thiếu thông tin", 
        description: "Sản phẩm phải có ít nhất một biến thể để lưu.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate images
    if (images.length === 0) {
      toast({ 
        title: "Thiếu thông tin", 
        description: "Vui lòng tải lên ít nhất một ảnh sản phẩm.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate specs
    const validSpecs = specs.filter((s) => s.key.trim() && s.value.trim());
    if (validSpecs.length === 0) {
      toast({ 
        title: "Thiếu thông tin", 
        description: "Vui lòng nhập ít nhất một thông số kỹ thuật đầy đủ.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate variants content
    const invalidVariants = variants.some(v => 
      v.price <= 0 || 
      v.attributes.filter((a) => a.key.trim() && a.value.trim()).length === 0
    );

    if (invalidVariants) {
      toast({ 
        title: "Lỗi dữ liệu", 
        description: "Vui lòng nhập đầy đủ thông tin cho các biến thể sản phẩm.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate SKU không trùng
    const skus = variants.map((v) => v.sku.trim());
    const unique = new Set(skus);

    if (skus.some((s) => !s) || unique.size !== skus.length) {
      toast({ 
        title: "Lỗi dữ liệu", 
        description: "Mã SKU không được để trống và không được trùng lặp giữa các biến thể.", 
        variant: "destructive" 
      });
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
      specs: validSpecs,
      variants: variants.map((v) => ({
        sku: v.sku.trim(),
        price: Number(v.price),
        discountPercentage: Number(v.discountPercentage || 0),
        stock: Number(v.stock),
        attributes: v.attributes.filter((a) => a.key.trim() && a.value.trim()),
        image: v.image ? { url: v.image.url, publicId: v.image.publicId } : null,
        status: "active",
      })),
      status: isActive ? "active" : "inactive",
      isFeatured: isFeatured,
    };

    try {
      setIsSubmitting(true);
      const url = initialData
        ? `/admin/products/${initialData._id}`
        : `/admin/products`;
      const method = initialData ? "put" : "post";

      await (apiClient[method] as any)(url, payload);

      toast({
        variant: "success",
        title: "Thành công",
        description: initialData ? "Đã cập nhật thông tin sản phẩm thành công." : "Đã thêm sản phẩm mới thành công.",
      });

      reset();
      setImages([]);
      setSpecs([{ key: "", value: "" }]);
      setVariants([{ sku: generateSKU(), price: 0, discountPercentage: 0, stock: 0, attributes: [{ key: "", value: "" }], image: undefined }]);
      setIsFeatured(false);
      onSuccess?.(payload);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Submit Error:", error);
      const errorData = error.response?.data;
      const errorMsg = errorData?.message || "Đã xảy ra lỗi khi lưu thông tin sản phẩm. Vui lòng thử lại.";

      toast({
        title: "Lỗi hệ thống",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestClose = () => {
    onOpenChange(false);
  };

  const onDialogChange = (isOpen: boolean) => {
    // If user tries to close the dialog, show confirmation
    if (!isOpen && isDirty) {
      setShowExitConfirm(true);
    } else {
      onOpenChange(isOpen);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onDialogChange}>
        <style>{quillStyles}</style>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold">
            {initialData ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(90vh-160px)] px-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
                <TabsTrigger value="variants">Biến thể</TabsTrigger>
                <TabsTrigger value="specs">Thông số</TabsTrigger>
                <TabsTrigger value="settings">Cài đặt</TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Info */}
              <TabsContent value="basic" className="space-y-5 mt-0 p-1">
                <div className="grid grid-cols-2 gap-5">
                  {/* Row 1: Name */}
                  <div className="col-span-2">
                    <Label htmlFor="name" className="text-sm font-semibold">
                      Tên sản phẩm <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Nhập tên sản phẩm..."
                      {...register("name")}
                      className="mt-1.5 h-11"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Row 2: Slug */}
                  <div className="col-span-2">
                    <Label htmlFor="slug" className="text-sm font-semibold">
                      Đường dẫn
                      <span className="text-xs text-muted-foreground ml-2 font-normal">(Tự động tạo)</span>
                    </Label>
                    <Input
                      id="slug"
                      disabled
                      {...register("slug")}
                      className="mt-1.5 h-11 bg-muted/30"
                    />
                  </div>

                  {/* Row 3: Category & Brand Shared */}
                  <div className="col-span-1">
                    <Label className="text-sm font-semibold mb-1.5 block">
                      Danh mục <span className="text-destructive">*</span>
                    </Label>
                    <DropdownMenu open={catOpen} onOpenChange={setCatOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className={cn(
                            "w-full justify-between h-11 font-normal border-border/60",
                            !watch("categoryId") && "text-muted-foreground"
                          )}
                        >
                          {selectedCategory ? (
                              <span className="truncate">{selectedCategory.name}</span>
                            ) : (
                              "Chọn danh mục"
                            )
                          }
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="start" 
                        className="w-[300px] p-0 dropdown-content max-h-[400px] flex flex-col"
                      >
                        <div className="p-2 border-b sticky top-0 bg-popover z-10">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              ref={catInputRef}
                              placeholder="Tìm danh mục..."
                              value={catSearch}
                              onChange={(e) => setCatSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-7 h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                            />
                          </div>
                        </div>
                        <div className="h-[280px] overflow-y-auto py-1">
                          {flatCategories
                            .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                            .map((c) => (
                              <DropdownMenuItem 
                                key={c._id} 
                                onClick={() => {
                                  setValue("categoryId", c._id);
                                  setCatSearch("");
                                }}
                                className={cn(
                                  "flex items-center justify-between",
                                  c.level > 0 && "text-muted-foreground"
                                )}
                              >
                                <span className="flex items-center">
                                  {Array.from({ length: c.level }).map((_, i) => (
                                    <span key={i} className="w-4 h-px" />
                                  ))}
                                  {c.level > 0 && <span className="mr-1 text-xs opacity-50">└─</span>}
                                  {c.name}
                                </span>
                                {watch("categoryId") === c._id && <Check className="h-3.5 w-3.5 text-primary" />}
                              </DropdownMenuItem>
                            ))}
                          {flatCategories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).length === 0 && (
                            <div className="py-4 text-center text-xs text-muted-foreground italic">
                              Không tìm thấy danh mục
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {errors.categoryId && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-1">
                    <Label className="text-sm font-semibold mb-1.5 block">
                      Thương hiệu <span className="text-destructive">*</span>
                    </Label>
                    <DropdownMenu open={brandOpen} onOpenChange={setBrandOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          className={cn(
                            "w-full justify-between h-11 font-normal border-border/60",
                            !watch("brandId") && "text-muted-foreground"
                          )}
                        >
                          {selectedBrand ? (
                              <span className="truncate">{selectedBrand.name}</span>
                            ) : (
                              "Chọn thương hiệu"
                            )
                          }
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="start" 
                        className="w-[300px] p-0 dropdown-content max-h-[400px] flex flex-col"
                      >
                        <div className="p-2 border-b sticky top-0 bg-popover z-10">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              ref={brandInputRef}
                              placeholder="Tìm thương hiệu..."
                              value={brandSearch}
                              onChange={(e) => setBrandSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="pl-7 h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                            />
                          </div>
                        </div>
                        <div className="h-[280px] overflow-y-auto py-1">
                          {brands
                            .filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
                            .map((b) => (
                              <DropdownMenuItem 
                                key={b._id} 
                                onClick={() => {
                                  setValue("brandId", b._id);
                                  setBrandSearch("");
                                }}
                                className="flex items-center justify-between"
                              >
                                {b.name}
                                {watch("brandId") === b._id && <Check className="h-3.5 w-3.5 text-primary" />}
                              </DropdownMenuItem>
                            ))}
                          {brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).length === 0 && (
                            <div className="py-4 text-center text-xs text-muted-foreground italic">
                              Không tìm thấy thương hiệu
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {errors.brandId && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.brandId.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-3">
                    <Label htmlFor="description" className="text-sm font-semibold mb-1.5 block">
                      Mô tả chi tiết <span className="text-destructive">*</span>
                    </Label>
                    <div className="bg-white rounded-md overflow-hidden border border-input focus-within:ring-1 focus-within:ring-primary">
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <ReactQuill
                            theme="snow"
                            value={field.value}
                            onChange={field.onChange}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Mô tả đầy đủ về sản phẩm, tính năng nổi bật..."
                            className="bg-white min-h-[150px]"
                          />
                        )}
                      />
                    </div>
                    {errors.description && (
                      <p className="text-sm text-destructive">
                        {errors.description.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Moved Images Section Here */}
                <div className="pt-4 border-t border-border mt-2">
                  <Label className="mb-3 block text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">Hình ảnh sản phẩm</Label>
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
                    <label className="border-2 border-dashed border-muted-foreground/20 rounded-xl aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer group/upload">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {uploading ? (
                        <UploadCloud className="h-6 w-6 animate-pulse text-primary" />
                      ) : (
                        <div className="bg-muted rounded-full p-2 group-hover/upload:bg-primary/10 transition-colors">
                          <Plus className="h-5 w-5" />
                        </div>
                      )}
                      <span className="text-[11px] font-medium">
                        {uploading ? "Đang tải..." : "Thêm ảnh"}
                      </span>
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Hỗ trợ JPG, PNG, WebP. Tối đa 5MB/ảnh. Ảnh đầu tiên sẽ là ảnh chính.
                  </p>
                </div>
              </TabsContent>

              {/* Tab 2: Variants */}
              <TabsContent value="variants" className="space-y-5 mt-0 p-1">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Biến thể sản phẩm</Label>
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {variants.length} biến thể
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    {variants.map((variant, i) => (
                      <div key={i} className="border border-border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between pointer-events-none">
                          <h4 className="font-bold text-base text-primary/90 pointer-events-auto">Biến thể {i + 1}</h4>
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
                        <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-1">
                            <Label>Ảnh biến thể</Label>
                            <div className="mt-1.5 flex flex-col items-center gap-2">
                              {variant.image ? (
                                <div className="relative w-full aspect-square rounded-md overflow-hidden border">
                                  <Image
                                    src={variant.image.url}
                                    alt={`Variant ${i + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeVariantImage(i)}
                                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="w-full aspect-square border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-colors group/var-upload">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleVariantImageUpload(i, e)}
                                    className="hidden"
                                    disabled={uploading}
                                  />
                                  {uploading && variantUploadingIndex === i ? (
                                    <UploadCloud className="h-5 w-5 animate-pulse text-primary" />
                                  ) : (
                                    <div className="bg-muted rounded-full p-1.5 group-hover/var-upload:bg-primary/10 transition-colors">
                                      <Plus className="h-4 w-4" />
                                    </div>
                                  )}
                                  <span className="text-[10px] font-medium text-muted-foreground mt-1.5 text-center">
                                    {uploading && variantUploadingIndex === i ? "Đang tải..." : "Thêm ảnh"}
                                  </span>
                                </label>
                              )}
                            </div>
                          </div>
                          <div className="col-span-3 grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`variant-sku-${i}`}>
                                SKU
                              </Label>
                              <Input
                                id={`variant-sku-${i}`}
                                value={variant.sku}
                                disabled
                                onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                className="mt-1.5 bg-muted/30"
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
                              <Label htmlFor={`variant-discount-${i}`}>
                                Chiết khấu (%)
                              </Label>
                              <Input
                                id={`variant-discount-${i}`}
                                type="number"
                                placeholder="0"
                                value={variant.discountPercentage}
                                onChange={(e) => updateVariant(i, "discountPercentage", Number(e.target.value))}
                                className="mt-1.5"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`variant-stock-${i}`}>
                                Tồn kho <span className="text-destructive">*</span>
                                </Label>
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
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <Label>
                              Thuộc tính <span className="text-destructive">*</span>
                              </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-border/60"
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
                                  placeholder="Thuộc tính"
                                  value={attr.key}
                                  onChange={(e) => updateVariantAttribute(i, j, "key", e.target.value)}
                                  className="flex-1 h-10"
                                />
                                <Input
                                  placeholder="Giá trị"
                                  value={attr.value}
                                  onChange={(e) => updateVariantAttribute(i, j, "value", e.target.value)}
                                  className="flex-1 h-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                  onClick={() => removeVariantAttribute(i, j)}
                                  disabled={variant.attributes.length === 1}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all mt-4"
                    onClick={addVariant}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm biến thể mới
                  </Button>
                </div>
              </TabsContent>



              {/* Tab 4: Specs */}
              <TabsContent value="specs" className="space-y-5 mt-0 p-1">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>
                      Thông số kỹ thuật <span className="text-destructive">*</span>
                      </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-border/60"
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
                          placeholder="Tên thông số"
                          value={spec.key}
                          onChange={(e) => updateSpec(i, "key", e.target.value)}
                          className="flex-1 h-10"
                        />
                        <Input
                          placeholder="Mô tả"
                          value={spec.value}
                          onChange={(e) => updateSpec(i, "value", e.target.value)}
                          className="flex-1 h-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          onClick={() => removeSpec(i)}
                          disabled={specs.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 5: Settings */}
              <TabsContent value="settings" className="space-y-5 mt-0 p-1">
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

                  <div className="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/5">
                    <div>
                      <p className="font-medium text-foreground">
                        Sản phẩm nổi bật
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Sản phẩm sẽ được hiển thị ở mục nổi bật
                      </p>
                    </div>
                    <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
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
              className="border-border/60"
              disabled={isSubmitting}
              onClick={handleRequestClose}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={uploading || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              {initialData ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
      <AlertDialogContent className="border-border/60">
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận thoát?</AlertDialogTitle>
          <AlertDialogDescription>
            Các thay đổi bạn đã nhập có thể không được lưu. Bạn có chắc chắn muốn thoát không?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border/60">Ở lại</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowExitConfirm(false);
              onOpenChange(false);
            }}
          >
            Thoát
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
);
}
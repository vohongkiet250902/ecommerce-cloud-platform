"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { productApi } from "@/services/api";
import { Loader2, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface EditPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onSuccess?: () => void;
}

export default function EditPriceModal({ open, onOpenChange, product, onSuccess }: EditPriceModalProps) {
  const [variants, setVariants] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && product) {
      setVariants(JSON.parse(JSON.stringify(product.variants || [])));
    } else {
      setVariants([]);
    }
  }, [open, product]);

  const handlePriceChange = (index: number, value: string) => {
    setVariants(prev => {
      const newVariants = [...prev];
      newVariants[index].price = value ? Number(value) : "";
      return newVariants;
    });
  };

  const handleDiscountChange = (index: number, value: string) => {
    setVariants(prev => {
      const newVariants = [...prev];
      newVariants[index].discountPercentage = value ? Number(value) : "";
      return newVariants;
    });
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN").format(price || 0) + "đ";

  const onSubmit = async () => {
    if (!product) return;

    // Validate
    const invalidVariants = variants.some(v => v.price === "" || Number(v.price) <= 0);
    if (invalidVariants) {
      toast({
        title: "Lỗi dữ liệu",
        description: "Vui lòng nhập giá bán hợp lệ cho tất cả biến thể.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryId: typeof product.categoryId === "object" ? product.categoryId?._id : product.categoryId || product.category?._id,
        brandId: typeof product.brandId === "object" ? product.brandId?._id : product.brandId || product.brand?._id,
        images: product.images.map((img: any) => ({
          url: img.url,
          publicId: img.publicId || null,
        })),
        specs: product.specs,
        variants: variants.map((v) => ({
          sku: v.sku,
          price: Number(v.price),
          importPrice: Number(v.importPrice || 0),
          discountPercentage: Number(v.discountPercentage || 0),
          stock: Number(v.stock),
          attributes: v.attributes,
          image: typeof v.image === 'string' ? null : (v.image ? { url: v.image.url, publicId: v.image.publicId } : null),
          status: v.status || "active",
        })),
        status: product.status,
        isFeatured: product.isFeatured,
      };

      await productApi.updateProduct(product._id, payload);

      toast({
        variant: "success",
        title: "Thành công",
        description: "Đã cập nhật giá sản phẩm thành công.",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Submit Error:", error);
      const errorMsg = error.response?.data?.message || "Đã xảy ra lỗi khi cập nhật giá. Vui lòng thử lại.";
      toast({
        title: "Lỗi hệ thống",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <DialogTitle className="text-xl font-bold">
            Chỉnh sửa giá: <span className="text-primary font-medium">{product.name}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[65vh] px-6 py-4">
          <div className="space-y-6">
            {variants.map((variant, index) => {
              const originalVariant = product.variants?.[index];
              return (
                <div key={index} className="p-4 rounded-xl border border-border/40 bg-card shadow-sm space-y-4">
                  <div className="flex items-start gap-4 border-b border-border/40 pb-3">
                    <div className="relative w-16 h-16 rounded-md bg-muted flex-shrink-0 border border-border/40 overflow-hidden flex items-center justify-center">
                      {variant.image?.url || typeof variant.image === 'string' ? (
                        <Image
                          src={variant.image?.url || variant.image}
                          alt={variant.sku || "Variant image"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 flex-1">
                      <p className="font-semibold text-base flex items-center gap-2 flex-wrap">
                        {variant.sku || "Không có SKU"}
                        {variant.attributes && variant.attributes.length > 0 && (
                          <span className="flex items-center flex-wrap gap-1.5 text-sm font-normal ml-2">
                            {variant.attributes.map((attr: any, i: number) => (
                              <Badge key={i} variant="secondary" className="font-normal bg-muted border-border/40">
                                {attr.key}: {attr.value}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">Tồn kho: {variant.stock}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex justify-between">
                        <span>Giá bán mới </span>
                        <span className="text-xs text-muted-foreground font-normal">
                          Giá cũ: {originalVariant ? formatPrice(originalVariant.price) : "N/A"}
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={variant.price}
                          onChange={(e) => handlePriceChange(index, e.target.value)}
                          placeholder="Nhập giá mới"
                          className="pr-8 h-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          đ
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex justify-between">
                        <span>Chiết khấu (%)</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          Cũ: {originalVariant?.discountPercentage || 0}%
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={variant.discountPercentage}
                          onChange={(e) => handleDiscountChange(index, e.target.value)}
                          placeholder="0"
                          min="0"
                          max="100"
                          className="pr-8 h-10"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Preview final price */}
                  <div className="flex justify-end items-center gap-2 pt-2 text-sm">
                    <span className="text-muted-foreground">Giá sau chiết khấu:</span>
                    <span className="font-bold text-primary text-base">
                      {formatPrice(Number(variant.price || 0) * (1 - Number(variant.discountPercentage || 0) / 100))}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {variants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Sản phẩm này không có biến thể nào.
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/50 mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || variants.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

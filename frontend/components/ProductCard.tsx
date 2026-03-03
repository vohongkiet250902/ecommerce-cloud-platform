"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  variants?: any[];
  brandName?: string;
  discountPercentage?: number;
}

export function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  rating,
  reviewCount,
  variants,
  brandName,
  discountPercentage,
}: ProductCardProps) {
  // Validate variants and compute manual final prices using `discountPercentage`
  const computedVariants = variants && variants.length > 0
    ? variants.map(v => {
        const dp = v.discountPercentage || 0;
        const basePrice = v.price || 0;
        const computedFinalPrice = dp > 0 ? basePrice - (basePrice * dp / 100) : basePrice;
        return {
          ...v,
          computedFinalPrice,
          originalPrice: basePrice,
        };
      })
    : [];

  let dp = discountPercentage || 0;
  if (!dp && computedVariants.length > 0) {
    const varDiscounts = computedVariants.map(v => v.discountPercentage || 0);
    const maxVarDiscount = Math.max(...varDiscounts);
    if (maxVarDiscount > 0) dp = maxVarDiscount;
  }
  if (!dp && originalPrice && originalPrice > price) {
    dp = Math.round(((originalPrice - price) / originalPrice) * 100);
  }
  const displayDiscount = dp;

  let finalPrice = price;
  let finalOriginalPrice = originalPrice;
  if (computedVariants.length === 0 && discountPercentage && discountPercentage > 0) {
    // If no variants but top-level discount exists, price acts as original base
    finalOriginalPrice = price;
    finalPrice = price - (price * discountPercentage / 100);
  }

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
      value
    );

  const minVariant = computedVariants.length > 0 
    ? computedVariants.reduce((prev, curr) => (curr.computedFinalPrice < prev.computedFinalPrice ? curr : prev), computedVariants[0])
    : null;
    
  const maxVariant = computedVariants.length > 0 
    ? computedVariants.reduce((prev, curr) => (curr.computedFinalPrice > prev.computedFinalPrice ? curr : prev), computedVariants[0])
    : null;

  const minPrice = minVariant ? minVariant.computedFinalPrice : finalPrice;
  const maxPrice = maxVariant ? maxVariant.computedFinalPrice : finalPrice;
    
  // Find matching original price for min variant, fallback to computed final original 
  const originalMinPrice = (minVariant && (minVariant.discountPercentage > 0 || minVariant.originalPrice > minVariant.price))
    ? minVariant.originalPrice 
    : (finalOriginalPrice !== undefined && finalOriginalPrice > finalPrice ? finalOriginalPrice : undefined);

  const hasPriceRange = minPrice !== maxPrice;


  return (
    <Link href={`/products/${id}`} className="block h-full">
      <motion.div
        whileHover={{ y: -4 }}
        className="card-product bg-card rounded-2xl overflow-hidden group h-full flex flex-col"
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-secondary/50">
          {displayDiscount > 0 && (
            <div className="absolute top-2 right-2 z-10 bg-destructive text-white text-xs font-bold px-2 py-1 rounded-bl-xl rounded-tr-lg shadow-md">
              -{displayDiscount}%
            </div>
          )}
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground">
              <span className="text-xs">No Image</span>
             </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2 flex flex-col flex-grow">
          {/* Rating */}
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-xs font-bold text-foreground">
              {rating > 0 ? rating.toFixed(1) : "0.0"}
            </span>
            <Star className="w-3 h-3 fill-warning text-warning" />
            <span className="text-[10px] text-muted-foreground ml-0.5 truncate">
              ({reviewCount || 0})
            </span>
          </div>

          {brandName && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 mb-1 block truncate">
              {brandName}
            </span>
          )}

          {/* Name */}
          <div className="flex-grow">
            <h3 className="font-medium text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors text-xs sm:text-sm min-h-[2rem] leading-tight">
              {name}
            </h3>
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 sm:gap-x-2">
            {hasPriceRange ? (
              <div className="flex items-baseline gap-x-1 sm:gap-x-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-primary leading-tight whitespace-nowrap">
                  {formatPrice(minPrice).replace('₫', '').trim()}
                </span>
                {originalMinPrice && originalMinPrice > minPrice && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-normal opacity-70 whitespace-nowrap">
                    {formatPrice(originalMinPrice).replace('₫', '').trim()}
                  </span>
                )}
                <span className="text-sm sm:text-base font-bold text-primary leading-tight whitespace-nowrap">
                  - {formatPrice(maxPrice)}
                </span>
              </div>
            ) : (
              <>
                <span className="text-sm sm:text-base font-bold text-primary leading-tight whitespace-nowrap">
                  {formatPrice(minPrice)}
                </span>
                {originalMinPrice && originalMinPrice > minPrice && (
                  <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-normal opacity-70 whitespace-nowrap">
                    {formatPrice(originalMinPrice)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

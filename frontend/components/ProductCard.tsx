"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ProductCardProps {
  id: string; // This is the slug for routing
  productId?: string; // This is the _id for backend
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  sku?: string;
  rating: number;
  reviewCount: number;
  badge?: "new" | "sale" | "hot";
  variants?: { price: number }[];
  brandName?: string;
}

export function ProductCard({
  id,
  productId,
  name,
  price,
  originalPrice,
  image,
  sku,
  rating,
  reviewCount,
  badge,
  variants,
  brandName,
}: ProductCardProps) {
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
      value
    );

  const minPrice = variants && variants.length > 0 
    ? Math.min(...variants.map(v => v.price)) 
    : price;
  const maxPrice = variants && variants.length > 0 
    ? Math.max(...variants.map(v => v.price)) 
    : price;

  const hasPriceRange = minPrice !== maxPrice;


  return (
    <Link href={`/products/${id}`} className="block h-full">
      <motion.div
        whileHover={{ y: -4 }}
        className="card-product bg-card rounded-2xl overflow-hidden group h-full flex flex-col"
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-secondary/50">
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

          {/* Badges */}
          {badge && (
            <div className="absolute top-3 left-3 z-10">
              <span
                className={`${
                  badge === "new"
                    ? "badge-new"
                    : badge === "hot"
                    ? "bg-warning text-warning-foreground px-2 py-1 text-xs font-semibold rounded-full"
                    : "badge-sale"
                }`}
              >
                {badge === "new" ? "Mới" : badge === "hot" ? "Hot" : `-${discountPercent}%`}
              </span>
            </div>
          )}



        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(rating)
                      ? "fill-warning text-warning"
                      : "fill-muted text-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">({reviewCount})</span>
          </div>

          {brandName && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-1 block">
              {brandName}
            </span>
          )}

          {/* Name */}
          <div className="flex-grow">
            <h3 className="font-medium text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
              {name}
            </h3>
          </div>

          {/* Price */}
          <div className="flex items-baseline flex-nowrap truncate gap-x-1.5 sm:gap-x-2">
            <span className="text-base sm:text-lg font-bold sm:font-black text-primary leading-tight whitespace-nowrap">
              {hasPriceRange ? (
                <>
                  {formatPrice(minPrice).replace('₫', '')} - {formatPrice(maxPrice)}
                </>
              ) : (
                formatPrice(price)
              )}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-medium opacity-70 whitespace-nowrap">
                {formatPrice(originalPrice)}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="bg-destructive text-white text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap">
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

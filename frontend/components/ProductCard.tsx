"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  badge?: "new" | "sale" | "hot";
}

export function ProductCard({
  id,
  name,
  price,
  originalPrice,
  image,
  rating,
  reviewCount,
  badge,
}: ProductCardProps) {
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
      value
    );

  return (
    <Link href={`/products/${id}`} className="block">
      <motion.div
        whileHover={{ y: -4 }}
        className="card-product bg-card rounded-2xl overflow-hidden group"
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-secondary/50">
          {/* <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority={false}
          /> */}

          {/* Badges */}
          {badge && (
            <div className="absolute top-3 left-3">
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

          {/* Wishlist Button */}
          <button
            onClick={(e) => e.preventDefault()}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          >
            <Heart className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
          </button>

          {/* Quick Add Button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <Button
              className="btn-primary w-full rounded-full"
              onClick={(e) => e.preventDefault()}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Thêm vào giỏ
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
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

          {/* Name */}
          <h3 className="font-medium text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">{formatPrice(price)}</span>
            {originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

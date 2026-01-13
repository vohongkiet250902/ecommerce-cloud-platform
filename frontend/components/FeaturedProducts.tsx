"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
const products = [
  {
    id: 1,
    name: "iPhone 15 Pro Max 256GB - Titan Tự Nhiên",
    price: 34990000,
    originalPrice: 38990000,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 1256,
    badge: "hot" as const,
  },
  {
    id: 2,
    name: "MacBook Air 15 inch M3 - Midnight",
    price: 32990000,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 892,
    badge: "new" as const,
  },
  {
    id: 3,
    name: "Samsung Galaxy S24 Ultra 256GB",
    price: 28990000,
    originalPrice: 33990000,
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 645,
    badge: "sale" as const,
  },
  {
    id: 4,
    name: "iPad Pro 12.9 inch M4 WiFi 256GB",
    price: 31990000,
    image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 432,
    badge: "new" as const,
  },
  {
    id: 5,
    name: "AirPods Pro 2 với MagSafe Case",
    price: 5990000,
    originalPrice: 6990000,
    image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 2341,
    badge: "sale" as const,
  },
  {
    id: 6,
    name: "Apple Watch Ultra 2 GPS + Cellular",
    price: 21990000,
    image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 567,
    badge: "hot" as const,
  },
  {
    id: 7,
    name: "ASUS ROG Zephyrus G14 RTX 4060",
    price: 42990000,
    originalPrice: 47990000,
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 234,
    badge: "sale" as const,
  },
  {
    id: 8,
    name: "Xiaomi 14 Ultra 512GB",
    price: 22990000,
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 178,
    badge: "new" as const,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturedProducts() {
  return (
    <section className="py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Sản phẩm nổi bật
            </h2>
            <p className="text-muted-foreground text-lg">
              Những sản phẩm được yêu thích nhất
            </p>
          </div>
          <Button variant="outline" className="rounded-full px-6 group self-start sm:self-auto">
            Xem tất cả
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {products.map((product) => (
            <motion.div key={product.id} variants={itemVariants}>
              <ProductCard {...product} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

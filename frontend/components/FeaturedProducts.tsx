"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { productApi } from "@/services/api";
import Link from "next/link";

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
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        // Lấy 10 sản phẩm nổi bật mới nhất (backend tự động sort theo createdAt -1)
        const res = await productApi.getProducts({ isFeatured: true, limit: 10 });
        setProducts(res.data.data || res.data || []);
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm nổi bật:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeatured();
  }, []);

  if (!loading && products.length === 0) {
    return null; // Don't render if no featured products
  }

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
          <Link href="/products">
            <Button variant="outline" className="rounded-full px-6 group self-start sm:self-auto">
              Xem tất cả
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
             <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6"
          >
            {products.map((product, index) => (
              <motion.div key={product._id || index} variants={itemVariants}>
                <ProductCard 
                  id={product.slug}
                  name={product.name}
                  brandName={typeof product.brandId === 'object' ? product.brandId?.name : undefined}
                  price={product.price || 0}
                  originalPrice={product.originalPrice}
                  image={product.images?.[0]?.url || ""}
                  rating={product.averageRating || 0}
                  reviewCount={product.reviewCount || 0}
                  variants={product.variants}
                  discountPercentage={product.discountPercentage}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

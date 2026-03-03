"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { useTheme } from "@/context/ThemeContext";
import { productApi } from "@/services/api";
import { motion } from "framer-motion";
import { Loader2, Zap, TicketPercent } from "lucide-react";

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

export default function PromotionsPage() {
  const [flashSaleProducts, setFlashSaleProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch products to find newest 10 with discounts inside their variants
        const pRes = await productApi.getProducts({ limit: 100 });
        const allProducts = pRes.data.data || pRes.data || [];
        
        const discounted = allProducts
          .map((p: any) => {
            let maxDiscount = p.discountPercentage || 0;
            if (p.variants && p.variants.length > 0) {
              maxDiscount = Math.max(...p.variants.map((v: any) => v.discountPercentage || 0));
            }
            return { ...p, maxDiscount };
          })
          .filter((p: any) => p.maxDiscount > 0)
          .sort((a: any, b: any) => b.maxDiscount - a.maxDiscount)
          .slice(0, 10); // Take top 10

        setFlashSaleProducts(discounted);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu khuyến mãi:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Time remaining calculation fake for UI
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 45,
    seconds: 30,
  });

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        if (seconds > 0) seconds--;
        else {
          seconds = 59;
          if (minutes > 0) minutes--;
          else {
            minutes = 59;
            if (hours > 0) hours--;
            else hours = 23;
          }
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow pt-[80px]">
        {/* Banner Section */}
        <section className="bg-gradient-to-r from-red-600 to-rose-500 py-16 lg:py-20 relative overflow-hidden">
          {/* Decorative Pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="container mx-auto px-4 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="inline-flex items-center justify-center p-4 bg-white/20 backdrop-blur-md rounded-3xl mb-6 shadow-xl"
            >
              <TicketPercent className="w-12 h-12 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-6 tracking-tight uppercase"
            >
              Trạm Khuyến Mãi
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 font-medium"
            >
              Săn ngay hàng ngàn mã giảm giá và deals hời nhất tháng. Số lượng
              có hạn, đừng bỏ lỡ!
            </motion.p>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center items-center py-40">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Flash Sale Section */}
            {flashSaleProducts.length > 0 ? (
              <section className="py-16 bg-secondary/30 border-t border-border/50">
                <div className="container mx-auto px-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                        <Zap className="w-6 h-6 fill-red-500" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black italic text-foreground uppercase tracking-tight">
                          Flash Sale
                        </h2>
                        <p className="text-muted-foreground mt-1">
                          Các sản phẩm giảm giá cực sốc mới nhất
                        </p>
                      </div>
                    </div>

                    {/* Fake Countdown Timer */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground mr-2">
                        Kết thúc trong:
                      </span>
                      <div className="bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-red-500/20">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </div>
                      <span className="text-xl font-bold text-red-500">:</span>
                      <div className="bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-red-500/20">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </div>
                      <span className="text-xl font-bold text-red-500">:</span>
                      <div className="bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-red-500/20">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </div>
                    </div>
                  </div>

                  {/* 5 items per row on large screen */}
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6"
                  >
                    {flashSaleProducts.map((product, idx) => {
                      return (
                        <motion.div
                          key={product._id || idx}
                          variants={itemVariants}
                        >
                          <ProductCard
                            id={product.slug}
                            name={product.name}
                            brandName={
                              typeof product.brandId === "object"
                                ? product.brandId?.name
                                : undefined
                            }
                            price={product.price || 0}
                            originalPrice={product.originalPrice}
                            image={product.images?.[0]?.url || ""}
                            rating={product.averageRating || 0}
                            reviewCount={product.reviewCount || 0}
                            variants={product.variants}
                            discountPercentage={product.maxDiscount || product.discountPercentage}
                          />
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              </section>
            ) : (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-xl">Hiện tại chưa có sản phẩm nào thuộc chương trình Flash Sale.</p>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

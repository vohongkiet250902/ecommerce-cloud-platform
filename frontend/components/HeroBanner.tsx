"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { productApi } from "@/services/api";

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        setLoading(true);
        const res = await productApi.getProducts({ limit: 5 });
        const fetchedProducts = res.data.data || res.data || [];
        
        const formattedSlides = fetchedProducts.map((p: any) => ({
          id: p._id,
          title: p.name,
          subtitle: "Sản phẩm mới",
          description: p.description 
            ? p.description
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 120) + "..." 
            : "Khám phá ngay sản phẩm công nghệ mới nhất với ưu đãi tốt nhất.",
          cta: "Mua ngay",
          image: p.images?.[0]?.url || "https://placehold.co/600x400?text=No+Image",
          badge: "Mới",
          slug: p.slug
        }));
        
        setSlides(formattedSlides);
      } catch (error) {
        console.error("Lỗi khi tải banner:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestProducts();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    if (slides.length > 0) setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    if (slides.length > 0) setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (loading) {
    return (
      <section className="relative min-h-[500px] lg:min-h-[600px] flex items-center justify-center bg-gradient-to-br from-secondary via-background to-accent/30">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </section>
    );
  }

  if (slides.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-accent/30">
      <div className="container mx-auto px-4">
        <div className="relative min-h-[500px] lg:min-h-[600px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="grid lg:grid-cols-2 gap-8 items-center w-full py-12"
            >
              {/* Content */}
              <div className="space-y-6 text-center lg:text-left order-2 lg:order-1">
                <div className="inline-block">
                  <span
                    className={`badge-${
                      slides[currentSlide].badge === "Mới" ? "new" : "sale"
                    } text-sm`}
                  >
                    {slides[currentSlide].badge}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  {slides[currentSlide].title}
                </h1>
                <p className="text-xl md:text-2xl text-primary font-medium">
                  {slides[currentSlide].subtitle}
                </p>
                <p className="text-muted-foreground text-lg max-w-md mx-auto lg:mx-0">
                  {slides[currentSlide].description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href={`/products/${slides[currentSlide].slug}`} className="w-full sm:w-auto">
                    <Button className="btn-primary w-full px-8 py-6 text-lg rounded-full group">
                      {slides[currentSlide].cta}
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href={`/products/${slides[currentSlide].slug}`} className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      className="w-full px-8 py-6 text-lg rounded-full"
                    >
                      Xem chi tiết
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Image */}
              <div className="relative order-1 lg:order-2">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <img
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].title}
                    className="w-full max-w-md lg:max-w-lg mx-auto rounded-3xl shadow-2xl object-contain aspect-[4/3] lg:aspect-video bg-white p-4"
                  />
                </motion.div>
                {/* Decorative elements */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full bg-primary/5 blur-3xl" />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute -left-5 lg:-left-12 xl:-left-16 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
          >
            <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute -right-5 lg:-right-12 xl:-right-16 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-accent transition-colors z-10"
          >
            <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 pb-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-primary w-8"
                  : "bg-primary/30 hover:bg-primary/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

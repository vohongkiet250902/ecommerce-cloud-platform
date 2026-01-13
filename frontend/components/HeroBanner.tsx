"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import heroBanner from "@/assets/img/hero-banner.jpg";

const slides = [
  {
    id: 1,
    title: "iPhone 15 Pro Max",
    subtitle: "Titan. Siêu mạnh mẽ.",
    description: "Trải nghiệm chip A17 Pro đột phá với hiệu năng đỉnh cao",
    cta: "Mua ngay",
    image: heroBanner,
    badge: "Mới",
  },
  {
    id: 2,
    title: "MacBook Air M3",
    subtitle: "Mỏng nhẹ. Mạnh mẽ.",
    description: "Chip M3 mới với hiệu năng CPU nhanh hơn 60%",
    cta: "Khám phá",
    image: heroBanner,
    badge: "Hot",
  },
  {
    id: 3,
    title: "Galaxy S24 Ultra",
    subtitle: "AI trong tay bạn",
    description:
      "Tích hợp Galaxy AI với khả năng dịch thuật và chỉnh sửa ảnh thông minh",
    cta: "Tìm hiểu",
    image: heroBanner,
    badge: "Sale",
  },
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

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
                  <Button className="btn-primary px-8 py-6 text-lg rounded-full group">
                    {slides[currentSlide].cta}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    variant="outline"
                    className="px-8 py-6 text-lg rounded-full"
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="relative order-1 lg:order-2">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Image
                    src={slides[currentSlide].image}
                    alt={slides[currentSlide].title}
                    className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl"
                    priority
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
            className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-accent transition-colors"
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

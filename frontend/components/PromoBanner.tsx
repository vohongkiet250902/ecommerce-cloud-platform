"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Gift, Truck, Shield } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Miễn phí vận chuyển",
    description: "Cho đơn hàng từ 500K",
  },
  {
    icon: Shield,
    title: "Bảo hành chính hãng",
    description: "Lên đến 24 tháng",
  },
  {
    icon: Gift,
    title: "Quà tặng hấp dẫn",
    description: "Kèm theo mỗi đơn hàng",
  },
  {
    icon: Zap,
    title: "Giao hàng nhanh",
    description: "Trong vòng 2 giờ",
  },
];

export default function PromoBanner() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4 space-y-16">
        {/* Main Promo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl gradient-promo p-8 lg:p-12"
        >
          <div className="relative z-10 max-w-xl">
            <span className="inline-block bg-white/20 text-white px-4 py-1 rounded-full text-sm font-medium mb-4">
              🔥 Flash Sale
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
              Giảm đến 50%
            </h2>
            <p className="text-white/90 text-lg mb-6">
              Chương trình khuyến mãi đặc biệt đầu năm. Hàng ngàn sản phẩm công
              nghệ với giá ưu đãi chưa từng có!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-white text-destructive hover:bg-white/90 rounded-full px-8 group cursor-pointer"
              >
                Mua ngay
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 rounded-full px-8 cursor-pointer"
              >
                Xem chi tiết
              </Button>
            </div>
          </div>

          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full" />
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/5 rounded-full" />
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-2xl p-6 text-center border border-border hover:border-primary/50 transition-colors"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Two Column Promo */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-blue-600 p-8"
          >
            <div className="relative z-10">
              <span className="text-primary-foreground/80 text-sm font-medium">
                Điện thoại
              </span>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mt-2 mb-4">
                iPhone 17 Series
              </h3>
              <p className="text-white/80 mb-6">Giảm đến 3 triệu, trả góp 0%</p>
              <Button className="bg-white text-primary hover:bg-white/90 rounded-full cursor-pointer">
                Khám phá ngay
              </Button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-600 p-8"
          >
            <div className="relative z-10">
              <span className="text-white/80 text-sm font-medium">Laptop</span>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mt-2 mb-4">
                MacBook M4 Series
              </h3>
              <p className="text-white/80 mb-6">Quà tặng lên đến 5 triệu</p>
              <Button className="bg-white text-violet-600 hover:bg-white/90 rounded-full cursor-pointer">
                Tìm hiểu thêm
              </Button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

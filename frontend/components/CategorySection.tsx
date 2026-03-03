"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { motion } from "framer-motion";
import { 
  Smartphone, Laptop, Tablet, Headphones, Watch, 
  Monitor, Mouse, Keyboard, Package 
} from "lucide-react";
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

const getCategoryAppearance = (name: string, index: number) => {
  const lowerName = name.toLowerCase();
  let icon = Package;
  
  if (lowerName.includes("điện thoại") || lowerName.includes("phone")) icon = Smartphone;
  else if (lowerName.includes("laptop") || lowerName.includes("máy tính xách tay")) icon = Laptop;
  else if (lowerName.includes("tablet") || lowerName.includes("máy tính bảng") || lowerName.includes("ipad")) icon = Tablet;
  else if (lowerName.includes("tai nghe") || lowerName.includes("âm thanh") || lowerName.includes("audio") || lowerName.includes("phụ kiện")) icon = Headphones;
  else if (lowerName.includes("đồng hồ") || lowerName.includes("watch")) icon = Watch;
  else if (lowerName.includes("màn hình") || lowerName.includes("monitor")) icon = Monitor;
  else if (lowerName.includes("chuột") || lowerName.includes("mouse")) icon = Mouse;
  else if (lowerName.includes("bàn phím") || lowerName.includes("keyboard")) icon = Keyboard;
  
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-orange-500 to-red-500",
    "from-green-500 to-emerald-500",
    "from-indigo-500 to-violet-500",
    "from-yellow-400 to-orange-500",
    "from-teal-400 to-emerald-500",
    "from-rose-400 to-red-500",
  ];
  
  return {
    icon,
    color: colors[index % colors.length]
  };
};

export default function CategorySection() {
  const { data: realCategories } = useSelector((state: RootState) => state.categories);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const topCategories = realCategories
    .filter((c) => !c.parentId && c.isActive)
    .slice(0, 10); // Show top 10 root categories

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Danh mục sản phẩm
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Khám phá các danh mục sản phẩm công nghệ hàng đầu với giá tốt nhất
          </p>
        </div>

        {mounted && topCategories.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6"
          >
            {topCategories.map((category, index) => {
              const appearance = getCategoryAppearance(category.name, index);
              const Icon = appearance.icon;

              return (
                <motion.div key={category._id} variants={itemVariants}>
                  <Link
                    href={`/products?category=${category._id}`}
                    className="category-card group block w-full hover:bg-muted/50 rounded-2xl p-4 transition-colors"
                  >
                    <div
                      className={`w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${appearance.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}
                    >
                      <Icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors text-center px-2 truncate">
                      {category.name}
                    </h3>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
}

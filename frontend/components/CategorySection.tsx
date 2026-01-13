"use client";

import { motion } from "framer-motion";
import { Smartphone, Laptop, Tablet, Headphones, Watch } from "lucide-react";

const categories = [
  {
    id: 1,
    name: "Điện thoại",
    icon: Smartphone,
    description: "iPhone, Samsung, Xiaomi",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 2,
    name: "Laptop",
    icon: Laptop,
    description: "MacBook, Gaming, Ultrabook",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: 3,
    name: "Tablet",
    icon: Tablet,
    description: "iPad, Android Tablet",
    color: "from-orange-500 to-red-500",
  },
  {
    id: 4,
    name: "Phụ kiện",
    icon: Headphones,
    description: "Tai nghe, Sạc & Cáp, Ốp lưng",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: 5,
    name: "Đồng hồ thông minh",
    icon: Watch,
    description: "Apple Watch, Galaxy Watch",
    color: "from-indigo-500 to-violet-500",
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

export default function CategorySection() {
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

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6"
        >
          {categories.map((category) => (
            <motion.a
              key={category.id}
              href={`/category/${category.id}`}
              variants={itemVariants}
              className="category-card group"
            >
              <div
                className={`w-16 h-16 lg:w-20 lg:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
              >
                <category.icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

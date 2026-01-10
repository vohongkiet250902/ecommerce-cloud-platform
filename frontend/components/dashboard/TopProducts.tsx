"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

const products = [
  {
    id: 1,
    name: "iPhone 15 Pro Max 256GB",
    category: "Điện thoại",
    sales: 1234,
    revenue: "35.8B",
    trend: "up",
    change: "+12%",
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&h=100&fit=crop",
  },
  {
    id: 2,
    name: "MacBook Pro 14 M3",
    category: "Laptop",
    sales: 856,
    revenue: "42.8B",
    trend: "up",
    change: "+8%",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop",
  },
  {
    id: 3,
    name: "Samsung Galaxy S24 Ultra",
    category: "Điện thoại",
    sales: 743,
    revenue: "22.3B",
    trend: "down",
    change: "-3%",
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop",
  },
  {
    id: 4,
    name: "AirPods Pro 2",
    category: "Phụ kiện",
    sales: 2156,
    revenue: "12.9B",
    trend: "up",
    change: "+25%",
    image:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100&h=100&fit=crop",
  },
  {
    id: 5,
    name: "iPad Pro 12.9 M2",
    category: "Tablet",
    sales: 432,
    revenue: "12.5B",
    trend: "up",
    change: "+5%",
    image:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100&h=100&fit=crop",
  },
];

export default function TopProducts() {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Sản phẩm bán chạy
          </h3>
          <p className="text-sm text-muted-foreground">
            Top 5 sản phẩm trong tháng
          </p>
        </div>
        <Badge variant="secondary">Tháng này</Badge>
      </div>

      <div className="space-y-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <span className="text-lg font-bold text-muted-foreground w-6">
              {index + 1}
            </span>

            {/* <Image
              src={product.image}
              alt={product.name}
              width={48}
              height={48}
              className="rounded-lg object-cover"
            /> */}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-card-foreground truncate">
                {product.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {product.category}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold text-card-foreground">
                {product.sales} đã bán
              </p>
              <div className="flex items-center justify-end gap-1">
                {product.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span
                  className={`text-xs font-medium ${
                    product.trend === "up"
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {product.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

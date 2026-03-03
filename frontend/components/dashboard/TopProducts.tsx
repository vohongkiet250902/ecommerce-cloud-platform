"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import { orderApi, productApi } from "@/services/api";

interface TopProduct {
  id: string;
  name: string;
  category: string;
  sales: number;
  image: string;
}

export default function TopProducts() {
  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);

        // 1. Lấy danh sách đơn hàng (Tối đa 1000 đơn gần nhất để đảm bảo hiệu suất)
        const res = await orderApi.getOrders({ limit: 1000 });
        const allOrders = res.data.data;

        // 2. Tính toán số lượng bán theo BIẾN THỂ (ProductId + SKU)
        const salesMap: Record<string, number> = {};

        allOrders.forEach((order: any) => {
          // CHỈ tính những đơn hàng đã giao thành công (Completed)
          if (order.status === "completed") {
            order.items?.forEach((item: any) => {
              const productId = typeof item.productId === 'string' ? item.productId : item.productId?._id;
              const sku = item.sku || "DEFAULT";
              if (!productId) return;
              
              const key = `${productId}|${sku}`;
              salesMap[key] = (salesMap[key] || 0) + (item.quantity || 0);
            });
          }
        });

        // 3. Lấy Top 5 biến thể bán chạy nhất dựa trên tổng số lượng
        const topVariantKeys = Object.entries(salesMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([key]) => key);

        // 4. Lấy thông tin chi tiết cho từng biến thể
        const topProductsDetails = await Promise.all(
          topVariantKeys.map(async (key) => {
            const [productId, sku] = key.split('|');
            try {
              const prodRes = await productApi.getProduct(productId);
              const p = prodRes.data;
              
              // Tìm đúng biến thể để lấy Ảnh và Thuộc tính
              const variant = p.variants?.find((v: any) => v.sku === sku);
              
              // Tạo nhãn mô tả (Ghép các thuộc tính hoặc dùng tên danh mục)
              let description = p.categoryId?.name || "Sản phẩm";
              if (variant?.attributes && variant.attributes.length > 0) {
                description = variant.attributes.map((a: any) => `${a.key}: ${a.value}`).join(", ");
              }

              return {
                id: key,
                name: p.name,
                category: description,
                sales: salesMap[key],
                // Ưu tiên Ảnh biến thể > Ảnh mặc định
                image: variant?.image?.url || p.thumbnail || p.images?.[0]?.url || "",
              };
            } catch (err) {
              return {
                id: key,
                name: "Sản phẩm đã xóa",
                category: "N/A",
                sales: salesMap[key],
                image: "",
              };
            }
          })
        );

        setProducts(topProductsDetails);
      } catch (error) {
        console.error("Error fetching top products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, []);

  return (
    <div className="bg-card rounded-xl p-6 card-shadow animate-slide-up h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Sản phẩm bán chạy
          </h3>
          <p className="text-sm text-muted-foreground">
            Top 5 sản phẩm bán chạy nhất
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="h-[300px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang phân tích dữ liệu...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-50">
            <Package className="h-12 w-12 mb-2" />
            <p>Chưa có dữ liệu bán hàng</p>
          </div>
        ) : (
          products.map((product, index) => (
            <div
              key={product.id}
              className="group flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/20 transition-all border border-transparent hover:border-border/50"
            >
              <span className="text-sm font-black text-muted-foreground/50 w-6 italic group-hover:text-primary transition-colors">
                #0{index + 1}
              </span>

              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-sm border border-border/50">
                {product.image && typeof product.image === "string" && product.image.trim() !== "" ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-110"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-card-foreground truncate group-hover:text-primary transition-colors">
                  {product.name}
                </p>
                <Badge variant="outline" className="text-[10px] font-bold py-0 h-4 mt-1 border-muted text-muted-foreground">
                  {product.category}
                </Badge>
              </div>

              <div className="text-right">
                <p className="text-xs font-black text-foreground">
                  {product.sales.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                  Đã bán
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { orderApi, usersApi } from "@/services/api";
import Link from "next/link";

interface Order {
  _id: string;
  userId: any;
  totalAmount: number;
  status: string;
  createdAt: string;
}

const statusConfig = {
  pending: {
    label: "Chờ xử lý",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  paid: {
    label: "Đã thanh toán",
    className: "bg-info/10 text-info border-info/20",
  },
  shipping: {
    label: "Đang giao",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  completed: {
    label: "Hoàn thành",
    className: "bg-success/10 text-success border-success/20",
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

export default function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setLoading(true);
        const res = await orderApi.getOrders({ limit: 5 });
        const ordersData = res.data.data;

        const ordersWithUsers = await Promise.all(
          ordersData.map(async (order: any) => {
            // Case 1: userId is already an object
            if (order.userId && typeof order.userId === 'object') {
              // Check if it already has name fields
              if (order.userId.fullName || order.userId.name) {
                return order;
              }
              // If missing name, try to fetch full user info
              try {
                const uid = order.userId._id || order.userId;
                if (typeof uid === 'string') {
                  const userRes = await usersApi.getUser(uid);
                  return { ...order, userId: userRes.data };
                }
              } catch {
                return order;
              }
            }
            
            // Case 2: userId is just an ID string
            if (typeof order.userId === "string") {
              try {
                const userRes = await usersApi.getUser(order.userId);
                return { ...order, userId: userRes.data };
              } catch {
                return order;
              }
            }
            return order;
          })
        );

        setOrders(ordersWithUsers);
      } catch (error) {
        console.error("Error fetching recent orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOrders();
  }, []);

  return (
    <div className="bg-card rounded-xl p-6 card-shadow animate-slide-up h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Đơn hàng gần đây
          </h3>
          <p className="text-sm text-muted-foreground italic">5 đơn hàng mới nhất</p>
        </div>
        <Link href="/admin/orders">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all active:scale-95">
            Xem tất cả
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="h-[300px] flex flex-col items-center justify-center gap-3">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
             <p className="text-sm text-muted-foreground">Đang tải đơn hàng mới nhất...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-50">
             <ShoppingBag className="h-12 w-12 mb-2" />
             <p>Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Mã đơn
                </th>
                <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Khách hàng
                </th>
                <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Tổng tiền
                </th>
                <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Ngày đặt
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {orders.map((order) => {
                const status = (statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending);
                const user = order.userId;
                
                return (
                  <tr
                    key={order._id}
                    className="group hover:bg-secondary/20 transition-all duration-200"
                  >
                    <td className="py-4 px-2">
                      <span className="font-mono text-xs font-bold text-card-foreground bg-muted px-2 py-1 rounded">
                        #{order._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="max-w-[180px]">
                        <p className="font-bold text-sm text-card-foreground truncate">
                          {user?.fullName || user?.name || "Khách ẩn danh"}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user?.email || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="font-black text-sm text-foreground">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-bold px-2 py-0", status.className)}
                      >
                        {status.label}
                      </Badge>
                    </td>
                    <td className="py-4 px-2 text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) }
      </div>
    </div>
  );
}

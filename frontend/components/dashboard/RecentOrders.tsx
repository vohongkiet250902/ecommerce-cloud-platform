"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const orders = [
  {
    id: "#ORD-12345",
    customer: "Nguyễn Văn A",
    email: "nguyenvana@email.com",
    amount: "29,990,000đ",
    status: "completed",
    date: "2024-01-15",
  },
  {
    id: "#ORD-12344",
    customer: "Trần Thị B",
    email: "tranthib@email.com",
    amount: "15,500,000đ",
    status: "shipping",
    date: "2024-01-15",
  },
  {
    id: "#ORD-12343",
    customer: "Lê Văn C",
    email: "levanc@email.com",
    amount: "8,990,000đ",
    status: "pending",
    date: "2024-01-14",
  },
  {
    id: "#ORD-12342",
    customer: "Phạm Thị D",
    email: "phamthid@email.com",
    amount: "45,000,000đ",
    status: "paid",
    date: "2024-01-14",
  },
  {
    id: "#ORD-12341",
    customer: "Hoàng Văn E",
    email: "hoangvane@email.com",
    amount: "12,500,000đ",
    status: "cancelled",
    date: "2024-01-13",
  },
];

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

export default function RecentOrders() {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Đơn hàng gần đây
          </h3>
          <p className="text-sm text-muted-foreground">5 đơn hàng mới nhất</p>
        </div>
        <Button variant="outline" size="sm">
          Xem tất cả
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                Mã đơn
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                Khách hàng
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                Tổng tiền
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                Trạng thái
              </th>
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                Ngày
              </th>
              <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status =
                statusConfig[order.status as keyof typeof statusConfig];
              return (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <td className="py-4 px-2">
                    <span className="font-medium text-card-foreground">
                      {order.id}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <div>
                      <p className="font-medium text-card-foreground">
                        {order.customer}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.email}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span className="font-semibold text-card-foreground">
                      {order.amount}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <Badge
                      variant="outline"
                      className={cn("font-medium", status.className)}
                    >
                      {status.label}
                    </Badge>
                  </td>
                  <td className="py-4 px-2">
                    <span className="text-muted-foreground">{order.date}</span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <Button variant="ghost" size="icon-sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrderStatusChart from "@/components/dashboard/OrderStatusChart";
import TopProducts from "@/components/dashboard/TopProducts";
import RecentOrders from "@/components/dashboard/RecentOrders";
import SystemStatus from "@/components/dashboard/SystemStatus";
import { orderApi, productApi, usersApi } from "@/services/api";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
  });
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch essential data with a larger limit for more accurate summary
        const [orderRes, productRes, userRes] = await Promise.all([
          orderApi.getOrders({ limit: 2000 }), 
          productApi.getAdminProducts({ limit: 1 }),
          usersApi.getUsers({ limit: 1000 })
        ]);

        const allOrders = orderRes.data?.data || orderRes.data || [];
        const allUsers = userRes.data?.data || userRes.data || [];
        const currentYear = new Date().getFullYear();

        // 2. Filter strictly for 'completed' orders for financial stats
        const completedOrders = allOrders.filter((o: any) => o.status === "completed");
        
        // 3. Calculate monthly stats for the chart from current year's completed orders
        const monthlyData: Record<string, { revenue: number, orders: number }> = {};
        for (let i = 1; i <= 12; i++) {
          monthlyData[`T${i}`] = { revenue: 0, orders: 0 };
        }
        
        completedOrders.forEach((o: any) => {
           const date = new Date(o.createdAt);
           if (date.getFullYear() === currentYear) {
               const m = date.getMonth() + 1;
               if (monthlyData[`T${m}`]) {
                   monthlyData[`T${m}`].revenue += o.totalAmount || 0;
                   monthlyData[`T${m}`].orders += 1;
               }
           }
        });

        setRevenueChartData(Object.entries(monthlyData).map(([name, stats]) => ({ name, ...stats })));

        // 4. Detailed Status Counts for Donut Chart
        const statusCounts = {
          pending: allOrders.filter((o: any) => o.status === "pending").length,
          confirmed: allOrders.filter((o: any) => o.status === "confirmed").length,
          shipping: allOrders.filter((o: any) => o.status === "shipping").length,
          delivered: allOrders.filter((o: any) => o.status === "delivered").length,
          completed: completedOrders.length,
          failed: allOrders.filter((o: any) => o.status === "delivery_failed").length,
          returned: allOrders.filter((o: any) => o.status === "returned").length,
          cancelled: allOrders.filter((o: any) => o.status === "cancelled").length,
        };

        setOrderStatusData([
          { name: "Chờ xử lý", value: statusCounts.pending, color: "hsl(var(--warning))" },
          { name: "Đã xác nhận", value: statusCounts.confirmed, color: "hsl(215 100% 50%)" },
          { name: "Đang giao", value: statusCounts.shipping, color: "hsl(var(--info))" },
          { name: "Đã giao", value: statusCounts.delivered, color: "hsl(160 84% 39%)" },
          { name: "Hoàn thành", value: statusCounts.completed, color: "hsl(var(--success))" },
          { name: "Thất bại", value: statusCounts.failed, color: "hsl(0 84% 60%)" },
          { name: "Trả hàng", value: statusCounts.returned, color: "hsl(322 75% 46%)" },
          { name: "Đã hủy", value: statusCounts.cancelled, color: "hsl(var(--destructive))" },
        ].filter(v => v.value > 0));

        const totalAllOrdersCount = orderRes.data?.total || allOrders.length;

        setStats({
          totalOrders: totalAllOrdersCount,
        });

      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatRevenue = (value: number) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(2) + "B";
    if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-medium animate-pulse">Đang tải dữ liệu Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground font-medium italic">
            Tổng quan hiệu suất kinh doanh
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart 
            data={revenueChartData} 
            title={`Doanh thu năm ${new Date().getFullYear()}`}
          />
        </div>
        <OrderStatusChart data={orderStatusData} />
      </div>

      {/* Products & Orders Row */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts />
        <SystemStatus />
      </div> */}

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  );
}

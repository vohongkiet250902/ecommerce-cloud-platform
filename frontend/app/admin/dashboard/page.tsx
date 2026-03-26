"use client";

import { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, Package, Users, Loader2 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrderStatusChart from "@/components/dashboard/OrderStatusChart";
import TopProducts from "@/components/dashboard/TopProducts";
import RecentOrders from "@/components/dashboard/RecentOrders";
import SystemStatus from "@/components/dashboard/SystemStatus";
import { orderApi, productApi, usersApi } from "@/services/api";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    successfulOrders: 0,
  });
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch all essential data
        const [orderRes, productRes, userRes, revStatsYear] = await Promise.all([
          orderApi.getOrders({ limit: 1000 }),
          productApi.getAdminProducts({ limit: 1 }),
          usersApi.getUsers({ limit: 1000 }),
          orderApi.getRevenueStats({ groupBy: 'month', months: 12 })
        ]);

        const allOrders = orderRes.data?.data || orderRes.data || [];
        const allUsers = userRes.data?.data || userRes.data || [];
        const currentYear = new Date().getFullYear();

        const revData = revStatsYear.data?.items || [];
        const revSummary = revStatsYear.data?.summary || { totalNetRevenue: 0 };
        
        const monthlyData: Record<string, { revenue: number, orders: number }> = {};
        for (let i = 1; i <= 12; i++) {
          monthlyData[`T${i}`] = { revenue: 0, orders: 0 };
        }
        
        revData.forEach((item: any) => {
           if (item.period && item.period.startsWith(String(currentYear))) {
               const m = parseInt(item.period.split('-')[1], 10);
               if (monthlyData[`T${m}`]) {
                   monthlyData[`T${m}`].revenue = item.netRevenue || item.grossRevenue || 0;
                   monthlyData[`T${m}`].orders = item.orderCount || 0;
               }
           }
        });

        setRevenueChartData(Object.entries(monthlyData).map(([name, stats]) => ({ name, ...stats })));

        const statusCounts = {
          completed: allOrders.filter((o: any) => o.status === "completed" || o.status === "delivered").length,
          shipping: allOrders.filter((o: any) => o.status === "shipping").length,
          confirmed: allOrders.filter((o: any) => o.status === "confirmed").length,
          cancelled: allOrders.filter((o: any) => o.status === "cancelled").length,
        };

        setOrderStatusData([
          { name: "Hoàn thành", value: statusCounts.completed, color: "hsl(var(--success))" },
          { name: "Đang giao", value: statusCounts.shipping, color: "hsl(var(--info))" },
          { name: "Đã xác nhận", value: statusCounts.confirmed, color: "hsl(var(--primary))" },
          { name: "Đã hủy", value: statusCounts.cancelled, color: "hsl(var(--destructive))" },
        ]);

        const customerCount = allUsers.filter((u: any) => u.role !== "admin").length;

        setStats({
          totalRevenue: revSummary.totalNetRevenue,
          totalOrders: orderRes.data?.total || allOrders.length,
          totalProducts: productRes.data?.total || 0,
          totalCustomers: customerCount,
          successfulOrders: statusCounts.completed,
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Tổng quan về hoạt động kinh doanh
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng doanh thu"
          value={formatRevenue(stats.totalRevenue)}
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Đơn hàng"
          value={stats.successfulOrders.toLocaleString()}
          icon={ShoppingCart}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Sản phẩm"
          value={stats.totalProducts.toLocaleString()}
          icon={Package}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <StatCard
          title="Khách hàng"
          value={stats.totalCustomers.toLocaleString()}
          icon={Users}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProducts />
        <SystemStatus />
      </div>

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  );
}

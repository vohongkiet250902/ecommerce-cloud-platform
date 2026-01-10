"use client";

import { DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OrderStatusChart from "@/components/dashboard/OrderStatusChart";
import TopProducts from "@/components/dashboard/TopProducts";
import RecentOrders from "@/components/dashboard/RecentOrders";
import SystemStatus from "@/components/dashboard/SystemStatus";

export default function Dashboard() {
  return (
    <div className="space-y-6">
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
          value="2.45B"
          change="+12.5%"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Đơn hàng"
          value="1,234"
          change="+8.2%"
          changeType="positive"
          icon={ShoppingCart}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Sản phẩm"
          value="856"
          change="+3.1%"
          changeType="positive"
          icon={Package}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <StatCard
          title="Khách hàng"
          value="12,543"
          change="+15.3%"
          changeType="positive"
          icon={Users}
          iconColor="text-info"
          iconBg="bg-info/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <OrderStatusChart />
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

"use client";

import Image from "next/image";
import { AlertTriangle, Package, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  image: string;
  stock: number;
  minStock: number;
  maxStock: number;
  lastUpdated: string;
}

const inventory: InventoryItem[] = [
  {
    id: "1",
    name: "iPhone 15 Pro Max 256GB",
    sku: "IPH15PM-256",
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&h=100&fit=crop",
    stock: 45,
    minStock: 10,
    maxStock: 100,
    lastUpdated: "2024-01-15 10:30",
  },
  {
    id: "2",
    name: "MacBook Pro 14 M3",
    sku: "MBP14-M3",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop",
    stock: 8,
    minStock: 10,
    maxStock: 50,
    lastUpdated: "2024-01-14 16:45",
  },
  {
    id: "3",
    name: "Samsung Galaxy S24 Ultra",
    sku: "SGS24U-512",
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop",
    stock: 0,
    minStock: 15,
    maxStock: 80,
    lastUpdated: "2024-01-13 09:15",
  },
  {
    id: "4",
    name: "AirPods Pro 2",
    sku: "APP2-GEN",
    image:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100&h=100&fit=crop",
    stock: 150,
    minStock: 20,
    maxStock: 200,
    lastUpdated: "2024-01-15 08:00",
  },
  {
    id: "5",
    name: "iPad Pro 12.9 M2",
    sku: "IPDP129-M2",
    image:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100&h=100&fit=crop",
    stock: 5,
    minStock: 10,
    maxStock: 40,
    lastUpdated: "2024-01-14 14:20",
  },
  {
    id: "6",
    name: "Sony WH-1000XM5",
    sku: "SWXM5-BLK",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100&h=100&fit=crop",
    stock: 67,
    minStock: 15,
    maxStock: 100,
    lastUpdated: "2024-01-15 11:00",
  },
];

const statusConfig = {
  in_stock: {
    label: "Còn hàng",
    className: "bg-success/10 text-success border-success/20",
  },
  low_stock: {
    label: "Sắp hết",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  out_of_stock: {
    label: "Hết hàng",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

function getStockStatus(item: InventoryItem): StockStatus {
  if (item.stock === 0) return "out_of_stock";
  if (item.stock <= item.minStock) return "low_stock";
  return "in_stock";
}

export default function InventoryPage() {
  const columns = [
    {
      key: "name",
      header: "Sản phẩm",
      render: (item: InventoryItem) => (
        <div className="flex items-center gap-3">
          {/* <Image
            src={item.image}
            alt={item.name}
            width={48}
            height={48}
            className="rounded-lg object-cover"
          /> */}
          <div>
            <p className="font-medium text-foreground">{item.name}</p>
            <p className="text-sm text-muted-foreground font-mono">
              {item.sku}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Tồn kho",
      render: (item: InventoryItem) => {
        const status = getStockStatus(item);

        return (
          <div className="w-32">
            <div className="flex items-center justify-between mb-1">
              <span
                className={cn(
                  "font-semibold",
                  status === "out_of_stock"
                    ? "text-destructive"
                    : status === "low_stock"
                    ? "text-warning"
                    : "text-foreground"
                )}
              >
                {item.stock}
              </span>
              <span className="text-xs text-muted-foreground">
                / {item.maxStock}
              </span>
            </div>

            <Progress
              value={(item.stock / item.maxStock) * 100}
              className={cn(
                "h-2",
                status === "out_of_stock" && "[&>div]:bg-destructive",
                status === "low_stock" && "[&>div]:bg-warning"
              )}
            />
          </div>
        );
      },
    },
    {
      key: "minStock",
      header: "Tồn tối thiểu",
      render: (item: InventoryItem) => (
        <span className="text-muted-foreground">{item.minStock}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: InventoryItem) => {
        const status = getStockStatus(item);
        const config = statusConfig[status];

        return (
          <Badge
            variant="outline"
            className={cn("font-medium", config.className)}
          >
            {status === "low_stock" && (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "lastUpdated",
      header: "Cập nhật lần cuối",
      render: (item: InventoryItem) => (
        <span className="text-muted-foreground">{item.lastUpdated}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: () => (
        <Button variant="outline" size="sm">
          Cập nhật
        </Button>
      ),
    },
  ];

  const outOfStock = inventory.filter(
    (i) => getStockStatus(i) === "out_of_stock"
  ).length;

  const lowStock = inventory.filter(
    (i) => getStockStatus(i) === "low_stock"
  ).length;

  const inStock = inventory.filter(
    (i) => getStockStatus(i) === "in_stock"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tồn kho</h1>
          <p className="text-muted-foreground">
            Quản lý số lượng tồn kho sản phẩm
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Đồng bộ kho
        </Button>
      </div>

      {/* Alert */}
      {(outOfStock > 0 || lowStock > 0) && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2 rounded-lg bg-warning/20">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-medium text-foreground">Cảnh báo tồn kho</p>
            <p className="text-sm text-muted-foreground">
              Có {outOfStock} sản phẩm hết hàng và {lowStock} sản phẩm sắp hết
              hàng cần xử lý.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
              <p className="text-2xl font-bold text-foreground">
                {inventory.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Package className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Còn hàng</p>
              <p className="text-2xl font-bold text-success">{inStock}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <TrendingDown className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sắp hết</p>
              <p className="text-2xl font-bold text-warning">{lowStock}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Hết hàng</p>
              <p className="text-2xl font-bold text-destructive">
                {outOfStock}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={inventory}
        columns={columns}
        searchPlaceholder="Tìm kiếm sản phẩm..."
        searchKey="name"
      />
    </div>
  );
}

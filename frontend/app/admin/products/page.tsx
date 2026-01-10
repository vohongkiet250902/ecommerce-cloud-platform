"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Plus, Edit, Trash2, Eye, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ================= TYPES ================= */

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  salePrice?: number;
  stock: number;
  status: "active" | "inactive" | "draft";
  image: string;
}

/* ================= DATA ================= */

const products: Product[] = [
  {
    id: "PRD001",
    name: "iPhone 15 Pro Max 256GB",
    category: "Điện thoại",
    brand: "Apple",
    price: 34990000,
    salePrice: 32990000,
    stock: 45,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=100&h=100&fit=crop",
  },
  {
    id: "PRD002",
    name: "MacBook Pro 14 M3 Pro",
    category: "Laptop",
    brand: "Apple",
    price: 52990000,
    stock: 23,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop",
  },
  {
    id: "PRD003",
    name: "Samsung Galaxy S24 Ultra 512GB",
    category: "Điện thoại",
    brand: "Samsung",
    price: 33990000,
    salePrice: 30990000,
    stock: 0,
    status: "inactive",
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100&h=100&fit=crop",
  },
  {
    id: "PRD004",
    name: "AirPods Pro 2nd Gen",
    category: "Phụ kiện",
    brand: "Apple",
    price: 6990000,
    stock: 156,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100&h=100&fit=crop",
  },
  {
    id: "PRD005",
    name: "iPad Pro 12.9 M2 256GB",
    category: "Tablet",
    brand: "Apple",
    price: 29990000,
    stock: 12,
    status: "draft",
    image:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=100&h=100&fit=crop",
  },
  {
    id: "PRD006",
    name: "Dell XPS 15 i7",
    category: "Laptop",
    brand: "Dell",
    price: 42990000,
    salePrice: 39990000,
    stock: 8,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=100&h=100&fit=crop",
  },
  {
    id: "PRD007",
    name: "Sony WH-1000XM5",
    category: "Phụ kiện",
    brand: "Sony",
    price: 8990000,
    stock: 67,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100&h=100&fit=crop",
  },
  {
    id: "PRD008",
    name: "ASUS ROG Zephyrus G14",
    category: "Laptop",
    brand: "ASUS",
    price: 38990000,
    stock: 5,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=100&h=100&fit=crop",
  },
  {
    id: "PRD009",
    name: "Dell XPS 15 i7",
    category: "Laptop",
    brand: "Dell",
    price: 42990000,
    salePrice: 39990000,
    stock: 8,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=100&h=100&fit=crop",
  },
  {
    id: "PRD010",
    name: "Sony WH-1000XM5",
    category: "Phụ kiện",
    brand: "Sony",
    price: 8990000,
    stock: 67,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100&h=100&fit=crop",
  },
  {
    id: "PRD011",
    name: "ASUS ROG Zephyrus G14",
    category: "Laptop",
    brand: "ASUS",
    price: 38990000,
    stock: 5,
    status: "active",
    image:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=100&h=100&fit=crop",
  },
];

/* ================= CONFIG ================= */

const statusConfig = {
  active: {
    label: "Đang bán",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Ngừng bán",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  draft: {
    label: "Nháp",
    className: "bg-warning/10 text-warning border-warning/20",
  },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("vi-VN").format(price) + "đ";

/* ================= PAGE ================= */

export default function ProductsPage() {
  const columns = useMemo(
    () => [
      {
        key: "name",
        header: "Sản phẩm",
        render: (product: Product) => (
          <div className="flex items-center gap-3">
            {/* <Image
              src={product.image}
              alt={product.name}
              width={48}
              height={48}
              className="rounded-lg object-cover"
            /> */}
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">{product.id}</p>
            </div>
          </div>
        ),
      },
      {
        key: "category",
        header: "Danh mục",
        render: (product: Product) => (
          <div>
            <p>{product.category}</p>
            <p className="text-sm text-muted-foreground">{product.brand}</p>
          </div>
        ),
      },
      {
        key: "price",
        header: "Giá",
        render: (product: Product) =>
          product.salePrice ? (
            <div>
              <p className="font-semibold text-destructive">
                {formatPrice(product.salePrice)}
              </p>
              <p className="text-sm line-through text-muted-foreground">
                {formatPrice(product.price)}
              </p>
            </div>
          ) : (
            <p className="font-semibold">{formatPrice(product.price)}</p>
          ),
      },
      {
        key: "stock",
        header: "Tồn kho",
        render: (product: Product) => (
          <span
            className={cn(
              "font-medium",
              product.stock === 0
                ? "text-destructive"
                : product.stock < 10
                ? "text-warning"
                : "text-foreground"
            )}
          >
            {product.stock}
          </span>
        ),
      },
      {
        key: "status",
        header: "Trạng thái",
        render: (product: Product) => {
          const config = statusConfig[product.status];
          return (
            <Badge
              variant="outline"
              className={cn("font-medium", config.className)}
            >
              {config.label}
            </Badge>
          );
        },
      },
      {
        key: "actions",
        header: "",
        render: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dropdown-content">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sản phẩm</h1>
          <p className="text-muted-foreground">Quản lý danh sách sản phẩm</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
          <p className="text-2xl font-bold text-foreground">{products.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Đang bán</p>
          <p className="text-2xl font-bold text-success">
            {products.filter((p) => p.status === "active").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Hết hàng</p>
          <p className="text-2xl font-bold text-destructive">
            {products.filter((p) => p.stock === 0).length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tồn kho thấp</p>
          <p className="text-2xl font-bold text-warning">
            {products.filter((p) => p.stock > 0 && p.stock < 10).length}
          </p>
        </div>
      </div>

      <DataTable
        data={products}
        columns={columns}
        searchKey="name"
        searchPlaceholder="Tìm kiếm sản phẩm..."
      />
    </div>
  );
}

"use client";

import { Plus, Edit, Trash2, MoreHorizontal, Globe } from "lucide-react";
import Image from "next/image";

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

/* ===================== TYPES ===================== */
interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  website: string;
  productCount: number;
  status: "active" | "inactive";
}

/* ===================== MOCK DATA ===================== */
const brands: Brand[] = [
  {
    id: "1",
    name: "Apple",
    slug: "apple",
    logo: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    website: "apple.com",
    productCount: 200,
    status: "active",
  },
  {
    id: "2",
    name: "Samsung",
    slug: "samsung",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
    website: "samsung.com",
    productCount: 156,
    status: "active",
  },
  {
    id: "3",
    name: "Sony",
    slug: "sony",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg",
    website: "sony.com",
    productCount: 89,
    status: "active",
  },
  {
    id: "4",
    name: "Dell",
    slug: "dell",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg",
    website: "dell.com",
    productCount: 67,
    status: "active",
  },
  {
    id: "5",
    name: "ASUS",
    slug: "asus",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg",
    website: "asus.com",
    productCount: 78,
    status: "active",
  },
  {
    id: "6",
    name: "Xiaomi",
    slug: "xiaomi",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg",
    website: "mi.com",
    productCount: 45,
    status: "active",
  },
  {
    id: "7",
    name: "LG",
    slug: "lg",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/20/LG_symbol.svg",
    website: "lg.com",
    productCount: 34,
    status: "inactive",
  },
];

/* ===================== STATUS CONFIG ===================== */
const statusConfig = {
  active: {
    label: "Hoạt động",
    className: "bg-success/10 text-success border-success/20",
  },
  inactive: {
    label: "Ngừng",
    className: "bg-muted text-muted-foreground",
  },
};

/* ===================== PAGE ===================== */
export default function BrandsPage() {
  const columns = [
    {
      key: "name",
      header: "Thương hiệu",
      render: (brand: Brand) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center p-2">
            <Image
              src={brand.logo}
              alt={brand.name}
              width={40}
              height={40}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <p className="font-medium text-foreground">{brand.name}</p>
            <p className="text-sm text-muted-foreground">/{brand.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "website",
      header: "Website",
      render: (brand: Brand) => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>{brand.website}</span>
        </div>
      ),
    },
    {
      key: "productCount",
      header: "Sản phẩm",
      render: (brand: Brand) => (
        <Badge variant="secondary">{brand.productCount} sản phẩm</Badge>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (brand: Brand) => {
        const config = statusConfig[brand.status];
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      render: (_brand: Brand) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-content">
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Thương hiệu</h1>
          <p className="text-muted-foreground">
            Quản lý thương hiệu sản phẩm
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Thêm thương hiệu
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng thương hiệu</p>
          <p className="text-2xl font-bold text-foreground">{brands.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Đang hoạt động</p>
          <p className="text-2xl font-bold text-success">
            {brands.filter((b) => b.status === "active").length}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
          <p className="text-2xl font-bold text-primary">
            {brands.reduce((sum, b) => sum + b.productCount, 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable<Brand>
        data={brands}
        columns={columns}
        searchPlaceholder="Tìm kiếm thương hiệu..."
        searchKey="name"
      />
    </div>
  );
}

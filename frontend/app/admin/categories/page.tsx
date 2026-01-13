"use client";

import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FolderTree,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
  children?: Category[];
}

const categories: Category[] = [
  {
    id: "1",
    name: "Điện thoại",
    slug: "dien-thoai",
    children: [
      { id: "1-1", name: "iPhone", slug: "iphone", productCount: 10 },
      { id: "1-2", name: "Samsung", slug: "samsung", productCount: 10 },
      { id: "1-3", name: "Xiaomi", slug: "xiaomi", productCount: 10 },
    ],
  },
  {
    id: "2",
    name: "Laptop",
    slug: "laptop",
    children: [
      { id: "2-1", name: "MacBook", slug: "macbook", productCount: 20 },
      {
        id: "2-2",
        name: "Gaming Laptop",
        slug: "gaming-laptop",
        productCount: 20,
      },
      { id: "2-3", name: "Ultrabook", slug: "ultrabook", productCount: 20 },
    ],
  },
  {
    id: "3",
    name: "Tablet",
    slug: "tablet",
    children: [
      { id: "3-1", name: "iPad", slug: "ipad", productCount: 30 },
      {
        id: "3-2",
        name: "Android Tablet",
        slug: "android-tablet",
        productCount: 30,
      },
    ],
  },
  {
    id: "4",
    name: "Phụ kiện",
    slug: "phu-kien",
    children: [
      { id: "4-1", name: "Tai nghe", slug: "tai-nghe", productCount: 40 },
      { id: "4-2", name: "Sạc & Cáp", slug: "sac-cap", productCount: 40 },
      { id: "4-3", name: "Ốp lưng", slug: "op-lung", productCount: 40 },
    ],
  },
  {
    id: "5",
    name: "Đồng hồ thông minh",
    slug: "dong-ho-thong-minh",
    children: [
      { id: "5-1", name: "Apple Watch", slug: "apple-watch", productCount: 50 },
      { id: "5-2", name: "Galaxy Watch", slug: "galaxy-watch", productCount: 50 },
    ],
  },
];

const CategoryItem = ({
  category,
  level = 0,
}: {
  category: Category;
  level?: number;
}) => {
  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors border-b border-border last:border-0",
          level > 0 && "bg-secondary/20"
        )}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        <div className="flex items-center gap-3">
          {category.children && category.children.length > 0 ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <div className="w-4" />
          )}

          <FolderTree className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-foreground">{category.name}</p>
            <p className="text-sm text-muted-foreground">/{category.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="font-medium">
            {calculateProductCount(category)} sản phẩm
          </Badge>

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
              <DropdownMenuItem>
                <Plus className="mr-2 h-4 w-4" />
                Thêm danh mục con
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {category.children?.map((child) => (
        <CategoryItem key={child.id} category={child} level={level + 1} />
      ))}
    </>
  );
};

function calculateProductCount(category: Category): number {
  if (!category.children || category.children.length === 0) {
    return category.productCount ?? 0;
  }

  return category.children.reduce(
    (sum, child) => sum + calculateProductCount(child),
    0
  );
}

export default function CategoriesPage() {
  const totalProducts = categories.reduce(
    (sum, cat) => sum + calculateProductCount(cat),
    0
  );

  const totalCategories = categories.reduce(
    (sum, cat) => sum + 1 + (cat.children?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Danh mục</h1>
          <p className="text-muted-foreground">Quản lý danh mục sản phẩm</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Thêm danh mục
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng danh mục</p>
          <p className="text-2xl font-bold text-foreground">
            {totalCategories}
          </p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Danh mục gốc</p>
          <p className="text-2xl font-bold text-primary">{categories.length}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
          <p className="text-2xl font-bold text-success">{totalProducts}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Cây danh mục</h3>
        </div>
        <div>
          {categories.map((category) => (
            <CategoryItem key={category.id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}

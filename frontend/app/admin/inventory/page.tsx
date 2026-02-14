"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
    AlertTriangle, 
    Package, 
    TrendingDown, 
    RefreshCw, 
    Loader2,
    Save,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { productApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  uniqueId: string;
  productId: string;
  productName: string;
  sku: string;
  image: string;
  stock: number;
  attributes: string;
  lastUpdated: string;
  // Raw product for update
  rawProduct: any;
  rawVariantIndex: number;
}

const LOW_STOCK_THRESHOLD = 10;

export default function InventoryPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Update Stock State
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [updating, setUpdating] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await productApi.getProducts({ limit: 1000 }); // Fetch all or paginate
      const products = res.data.data || res.data; // API structure check
      
      const items: InventoryItem[] = [];
      
      if (Array.isArray(products)) {
          products.forEach((p: any) => {
              if (p.variants && p.variants.length > 0) {
                  p.variants.forEach((v: any, index: number) => {
                    items.push({
                        uniqueId: `${p._id}-${v.sku}`,
                        productId: p._id,
                        productName: p.name,
                        sku: v.sku,
                        image: p.images?.[0]?.url || "",
                        stock: v.stock || 0,
                        attributes: v.attributes?.map((a: any) => `${a.key}: ${a.value}`).join(", ") || "",
                        lastUpdated: p.updatedAt,
                        rawProduct: p,
                        rawVariantIndex: index
                    });
                  });
              } else {
                  // Fallback for no variants if applicable, but assuming variants exist as per schema
                  items.push({
                    uniqueId: p._id,
                    productId: p._id,
                    productName: p.name,
                    sku: "NO-SKU",
                    image: p.images?.[0]?.url || "",
                    stock: 0,
                    attributes: "Mặc định",
                    lastUpdated: p.updatedAt,
                    rawProduct: p,
                    rawVariantIndex: -1
                  })
              }
          });
      }
      setInventory(items);
    } catch (error) {
      console.error(error);
      toast({ title: "Lỗi tải kho hàng", description: "Không thể lấy dữ liệu sản phẩm", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenUpdate = (item: InventoryItem) => {
      setSelectedItem(item);
      setNewStock(item.stock);
      setIsUpdateOpen(true);
  }

  const handleUpdateStock = async () => {
      if (!selectedItem) return;
      try {
          setUpdating(true);
          
          // Construct update payload
          const product = selectedItem.rawProduct;
          // Clone variants
          const updatedVariants = [...product.variants];
          // Update specific variant
          if (selectedItem.rawVariantIndex >= 0 && updatedVariants[selectedItem.rawVariantIndex]) {
              updatedVariants[selectedItem.rawVariantIndex] = {
                  ...updatedVariants[selectedItem.rawVariantIndex],
                  stock: Number(newStock)
              };
          }

          // Recalculate totalStock if backend doesn't do it automatically (Backend usually should, but let's be safe if we send full variants)
          const totalStock = updatedVariants.reduce((acc: number, v: any) => acc + (Number(v.stock) || 0), 0);

          await productApi.updateProduct(selectedItem.productId, {
              variants: updatedVariants,
              totalStock
          });

          toast({ title: "Cập nhật tồn kho thành công", variant: "success" });
          setIsUpdateOpen(false);
          fetchInventory();
      } catch (error: any) {
         toast({ title: "Lỗi cập nhật", description: error?.response?.data?.message || "Thất bại", variant: "destructive" });
      } finally {
          setUpdating(false);
      }
  }

  // Stats
  const stats = useMemo(() => {
      const totalSKUs = inventory.length;
      const outOfStock = inventory.filter(i => i.stock === 0).length;
      const lowStock = inventory.filter(i => i.stock > 0 && i.stock <= LOW_STOCK_THRESHOLD).length;
      const inStock = totalSKUs - outOfStock - lowStock;
      return { totalSKUs, outOfStock, lowStock, inStock };
  }, [inventory]);

  const columns = [
    {
      key: "name",
      header: "Sản phẩm",
      render: (item: InventoryItem) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative rounded-md overflow-hidden bg-muted border border-border shrink-0">
             {item.image ? (
                 <Image src={item.image} alt={item.productName} fill className="object-cover" />
             ) : (
                 <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Img</div>
             )}
          </div>
          <div>
            <p className="font-medium text-sm text-foreground line-clamp-1" title={item.productName}>{item.productName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
               <Badge variant="secondary" className="px-1 py-0 text-[10px] h-4 font-normal">{item.sku}</Badge>
               {item.attributes && <span className="line-clamp-1 text-[10px]">{item.attributes}</span>}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Tồn kho",
      render: (item: InventoryItem) => {
        const isOutOfStock = item.stock === 0;
        const isLowStock = item.stock <= LOW_STOCK_THRESHOLD && !isOutOfStock;
        
        return (
          <div className="w-24">
             <div className="flex items-center justify-between mb-1.5">
                 <span className={cn(
                     "font-bold text-sm",
                     isOutOfStock ? "text-destructive" : isLowStock ? "text-warning" : "text-success"
                 )}>
                     {item.stock}
                 </span>
             </div>
             <Progress 
                value={item.stock > 100 ? 100 : item.stock} 
                className={cn("h-1.5 bg-muted", 
                    isOutOfStock && "[&>div]:bg-destructive",
                    isLowStock && "[&>div]:bg-warning",
                    !isOutOfStock && !isLowStock && "[&>div]:bg-success"
                )} 
            />
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (item: InventoryItem) => {
        if (item.stock === 0) return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">Hết hàng</Badge>;
        if (item.stock <= LOW_STOCK_THRESHOLD) return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">Sắp hết</Badge>;
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20 hover:bg-success/20">Còn hàng</Badge>;
      },
    },
    {
      key: "lastUpdated",
      header: "Cập nhật",
      render: (item: InventoryItem) => (
        <span className="text-muted-foreground text-xs">
            {new Date(item.lastUpdated).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (item: InventoryItem) => (
        <Button variant="ghost" size="sm" className="h-8 border border-border hover:bg-accent hover:text-accent-foreground" onClick={() => handleOpenUpdate(item)}>
           <span className="text-xs">Cập nhật</span>
        </Button>
      ),
    },
  ];

  if (loading) {
      return (
          <div className="h-[80vh] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kho hàng</h1>
          <p className="text-muted-foreground">
            Quản lý tồn kho chi tiết theo từng biến thể sản phẩm
          </p>
        </div>
        <Button variant="outline" onClick={fetchInventory}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Đồng bộ kho
        </Button>
      </div>

      {/* Alert */}
      {(stats.outOfStock > 0 || stats.lowStock > 0) && (
        <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-900 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-foreground">Cần chú ý</p>
            <p className="text-sm text-muted-foreground">
              Có <span className="font-bold text-destructive">{stats.outOfStock}</span> Sản phẩm hết hàng và <span className="font-bold text-warning">{stats.lowStock}</span> Sản phẩm sắp hết hàng cần bổ sung.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Tổng Sản phẩm</p>
              <div className="flex items-baseline gap-2 mt-1">
                 <p className="text-2xl font-bold text-foreground">{stats.totalSKUs}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Package className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Còn hàng</p>
              <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-success">{stats.inStock}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <TrendingDown className="h-5 w-5 text-warning" />
            </div>
             <div>
              <p className="text-sm text-muted-foreground font-medium">Sắp hết</p>
              <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-warning">{stats.lowStock}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
             <div>
              <p className="text-sm text-muted-foreground font-medium">Hết hàng</p>
               <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-2xl font-bold text-destructive">{stats.outOfStock}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable<InventoryItem>
        data={inventory}
        columns={columns}
        searchPlaceholder="Tìm kiếm tên sản phẩm..."
        searchKey="productName"
      />

      {/* Status Update Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle>Cập nhật tồn kho</DialogTitle>
                  <DialogDescription>
                      Cập nhật số lượng tồn kho cho Sản phẩm <span className="font-mono font-bold text-foreground">{selectedItem?.productName}</span>
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label>Sản phẩm</Label>
                      <Input value={selectedItem?.productName} disabled className="bg-muted" />
                  </div>
                   <div className="space-y-2">
                      <Label>Biến thể</Label>
                      <Input value={selectedItem?.attributes} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                       <Label>Số lượng tồn kho mới</Label>
                       <Input 
                            type="number" 
                            min={0} 
                            value={newStock} 
                            onChange={(e) => setNewStock(Number(e.target.value))} 
                            className="text-lg font-bold"
                            autoFocus
                        />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>Hủy</Button>
                  <Button onClick={handleUpdateStock} disabled={updating}>
                      {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Lưu thay đổi
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

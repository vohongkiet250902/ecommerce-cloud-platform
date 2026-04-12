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
    Search,
    Plus,
    Minus,
    Layers,
    Box,
    Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { productApi, inventoryApi } from "@/services/api";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  uniqueId: string;
  productId: string;
  productName: string;
  sku: string;
  image: string;
  stock: number;
  price: number;
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
  const [importQuantity, setImportQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "out_of_stock" | "low_stock" | "in_stock">("all");
  const [showLossConfirm, setShowLossConfirm] = useState(false);

  // Detail View State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [lots, setLots] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await productApi.getAdminProducts({ limit: 1000 }); // Fetch all or paginate
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
                        image: v.image?.url || p.images?.[0]?.url || "",
                        stock: v.stock || 0,
                        price: v.price || 0,
                        attributes: v.attributes?.map((a: any) => `${a.key}: ${a.value}`).join(", ") || "",
                        lastUpdated: p.updatedAt,
                        rawProduct: p,
                        rawVariantIndex: index
                    });
                  });
              } else {
                  // Mặt hàng đơn giản không có phân loại biến thể, lấy dữ liệu từ top-level của sản phẩm
                  items.push({
                    uniqueId: p._id,
                    productId: p._id,
                    productName: p.name,
                    sku: p.sku || "N/A",
                    image: p.images?.[0]?.url || "",
                    stock: p.stock ?? p.totalStock ?? 0,
                    price: p.price ?? 0,
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
      setImportQuantity(0);
      setUnitCost(0);
      setSellingPrice(item.price);
      setNote("");
      setIsUpdateOpen(true);
  }

  const handleOpenDetail = async (item: InventoryItem) => {
      setSelectedItem(item);
      setIsDetailOpen(true);
      setDetailLoading(true);
      try {
          const res = await inventoryApi.getLots({ sku: item.sku });
          setLots(res.data.data || res.data);
      } catch (error) {
          console.error(error);
          toast({ title: "Lỗi", description: "Không thể lấy chi tiết nhập kho", variant: "destructive" });
      } finally {
          setDetailLoading(false);
      }
  }

  const handleStockIn = async (bypassConfirm = false) => {
      if (!selectedItem) return;
      if (importQuantity <= 0) {
        toast({ title: "Lỗi", description: "Số lượng nhập phải lớn hơn 0", variant: "destructive" });
        return;
      }

      const margin = sellingPrice > 0 ? ((sellingPrice - unitCost) / sellingPrice) * 100 : -100;
      

      // Nếu bán lỗ hoặc hòa vốn mà chưa bypass confirm
      if (margin <= 0 && !bypassConfirm) {
          setShowLossConfirm(true);
          return;
      }

      try {
          setUpdating(true);
          await inventoryApi.stockIn({
            productId: selectedItem.productId,
            sku: selectedItem.sku,
            quantity: importQuantity,
            unitCost: unitCost,
            sourceType: 'purchase',
            note: note || undefined
          });

          toast({ title: "Nhập kho thành công", variant: "success" });
          setIsUpdateOpen(false);
          setShowLossConfirm(false);
          setImportQuantity(0);
          setUnitCost(0);
          setSellingPrice(0);
          setNote("");
          fetchInventory();
      } catch (error: any) {
         const msg = error?.response?.data?.message || "Thất bại";
         toast({ 
            title: "Lỗi nhập kho", 
            description: typeof msg === "string" ? msg : (Array.isArray(msg) ? msg.join(", ") : JSON.stringify(msg)), 
            variant: "destructive" 
         });
      } finally {
          setUpdating(false);
      }
  }

  // Filtered Data
  const filteredInventory = useMemo(() => {
      return inventory.filter(item => {
          if (statusFilter === "all") return true;
          if (statusFilter === "out_of_stock") return item.stock === 0;
          if (statusFilter === "low_stock") return item.stock > 0 && item.stock <= LOW_STOCK_THRESHOLD;
          if (statusFilter === "in_stock") return item.stock > LOW_STOCK_THRESHOLD;
          return true;
      });
  }, [inventory, statusFilter]);

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
            <p className="font-semibold text-sm text-foreground" title={item.productName}>{item.productName}</p>
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
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 border border-border hover:bg-accent hover:text-accent-foreground" onClick={() => handleOpenDetail(item)}>
               <span className="text-xs">Chi tiết</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 border border-border hover:bg-primary/10 hover:text-primary" onClick={() => handleOpenUpdate(item)}>
               <span className="text-xs">Nhập kho</span>
            </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kho hàng</h1>
          <p className="text-muted-foreground">
            Quản lý tồn kho và nhập xuất chi tiết theo từng sản phẩm
          </p>
        </div>
      </div>

      {/* Alert */}
      {!loading && (stats.outOfStock > 0 || stats.lowStock > 0) && (
        <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-900 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
          </div>
          <div>
            <p className="font-medium text-foreground">Cần chú ý</p>
            <p className="text-sm text-muted-foreground">
              {stats.outOfStock > 0 && (
                <>
                  Có <span className="font-bold text-destructive">{stats.outOfStock}</span> mã sản phẩm hết hàng
                </>
              )}
              {stats.outOfStock > 0 && stats.lowStock > 0 && " và "}
              {stats.lowStock > 0 && (
                <>
                  Có <span className="font-bold text-warning">{stats.lowStock}</span> mã sản phẩm sắp hết hàng
                </>
              )}
              {" cần bổ sung ngay."}
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
              <p className="text-sm text-muted-foreground font-medium">Tổng Mã Sản phẩm</p>
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
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-card/50 rounded-xl border border-dashed border-border/40">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground animate-pulse">Đang tải kho hàng...</p>
          </div>
        </div>
      ) : (
        <DataTable<InventoryItem>
          data={filteredInventory}
          columns={columns}
          searchPlaceholder="Tìm kiếm tên hoặc mã SKU..."
          pageSize={10}
          filterNode={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2 bg-background/50 border-border/40">
                  <Filter className="h-4 w-4" />
                  <span>
                    {statusFilter === "all" ? "Tất cả trạng thái" : 
                     statusFilter === "out_of_stock" ? "Hết hàng" : 
                     statusFilter === "low_stock" ? "Sắp hết hàng" : "Còn hàng"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="dropdown-content">
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tất cả trạng thái</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("out_of_stock")}>Hết hàng</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("low_stock")}>Sắp hết hàng</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_stock")}>Còn hàng</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      )}

      {/* Premium Stock Update Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
              <DialogHeader className="sr-only">
                  <DialogTitle>Nhập kho sản phẩm</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col">
                  <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 flex items-center gap-5 border-b border-border/50">
                      <div className="h-20 w-20 relative rounded-2xl overflow-hidden bg-background border-4 border-background shadow-xl shrink-0">
                          {selectedItem?.image ? (
                              <Image src={selectedItem.image} alt={selectedItem.productName} fill className="object-cover" />
                          ) : (
                              <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                                  <Box className="h-8 w-8" />
                              </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xl text-foreground leading-tight">{selectedItem?.productName}</h3>
                          <div className="flex wrap items-center gap-2 mt-2">
                             <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 font-bold uppercase tracking-wider bg-primary/10 text-primary border-none">
                                {selectedItem?.sku}
                             </Badge>
                             <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-widest">
                                <Layers className="h-3 w-3" />
                                {selectedItem?.attributes || "Mặc định"}
                             </p>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 space-y-6">
                      {/* Input Section */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2 space-y-2">
                            <Label className="text-sm font-semibold ml-1">Số lượng nhập</Label>
                            <Input 
                                type="number" 
                                min={1} 
                                value={importQuantity === 0 ? "" : importQuantity} 
                                onChange={(e) => setImportQuantity(Number(e.target.value))} 
                                className="h-12 bg-muted/30"
                            />
                          </div>
                          
                          <div className="col-span-1 space-y-2">
                             <Label className="text-sm font-semibold ml-1">Đơn giá nhập (VND)</Label>
                             <Input 
                                 type="number" 
                                 min={0} 
                                 value={unitCost === 0 ? "" : unitCost} 
                                 onChange={(e) => setUnitCost(Number(e.target.value))} 
                                 className="h-12 bg-muted/30"
                             />
                           </div>

                          <div className="col-span-1 space-y-2">
                             <Label className="text-sm font-semibold ml-1">Giá bán hiện tại (VND)</Label>
                             <div className="h-12 bg-muted/20 border border-border/50 rounded-md flex items-center px-3 font-bold text-primary">
                                 {sellingPrice.toLocaleString("vi-VN")}
                             </div>
                             <p className="text-[10px] text-muted-foreground ml-1 italic">* Giá bán cố định, đã thiết lập trước</p>
                           </div>
 
                           {/* Gross Margin Calculation */}
                           {unitCost > 0 && (
                             <div className={cn(
                               "col-span-2 p-4 rounded-xl border flex items-center justify-between",
                               unitCost >= sellingPrice 
                                 ? "bg-destructive/5 border-destructive/20 text-destructive" 
                                 : "bg-success/5 border-success/20 text-success"
                             )}>
                               <div>
                                 <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Biên lợi nhuận dự tính</p>
                                 <p className="text-xl font-black">
                                   {sellingPrice > 0 
                                     ? (((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(1) 
                                     : "-100"}%
                                 </p>
                               </div>
                               <div className="text-right">
                                 {unitCost >= sellingPrice ? (
                                   <div className="flex flex-col items-end">
                                      <div className="flex items-center gap-1.5 font-bold text-sm">
                                        <AlertTriangle className="h-4 w-4" />
                                        Cảnh báo bán lỗ!
                                      </div>
                                      <p className="text-[10px] opacity-80">Giá nhập cao hơn hoặc bằng giá bán</p>
                                   </div>
                                 ) : (
                                   <div className="flex flex-col items-end">
                                      <div className="flex items-center gap-1.5 font-bold text-sm">
                                        <TrendingDown className="h-4 w-4 rotate-180" />
                                        Biên độ an toàn
                                      </div>
                                      <p className="text-[10px] opacity-80">Lợi nhuận: {(sellingPrice - unitCost).toLocaleString("vi-VN")} đ/sản phẩm</p>
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}
 
                           <div className="col-span-2 space-y-2">
                             <Label className="text-sm font-semibold ml-1">Ghi chú</Label>
                             <Input 
                                 type="text" 
                                 value={note} 
                                 placeholder="Nhập ghi chú khi nhập kho"
                                 onChange={(e) => setNote(e.target.value)} 
                                 className="h-10 bg-muted/30"
                             />
                           </div>
                       </div>

                       <div className="flex items-center justify-end gap-3 pt-4">
                          <Button 
                              variant="outline" 
                              className="border-border/60"
                              onClick={() => setIsUpdateOpen(false)}
                          >Hủy</Button>
                          <Button className="font-bold" onClick={() => handleStockIn()} disabled={updating}>
                              {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                              Xác nhận nhập kho
                          </Button>
                      </div>
                  </div>
              </div>
          </DialogContent>
      </Dialog>

      {/* Batch History Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
              <DialogHeader className="p-0 border-b border-border/50">
                  <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 flex items-center gap-5">
                      <div className="h-20 w-20 relative rounded-2xl overflow-hidden bg-background border-4 border-background shadow-xl shrink-0">
                          {selectedItem?.image ? (
                              <Image src={selectedItem.image} alt={selectedItem.productName} fill className="object-cover" />
                          ) : (
                              <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                                  <Box className="h-8 w-8" />
                              </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                          <DialogTitle className="font-bold text-xl text-foreground leading-tight">Lịch sử nhập kho: {selectedItem?.productName}</DialogTitle>
                          <div className="flex wrap items-center gap-2 mt-2">
                             <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 font-bold uppercase tracking-wider bg-primary/10 text-primary border-none">
                                {selectedItem?.sku}
                             </Badge>
                             <p className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-widest">
                                <Layers className="h-3 w-3" />
                                {selectedItem?.attributes || "Mặc định"}
                             </p>
                          </div>
                      </div>
                  </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                  {detailLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground animate-pulse font-medium">Đang lấy dữ liệu lô hàng...</p>
                      </div>
                  ) : lots.length === 0 ? (
                      <div className="py-20 text-center space-y-3">
                          <div className="inline-flex p-4 rounded-full bg-muted">
                              <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium">Chưa có thông tin nhập kho chi tiết.</p>
                      </div>
                  ) : (
                      <div className="p-6">
                          <div className="space-y-4">
                              {lots.map((lot, idx) => (
                                  <div key={lot._id} className="group relative border border-border rounded-xl p-4 transition-all hover:bg-muted/5 hover:border-primary/20">
                                      <div className="absolute -left-1 top-4 w-1 h-12 bg-primary/20 rounded-full group-hover:bg-primary transition-colors" />
                                      <div className="flex items-start justify-between">
                                          <div className="space-y-1">
                                              <div className="flex items-center gap-3">
                                                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold">Lô #{lots.length - idx}</Badge>
                                                  <span className="text-xs font-bold text-muted-foreground">
                                                      {new Date(lot.receivedAt).toLocaleString("vi-VN", {
                                                          day: "2-digit",
                                                          month: "2-digit",
                                                          year: "numeric",
                                                          hour: "2-digit",
                                                          minute: "2-digit"
                                                      })}
                                                  </span>
                                              </div>
                                              <p className="text-sm font-semibold mt-2">{lot.note || "Không có ghi chú"}</p>
                                          </div>
                                          <div className="text-right space-y-1">
                                              <p className="text-xs text-muted-foreground">Số lượng</p>
                                              <p className="font-bold text-lg">+{lot.originalQuantity}</p>
                                              <p className="text-[10px] text-muted-foreground italic">Còn lại: {lot.remainingQuantity}</p>
                                          </div>
                                      </div>
                                      <div className="mt-4 pt-4 border-t border-border/50">
                                          <div>
                                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Giá nhập</p>
                                              <p className="font-bold text-sm text-foreground">
                                                  {lot.unitCost.toLocaleString("vi-VN")} <span className="text-[10px]">VNĐ</span>
                                              </p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </ScrollArea>

              <DialogFooter className="p-4 bg-muted/10 border-t border-border/50">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="rounded-xl px-6">Đóng</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Loss Confirmation Dialog */}
      <AlertDialog open={showLossConfirm} onOpenChange={setShowLossConfirm}>
          <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
              <AlertDialogHeader>
                  <div className="flex items-center gap-3 text-destructive mb-2">
                    <div className="p-2 rounded-full bg-destructive/10">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-destructive">Cảnh báo: Bán lỗ / Hòa vốn</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border/40">
                      Bạn đang thực hiện nhập kho với giá nhập (<span className="font-bold text-foreground">{unitCost.toLocaleString("vi-VN")}đ</span>) 
                      {unitCost > sellingPrice ? " cao hơn " : " bằng "} 
                      giá bán hiện tại (<span className="font-bold text-foreground">{sellingPrice.toLocaleString("vi-VN")}đ</span>).
                      <br /><br />
                      Biên lợi nhuận dự tính: <span className="font-bold text-destructive">
                        {sellingPrice > 0 ? (((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(1) : "-100"}%
                      </span>
                      <br />
                      <span className="text-xs mt-3 block font-medium text-destructive/80 italic">
                        * Bạn có chắc chắn muốn tiếp tục nhập kho với mức giá này không?
                      </span>
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-3">
                  <AlertDialogCancel asChild>
                    <Button variant="outline" className="rounded-xl font-semibold border-border/60">
                      Kiểm tra lại
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button 
                      variant="destructive" 
                      className="rounded-xl font-bold gap-2 px-6"
                      onClick={() => handleStockIn(true)}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Tôi hiểu, vẫn xác nhận
                    </Button>
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

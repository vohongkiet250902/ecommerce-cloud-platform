import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PeriodData, formatCurrency } from "./StatisticsData";
import { cn } from "@/lib/utils";
import { Trophy, Medal, TrendingUp, Package, Tag, ArrowUpRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  data: PeriodData;
  periodLabel: string;
}

const ProductInfo = ({ name, sku, image }: { name: string; sku?: string; image?: string }) => (
  <div className="flex items-center gap-3">
    <div className="relative group overflow-hidden rounded-lg h-10 w-10 border border-border/20 shadow-sm shrink-0">
      {image ? (
        <img 
          src={image} 
          alt={name} 
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
        />
      ) : (
        <div className="h-full w-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground uppercase font-bold">
          No Img
        </div>
      )}
      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-sm font-bold text-foreground line-clamp-1 truncate" title={name}>{name}</span>
      <div className="flex items-center gap-1.5">
        {sku && <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">#{sku}</span>}
      </div>
    </div>
  </div>
);

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return (
    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 shadow-sm">
      <Trophy className="h-4 w-4" />
    </div>
  );
  if (rank === 2) return (
    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-400/10 border border-slate-400/20 text-slate-500 shadow-sm">
      <Medal className="h-4 w-4" />
    </div>
  );
  if (rank === 3) return (
    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/10 border border-amber-600/20 text-amber-700 shadow-sm">
      <Medal className="h-4 w-4" />
    </div>
  );
  return (
    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted/50 border border-border/10 text-muted-foreground text-xs font-bold">
      {rank}
    </div>
  );
};

const DetailTables = ({ data, periodLabel }: Props) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card className="border-border/20 shadow-md overflow-hidden flex flex-col transition-all hover:shadow-lg group/import">
      <CardHeader className="bg-gradient-to-r from-muted/30 to-background pb-4 border-b border-border/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 opacity-5 group-hover/import:scale-110 transition-transform">
           <Package className="h-24 w-24 -mr-6 -mt-6" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Package className="h-4 w-4" />
            </div>
            Chi tiết nhập kho
          </CardTitle>
          <Badge variant="outline" className="text-[10px] h-5 capitalize bg-background/80 backdrop-blur-sm font-bold border-border/20 text-muted-foreground">
            {periodLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          <Table className="relative">
            <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="border-border/10">
                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Sản phẩm</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm whitespace-nowrap">SL nhập</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Thời gian</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Tổng tiền</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.importDetails.length > 0 ? (
                data.importDetails.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/5 transition-colors border-border/5">
                    <TableCell className="py-2.5">
                      <ProductInfo name={item.name} sku={item.sku} image={item.image} />
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                       <span className="font-bold text-sm bg-muted/50 px-2 py-0.5 rounded-md">+{item.quantity}</span>
                    </TableCell>
                    <TableCell className="text-right py-2.5 font-medium text-[10px] text-muted-foreground">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-foreground">
                          {item.date ? new Date(item.date).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "short"
                          }) : "N/A"}
                        </span>
                        <span className="opacity-60 text-[9px]">
                          {item.date ? new Date(item.date).getFullYear() : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <span className="font-bold text-sm text-primary">
                        {formatCurrency(item.cost)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-16 text-muted-foreground italic text-sm border-none bg-muted/5"
                  >
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <Package className="h-8 w-8" />
                      <p>Không có dữ liệu nhập kho trong khoảng thời gian này</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {data.importProducts > 0 && (
          <div className="flex items-center justify-between p-5 bg-muted/30 border-t border-border/10 backdrop-blur-sm">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-70 mb-1">Tổng quan nhập hàng</span>
              <span className="text-sm font-bold flex items-center gap-2">
                Tổng cộng <Badge variant="secondary" className="h-5 px-1.5 font-black">{data.importProducts}</Badge> lô hàng
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground mb-1 font-bold">{data.importQuantity} sản phẩm đã nhập</span>
              <span className="text-lg font-black text-primary leading-none">{formatCurrency(data.importTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Card className="border-border/20 shadow-md overflow-hidden flex flex-col transition-all hover:shadow-lg group/card">
      <CardHeader className="bg-gradient-to-r from-muted/30 to-background pb-4 border-b border-border/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-1 opacity-5 group-hover/card:scale-110 transition-transform">
           <Trophy className="h-24 w-24 -mr-6 -mt-6" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-success/10 text-success">
              <TrendingUp className="h-4 w-4" />
            </div>
            Top sản phẩm bán chạy
          </CardTitle>
          <Badge variant="outline" className="text-[10px] h-5 capitalize bg-background/80 backdrop-blur-sm font-bold border-border/20 text-muted-foreground">
            {periodLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          <Table className="relative">
            <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="border-border/10">
                <TableHead className="w-[60px] text-center text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Hạng</TableHead>
                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Sản phẩm</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm whitespace-nowrap">Hiệu suất bán</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Lợi nhuận gộp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.salesDetails.length > 0 ? (() => {
                const maxQty = Math.max(...data.salesDetails.map(i => i.quantity));
                return data.salesDetails.map((item, idx) => (
                  <TableRow key={idx} className={cn(
                    "hover:bg-muted/5 transition-colors border-border/5",
                    idx < 3 ? "bg-primary/[0.01]" : ""
                  )}>
                    <TableCell className="py-2.5 text-center">
                      <div className="flex justify-center">
                        <RankBadge rank={idx + 1} />
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <ProductInfo name={item.name} sku={item.sku} image={item.image} />
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5">
                           <span className={cn(
                             "font-black text-sm",
                             idx === 0 ? "text-primary text-base" : "text-foreground"
                           )}>{item.quantity}</span>
                           <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">sản phẩm</span>
                        </div>
                        <div className="w-24">
                          <Progress 
                            value={(item.quantity / maxQty) * 100} 
                            className={cn(
                              "h-1 bg-muted/50",
                              idx === 0 ? "[&>div]:bg-primary" : idx < 3 ? "[&>div]:bg-success/70" : "[&>div]:bg-muted-foreground/30"
                            )} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2.5">
                      <div className="flex flex-col items-end justify-center h-full">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-black text-xs px-2 py-0.5 border-none",
                            (item.profitMargin ?? 0) > 30 ? "bg-success/10 text-success" : 
                            (item.profitMargin ?? 0) > 15 ? "bg-primary/10 text-primary" : 
                            (item.profitMargin ?? 0) > 0 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {(item.profitMargin ?? 0).toFixed(1)}%
                        </Badge>
                        <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-tighter opacity-60">
                          {(item.profitMargin ?? 0) > 0 ? "Biên lãi" : "Bán lỗ"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              })() : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-16 text-muted-foreground italic text-sm border-none bg-muted/5"
                  >
                    <div className="flex flex-col items-center gap-2 opacity-50">
                      <Package className="h-8 w-8" />
                      <p>Chưa có giao dịch bán hàng trong khoảng thời gian này</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default DetailTables;

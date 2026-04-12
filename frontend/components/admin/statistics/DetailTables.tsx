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

interface Props {
  data: PeriodData;
  periodLabel: string;
}

const ProductInfo = ({ name, sku, image }: { name: string; sku?: string; image?: string }) => (
  <div className="flex items-center gap-3">
    {image ? (
      <img src={image} alt={name} className="h-10 w-10 rounded-md object-cover border border-border/20 shadow-sm" />
    ) : (
      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-[10px] text-muted-foreground border border-border/10 uppercase">
        No Img
      </div>
    )}
    <div className="flex flex-col">
      <span className="text-sm font-semibold text-foreground line-clamp-1 max-w-[150px]">{name}</span>
      {sku && <span className="text-[10px] text-muted-foreground font-mono opacity-60">SKU: {sku}</span>}
    </div>
  </div>
);

const DetailTables = ({ data, periodLabel }: Props) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card className="border-border/20 shadow-sm overflow-hidden flex flex-col">
      <CardHeader className="bg-muted/20 pb-4 border-b border-border/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            Chi tiết nhập kho
          </CardTitle>
          <Badge variant="outline" className="text-[10px] h-5 capitalize bg-background font-bold border-border/20">
            {periodLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          <Table className="relative">
            <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="border-border/10">
                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Sản phẩm</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">SL nhập</TableHead>
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
                    <TableCell className="text-right font-bold text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium text-[10px] text-muted-foreground">
                      {item.date ? new Date(item.date).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "short"
                      }) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {formatCurrency(item.cost)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-muted-foreground italic text-sm border-none"
                  >
                    Không có dữ liệu nhập kho trong khoảng thời gian này
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {data.importProducts > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted/20 border-t border-border/10">
            <span className="text-sm font-bold">Tổng cộng ({data.importProducts} lô)</span>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">{data.importQuantity} sản phẩm</span>
              <span className="text-base font-bold text-primary">{formatCurrency(data.importTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    <Card className="border-border/20 shadow-sm overflow-hidden flex flex-col">
      <CardHeader className="bg-muted/20 pb-4 border-b border-border/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            Top sản phẩm bán chạy
          </CardTitle>
          <Badge variant="outline" className="text-[10px] h-5 capitalize bg-background font-bold border-border/20">
            {periodLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
          <Table className="relative">
            <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow className="border-border/10">
                <TableHead className="text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Sản phẩm</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">SL bán</TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold tracking-wider py-3 h-11 bg-muted/30 backdrop-blur-sm">Doanh thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.salesDetails.length > 0 ? (
                data.salesDetails.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/5 transition-colors border-border/5">
                    <TableCell className="py-2.5">
                      <ProductInfo name={item.name} sku={item.sku} image={item.image} />
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold text-sm text-success">
                        {formatCurrency(item.revenue)}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Ship: {formatCurrency(item.shipping)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-10 text-muted-foreground italic text-sm border-none"
                  >
                    Chưa có giao dịch bán hàng trong khoảng thời gian này
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {data.salesProducts > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted/20 border-t border-border/10">
            <span className="text-sm font-bold">Tổng cộng ({data.salesProducts} loại)</span>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">{data.salesQuantity} sản phẩm</span>
              <span className="text-base font-bold text-success">{formatCurrency(data.salesTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

export default DetailTables;

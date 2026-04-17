import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trophy,
} from "lucide-react";
import { PeriodData, formatCurrency } from "./StatisticsData";
import { cn } from "@/lib/utils";

interface Props {
  data: PeriodData;
  periodLabel: string;
}

const GrowthIndicator = ({ 
  growth, 
  label 
}: { 
  growth?: { percentage: number; trend: "up" | "down" | "flat" };
  label?: string;
}) => {
  if (!growth) return null;

  const isUp = growth.trend === "up";
  const isDown = growth.trend === "down";

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
        isUp ? "bg-success/10 text-success" : 
        isDown ? "bg-destructive/10 text-destructive" : 
        "bg-muted text-muted-foreground"
      )}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : 
         isDown ? <ArrowDownRight className="h-3 w-3" /> : 
         <Minus className="h-3 w-3" />}
        {Math.abs(growth.percentage)}%
      </div>
      {label && <span className="text-[10px] text-muted-foreground font-medium">{label}</span>}
    </div>
  );
};

const SummaryCards = ({ data, periodLabel }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="animate-fade-in hover:shadow-md transition-all duration-300 border-border/20 overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-3 bg-primary/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
        <Package className="h-5 w-5 text-primary/40" />
      </div>
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tổng nhập kho
          </p>
          <p className="text-2xl font-bold text-card-foreground">
            {formatCurrency(data.importTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
             <span>{data.importQuantity} sản phẩm / {data.importProducts} lô</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="animate-fade-in hover:shadow-md transition-all duration-300 border-border/20 overflow-hidden relative group delay-75">
      <div className="absolute top-0 right-0 p-3 bg-success/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
        <ShoppingCart className="h-5 w-5 text-success/40" />
      </div>
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Doanh thu thuần
          </p>
          <p className="text-2xl font-bold text-card-foreground">
            {formatCurrency(data.salesTotal)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">{data.salesQuantity} đơn hàng</span>
            <GrowthIndicator growth={data.revenueGrowth} label="so với kỳ trước" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="animate-fade-in hover:shadow-md transition-all duration-300 border-border/20 overflow-hidden relative group delay-100">
      <div className="absolute top-0 right-0 p-3 bg-warning/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
        <DollarSign className="h-5 w-5 text-warning/40" />
      </div>
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Lợi nhuận ròng
          </p>
          <p className={cn(
            "text-2xl font-bold",
            data.profit >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(data.profit)}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className={cn(
                "text-[10px] font-bold px-1 rounded",
                data.profitMargin >= 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
              )}>
                {data.profitMargin}%
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">biên lãi</span>
            </div>
            <GrowthIndicator growth={data.profitGrowth} label="so với kỳ trước" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="animate-fade-in hover:shadow-md transition-all duration-300 border-border/20 overflow-hidden relative group delay-150">
      <div className="absolute top-0 right-0 p-3 bg-info/5 rounded-bl-3xl group-hover:scale-110 transition-transform">
        <Trophy className="h-5 w-5 text-info/40" />
      </div>
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sản phẩm TOP
          </p>
          <p className="text-lg font-bold text-card-foreground line-clamp-1 h-8 leading-8">
            {data.bestSellers[0]?.name || "Chưa có"}
          </p>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-info" />
              <span className="text-[11px] text-muted-foreground font-bold">
                {data.bestSellers[0]?.sold || 0} đã bán
              </span>
            </div>
             <span className="text-[10px] text-muted-foreground opacity-60 italic">{periodLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default SummaryCards;

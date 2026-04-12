export type Period = "day" | "week" | "month" | "quarter" | "year";

export interface PeriodData {
  importTotal: number;
  importQuantity: number;
  importProducts: number;
  salesTotal: number;
  salesQuantity: number;
  salesProducts: number;
  profit: number;
  profitMargin: number;
  revenueGrowth?: { percentage: number; trend: "up" | "down" | "flat" };
  profitGrowth?: { percentage: number; trend: "up" | "down" | "flat" };
  importDetails: {
    name: string;
    quantity: number;
    cost: number;
    image?: string;
    sku?: string;
    date?: string;
  }[];
  salesDetails: {
    name: string;
    quantity: number;
    revenue: number;
    shipping: number;
    image?: string;
    sku?: string;
  }[];
  bestSellers: {
    name: string;
    sold: number;
    revenue: number;
    change: number;
    image: string;
  }[];
  profitChart: {
    label: string;
    revenue: number;
    cost: number;
    shipping: number;
    profit: number;
  }[];
}

export const formatCurrency = (value: number) => {
  return value.toLocaleString("vi-VN") + " đ";
};

export const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
];

export const periodLabels: Record<Period, string> = {
  day: "hôm nay",
  week: "tuần này",
  month: "tháng này",
  quarter: "quý này",
  year: "năm nay",
};

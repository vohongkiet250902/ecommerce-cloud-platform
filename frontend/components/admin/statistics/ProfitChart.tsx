import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "./StatisticsData";

interface Props {
  data: { label: string; revenue: number; cost: number; profit: number }[];
}

const ProfitChart = ({ data }: Props) => (
  <Card className="border-border/20 shadow-sm">
    <CardHeader className="flex flex-row items-center justify-between pb-8">
      <CardTitle className="text-base font-bold">Biểu đồ Doanh thu - Giá vốn - Lợi nhuận</CardTitle>
      <div className="flex gap-4 text-[11px] font-medium text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          Doanh thu
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
          Giá vốn
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-warning" />
          Phí ship
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-success" />
          Lợi nhuận
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
              </linearGradient>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.5}/>
              </linearGradient>
              <linearGradient id="colorShipping" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.5}/>
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.5}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.1)" />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatCurrency(v)}
              width={120}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border)/0.5)",
                borderRadius: "12px",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                padding: "12px"
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value: any, name: any) => [
                formatCurrency(Number(value) || 0),
                name === "revenue"
                  ? "Doanh thu"
                  : name === "cost"
                  ? "Giá vốn"
                  : name === "shipping"
                  ? "Phí ship"
                  : "Lợi nhuận",
              ]}
            />
            <Bar
              dataKey="revenue"
              fill="url(#colorRev)"
              radius={[4, 4, 0, 0]}
              name="revenue"
              barSize={15}
            />
            <Bar
              dataKey="cost"
              fill="url(#colorCost)"
              radius={[4, 4, 0, 0]}
              name="cost"
              barSize={15}
            />
            <Bar
              dataKey="shipping"
              fill="url(#colorShipping)"
              radius={[4, 4, 0, 0]}
              name="shipping"
              barSize={15}
            />
            <Bar
              dataKey="profit"
              fill="url(#colorProfit)"
              radius={[4, 4, 0, 0]}
              name="profit"
              barSize={15}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

export default ProfitChart;

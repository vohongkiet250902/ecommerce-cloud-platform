"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface OrderStatusChartProps {
  data?: { name: string; value: number; color: string }[];
}

const defaultData = [
  { name: "Chờ xử lý", value: 0, color: "hsl(var(--warning))" },
  { name: "Đã xác nhận", value: 0, color: "hsl(215 100% 50%)" },
  { name: "Đang giao", value: 0, color: "hsl(var(--info))" },
  { name: "Đã giao", value: 0, color: "hsl(160 84% 39%)" },
  { name: "Hoàn thành", value: 0, color: "hsl(var(--success))" },
  { name: "Thất bại", value: 0, color: "hsl(0 84% 60%)" },
  { name: "Trả hàng", value: 0, color: "hsl(322 75% 46%)" },
  { name: "Đã hủy", value: 0, color: "hsl(var(--destructive))" },
];

export default function OrderStatusChart({ data = defaultData }: OrderStatusChartProps) {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">
          Trạng thái đơn hàng
        </h3>
        <p className="text-sm text-muted-foreground">Phân bố theo trạng thái</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px"
              }}
              formatter={(value) => [`${value} đơn`, ""]}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              formatter={(value) => (
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

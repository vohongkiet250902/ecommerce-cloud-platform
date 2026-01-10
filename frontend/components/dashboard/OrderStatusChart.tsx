"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const data = [
  { name: "Hoàn thành", value: 540, color: "hsl(var(--success))" },
  { name: "Đang giao", value: 180, color: "hsl(var(--info))" },
  { name: "Chờ xử lý", value: 120, color: "hsl(var(--warning))" },
  { name: "Đã hủy", value: 60, color: "hsl(var(--destructive))" },
];

export default function OrderStatusChart() {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">
          Trạng thái đơn hàng
        </h3>
        <p className="text-sm text-muted-foreground">Phân bố theo trạng thái</p>
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
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
                borderRadius: "8px",
              }}
              formatter={(value) => [`${value} đơn`, ""]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

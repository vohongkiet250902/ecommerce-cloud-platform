"use client";

import { CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const systems = [
  { name: "API Server", status: "operational", latency: "45ms" },
  { name: "Database", status: "operational", latency: "12ms" },
  { name: "OpenSearch", status: "operational", latency: "28ms" },
  { name: "Storage (S3)", status: "degraded", latency: "156ms" },
  { name: "Payment Gateway", status: "down", latency: "0ms" },
];

const statusConfig = {
  operational: {
    icon: CheckCircle,
    label: "Hoạt động",
    color: "text-success",
    bg: "bg-success/10",
  },
  degraded: {
    icon: AlertCircle,
    label: "Chậm",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  down: {
    icon: XCircle,
    label: "Ngừng",
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
};

export default function SystemStatus() {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">
          Trạng thái hệ thống
        </h3>
        <p className="text-sm text-muted-foreground">Giám sát các dịch vụ</p>
      </div>

      <div className="space-y-3">
        {systems.map((system) => {
          const config =
            statusConfig[system.status as keyof typeof statusConfig];
          const Icon = config.icon;

          return (
            <div
              key={system.name}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-1.5 rounded-lg", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <span className="font-medium text-card-foreground">
                  {system.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {system.latency}
                </span>
                <span className={cn("text-sm font-medium", config.color)}>
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

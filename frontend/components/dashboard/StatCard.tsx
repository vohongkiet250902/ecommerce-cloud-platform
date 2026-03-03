"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-6 card-shadow hover:card-shadow-md transition-shadow duration-200 animate-fade-in group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase group-hover:text-primary transition-colors">
            {title}
          </p>

          <p className="text-3xl font-bold text-card-foreground">
            {value}
          </p>
          
          <div className="h-1 w-8 bg-primary/20 rounded-full group-hover:w-12 transition-all duration-300" />
        </div>

        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300", iconBg)}>
          <Icon className={cn("h-7 w-7", iconColor)} />
        </div>
      </div>
    </div>
  );
}

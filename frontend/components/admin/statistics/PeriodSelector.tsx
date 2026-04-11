"use client";

import { useState } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Period } from "./StatisticsData";

interface Props {
  period: Period;
  setPeriod: (p: Period) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
}

const PeriodSelector = ({
  period,
  setPeriod,
  selectedDate,
  setSelectedDate,
}: Props) => {
  const [open, setOpen] = useState(false);

  const getDateLabel = () => {
    switch (period) {
      case "day":
        return format(selectedDate, "dd/MM/yyyy", { locale: vi });
      case "week": {
        const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return `${format(ws, "dd/MM")} - ${format(we, "dd/MM/yyyy")}`;
      }
      case "month":
        return format(selectedDate, "MM/yyyy", { locale: vi });
      case "quarter": {
        const q = Math.floor(selectedDate.getMonth() / 3) + 1;
        return `Quý ${q}/${selectedDate.getFullYear()}`;
      }
      case "year":
        return `Năm ${selectedDate.getFullYear()}`;
    }
  };

  const renderPicker = () => {
    if (period === "day" || period === "week") {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-[220px] justify-start text-left font-normal border-border/20")}
            >
              <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
              {getDateLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-border/10" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => {
                if (d) {
                  setSelectedDate(d);
                  setOpen(false);
                }
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      );
    }

    if (period === "month") {
      const months = Array.from({ length: 12 }, (_, i) => i);
      const years = [2024, 2025, 2026];
      return (
        <div className="flex gap-2">
          <Select
            value={`${selectedDate.getMonth()}`}
            onValueChange={(v) => {
              const d = new Date(selectedDate);
              d.setMonth(parseInt(v));
              setSelectedDate(d);
            }}
          >
            <SelectTrigger className="w-[130px] border-border/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border/10">
              {months.map((m) => (
                <SelectItem key={m} value={`${m}`}>
                  Tháng {m + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={`${selectedDate.getFullYear()}`}
            onValueChange={(v) => {
              const d = new Date(selectedDate);
              d.setFullYear(parseInt(v));
              setSelectedDate(d);
            }}
          >
            <SelectTrigger className="w-[100px] border-border/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border/10">
              {years.map((y) => (
                <SelectItem key={y} value={`${y}`}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (period === "quarter") {
      const quarters = [1, 2, 3, 4];
      const years = [2024, 2025, 2026];
      return (
        <div className="flex gap-2">
          <Select
            value={`${Math.floor(selectedDate.getMonth() / 3) + 1}`}
            onValueChange={(v) => {
              const d = new Date(selectedDate);
              d.setMonth((parseInt(v) - 1) * 3);
              setSelectedDate(d);
            }}
          >
            <SelectTrigger className="w-[120px] border-border/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border/10">
              {quarters.map((q) => (
                <SelectItem key={q} value={`${q}`}>
                  Quý {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={`${selectedDate.getFullYear()}`}
            onValueChange={(v) => {
              const d = new Date(selectedDate);
              d.setFullYear(parseInt(v));
              setSelectedDate(d);
            }}
          >
            <SelectTrigger className="w-[100px] border-border/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-border/10">
              {years.map((y) => (
                <SelectItem key={y} value={`${y}`}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (period === "year") {
      const years = [2022, 2023, 2024, 2025, 2026];
      return (
        <Select
          value={`${selectedDate.getFullYear()}`}
          onValueChange={(v) => {
            const d = new Date(selectedDate);
            d.setFullYear(parseInt(v));
            setSelectedDate(d);
          }}
        >
          <SelectTrigger className="w-[120px] border-border/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-border/10">
            {years.map((y) => (
              <SelectItem key={y} value={`${y}`}>
                Năm {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="bg-muted/30 border border-border/10 p-1">
          <TabsTrigger value="day" className="data-[state=active]:bg-background border-none">Ngày</TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-background border-none">Tuần</TabsTrigger>
          <TabsTrigger value="month" className="data-[state=active]:bg-background border-none">Tháng</TabsTrigger>
          <TabsTrigger value="quarter" className="data-[state=active]:bg-background border-none">Quý</TabsTrigger>
          <TabsTrigger value="year" className="data-[state=active]:bg-background border-none">Năm</TabsTrigger>
        </TabsList>
      </Tabs>
      {renderPicker()}
    </div>
  );
};

export default PeriodSelector;

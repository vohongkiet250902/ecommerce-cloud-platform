"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search, Filter, Database } from "lucide-react";
import { cn } from "@/lib/utils";

/* =======================
   Types
======================= */
export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string; // Optional new prop for column styling
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T;
  pageSize?: number;
  showFilter?: boolean;
}

/* =======================
   Component
======================= */
export function DataTable<T extends object>({
  data,
  columns,
  searchPlaceholder = "Tìm kiếm...",
  searchKey,
  pageSize = 10,
  showFilter = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ===== Filter ===== */
  const filteredData = searchKey
    ? data.filter((item: any) => {
        const value = item[searchKey];
        if (typeof value !== "string") return false;
        return value.toLowerCase().includes(search.toLowerCase());
      })
    : data;

  /* ===== Pagination ===== */
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Styling Constants
  const TABLE_HEADER_HEIGHT = "h-11";

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs transition-all duration-300 focus-within:w-full sm:focus-within:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 bg-background/50 border-input shadow-sm focus-visible:ring-2 focus-visible:ring-primary h-10 transition-colors hover:bg-muted/40"
          />
        </div>

        {showFilter && (
          <Button variant="outline" size="sm" className="h-10 gap-2 border-dashed">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Bộ lọc</span>
          </Button>
        )}
      </div>

      {/* Table Area */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={cn("bg-muted/40 hover:bg-muted/40 border-b border-border/40", TABLE_HEADER_HEIGHT)}>
                {columns.map((col, index) => (
                  <TableHead
                    key={index}
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap px-4 py-3",
                      col.className
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-[300px] text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                         <Database className="h-6 w-6 text-muted-foreground/60" />
                      </div>
                      <p className="font-medium text-foreground">Không tìm thấy dữ liệu</p>
                      <p className="text-sm text-muted-foreground/80">
                        Thử tìm kiếm với từ khóa khác
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className="group border-b border-border/30 transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted"
                  >
                    {columns.map((col, colIndex) => {
                      const value = item[col.key as keyof T];

                      return (
                        <TableCell 
                          key={colIndex} 
                          className={cn("py-4 px-4 text-sm font-medium", col.className)}
                        >
                          {col.render ? col.render(item) : String(value ?? "")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <p className="text-xs text-muted-foreground order-2 sm:order-1 font-medium bg-muted/40 px-3 py-1.5 rounded-full">
            Hiển thị <span className="text-foreground">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)}</span> / <span className="text-foreground">{filteredData.length}</span>
          </p>

          <div className="flex items-center gap-1 order-1 sm:order-2">
             <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-input hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1 mx-2">
                 <span className="text-sm font-medium min-w-[3rem] text-center">
                    Trang {currentPage}
                 </span>
              </div>

             <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-input hover:bg-accent hover:text-accent-foreground disabled:opacity-40"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
        </div>
      )}
    </div>
  );
}

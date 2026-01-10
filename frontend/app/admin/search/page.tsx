"use client";

import {
  RefreshCw,
  Settings,
  Search,
  Zap,
  Database,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function SearchManagement() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Search Management
          </h1>
          <p className="text-muted-foreground">
            Quản lý và cấu hình OpenSearch index
          </p>
        </div>
        <Button>
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-index tất cả
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-success/10">
              <Database className="h-5 w-5 text-success" />
            </div>
            <Badge
              variant="outline"
              className="bg-success/10 text-success border-success/20"
            >
              Online
            </Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            OpenSearch Cluster
          </h3>
          <p className="text-sm text-muted-foreground">Cluster health: Green</p>
          <p className="text-sm text-muted-foreground">Version: 2.11.0</p>
        </div>

        <div className="bg-card rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground">856</span>
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            Documents Indexed
          </h3>
          <p className="text-sm text-muted-foreground">
            Sản phẩm đã được index
          </p>
        </div>

        <div className="bg-card rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-info/10">
              <Zap className="h-5 w-5 text-info" />
            </div>
            <span className="text-2xl font-bold text-foreground">28ms</span>
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            Avg Response Time
          </h3>
          <p className="text-sm text-muted-foreground">
            Thời gian phản hồi trung bình
          </p>
        </div>
      </div>

      {/* Index Status */}
      <div className="bg-card rounded-xl p-6 card-shadow">
        <h3 className="font-semibold text-foreground mb-4">Trạng thái Index</h3>
        <div className="space-y-4">
          {[
            { name: "products", docs: 856, size: "12.5 MB", status: "healthy" },
            { name: "categories", docs: 24, size: "0.5 MB", status: "healthy" },
            { name: "brands", docs: 15, size: "0.2 MB", status: "healthy" },
            {
              name: "search_logs",
              docs: 15420,
              size: "45.2 MB",
              status: "healthy",
            },
          ].map((index) => (
            <div
              key={index.name}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg",
                index.status === "healthy" ? "bg-secondary/30" : "bg-warning/30"
              )}
            >
              <div className="flex items-center gap-4">
                {index.status === "healthy" ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-warning" />
                )}
                <div>
                  <p className="font-medium text-foreground font-mono">
                    {index.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {index.docs.toLocaleString()} documents • {index.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Re-index
                </Button>
                <Button variant="ghost" size="icon-sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 card-shadow">
          <h3 className="font-semibold text-foreground mb-4">
            Cấu hình Search
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground font-medium">
                  Autocomplete
                </Label>
                <p className="text-sm text-muted-foreground">
                  Gợi ý tìm kiếm khi người dùng nhập
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground font-medium">
                  Typo Tolerance
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tự động sửa lỗi chính tả
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground font-medium">
                  Synonym Search
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tìm kiếm với từ đồng nghĩa
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground font-medium">
                  Fuzzy Matching
                </Label>
                <p className="text-sm text-muted-foreground">
                  Khớp kết quả tương đối
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 card-shadow">
          <h3 className="font-semibold text-foreground mb-4">
            Ranking & Boosting
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-foreground">Relevance Score</Label>
                <span className="text-sm text-muted-foreground">80%</span>
              </div>
              <Progress value={80} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-foreground">Popularity Boost</Label>
                <span className="text-sm text-muted-foreground">60%</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-foreground">Recency Factor</Label>
                <span className="text-sm text-muted-foreground">40%</span>
              </div>
              <Progress value={40} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-foreground">Price Weight</Label>
                <span className="text-sm text-muted-foreground">20%</span>
              </div>
              <Progress value={20} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Search Queries */}
      <div className="bg-card rounded-xl p-6 card-shadow">
        <h3 className="font-semibold text-foreground mb-4">
          Top Search Queries (7 ngày)
        </h3>
        <div className="space-y-3">
          {[
            { query: "iphone 15 pro", count: 2456, results: 12 },
            { query: "macbook pro m3", count: 1823, results: 8 },
            { query: "airpods", count: 1567, results: 15 },
            { query: "samsung galaxy s24", count: 1234, results: 6 },
            { query: "laptop gaming", count: 987, results: 23 },
            { query: "tai nghe bluetooth", count: 876, results: 45 },
          ].map((item, index) => (
            <div
              key={item.query}
              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-muted-foreground w-6">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{item.query}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.results} kết quả
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                {item.count.toLocaleString()} lượt
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

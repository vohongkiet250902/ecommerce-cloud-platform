"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, ShieldCheck, Calendar, Shield, Loader2 } from "lucide-react";
import { authApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await authApi.getCurrentUser();
      setUser(res.data.data || res.data);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tải thông tin hồ sơ",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse font-bold">Đang tải cài đặt...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
          <p className="text-muted-foreground">Quản lý hồ sơ và xác thực cá nhân</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Avatar & Quick Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-xl shadow-primary/5 flex flex-col items-center text-center relative overflow-hidden group">
            {/* Background Gradient */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
            
            <div className="relative z-10 w-24 h-24 rounded-full border-4 border-background shadow-2xl overflow-hidden mb-4 ring-4 ring-primary/10">
              <img 
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.fullName}`} 
                alt={user?.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-xl font-black text-foreground">{user?.fullName}</h3>
              <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
              <Badge className="rounded-full px-4 py-1 font-bold uppercase tracking-wider text-[10px] bg-primary/10 text-primary border-primary/20">
                {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
              </Badge>
            </div>
          </div>

          <div className="bg-muted/30 rounded-2xl p-6 border border-border/40 space-y-4">
             <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground">Bảo mật:</span>
                <span className="text-success font-medium">Đã xác minh</span>
             </div>
             <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground">Tham gia:</span>
                <span className="text-muted-foreground">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                </span>
             </div>
          </div>
        </div>

        {/* Right: Detailed Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-xl shadow-primary/5 space-y-8">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Thông tin cá nhân</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Họ và tên</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
                   <User className="h-4 w-4 text-primary/60" />
                   <span className="text-sm text-foreground">{user?.fullName || "Chưa cập nhật"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Email</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 transition-all opacity-80">
                   <Mail className="h-4 w-4 text-primary/60" />
                   <span className="text-sm text-foreground">{user?.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Số điện thoại</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 transition-all">
                   <Phone className="h-4 w-4 text-primary/60" />
                   <span className="text-sm text-foreground">{user?.phone || "Chưa cập nhật"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Trạng thái</Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 transition-all">
                   <ShieldCheck className="h-4 w-4 text-success/60" />
                   <span className="text-sm text-success">{user?.isActive ? "Đang hoạt động" : "Đã khóa"}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

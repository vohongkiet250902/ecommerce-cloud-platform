"use client";

import { useState, useEffect } from "react";
import { 
  User, Mail, Phone, ShieldCheck, Calendar, Shield, Loader2, 
  MapPin, Plus, Trash2, CheckCircle2, MoreVertical
} from "lucide-react";
import { authApi, usersApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import axios from "axios";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function Settings() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [addressFormData, setAddressFormData] = useState({
    street: "",
    ward: "",
    district: "",
    city: "",
  });

  const [provinces, setProvinces] = useState<{ code: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ code: number; name: string }[]>([]);
  const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
  
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>("");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await authApi.getCurrentUser();
      const userData = res.data.data || res.data;
      setUser(userData);
      setFormData({
        fullName: userData.fullName || "",
        phone: userData.phone || "",
      });

      // Fetch Addresses
      const addrRes = await usersApi.getAddresses();
      const addrList = addrRes.data.data || addrRes.data || [];
      const defaultAddr = addrList.find((a: any) => a.isDefault) || addrList[0];
      if (defaultAddr) {
        setEditingAddress(defaultAddr);
        setAddressFormData({
          street: defaultAddr.street || "",
          ward: defaultAddr.ward || "",
          district: defaultAddr.district || "",
          city: defaultAddr.city || "",
        });
      }
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const res = await (authApi as any).updateProfile(formData);
      setUser(res.data.data || res.data);

      const addrData = {
        receiverName: formData.fullName,
        phone: formData.phone,
        street: addressFormData.street,
        ward: addressFormData.ward,
        district: addressFormData.district,
        city: addressFormData.city,
        isDefault: true
      };

      if (editingAddress) {
        await usersApi.updateAddress(editingAddress._id, addrData);
      } else {
        await usersApi.addAddress(addrData);
      }

      toast({
        title: "Thành công",
        description: "Thông tin hồ sơ đã được cập nhật",
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể cập nhật hồ sơ",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await axios.get("https://provinces.open-api.vn/api/p/");
        setProvinces(res.data);
      } catch (err) {
        console.error("Failed to fetch provinces", err);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (provinces.length > 0 && editingAddress && editingAddress.city) {
      const province = provinces.find(p => p.name === editingAddress.city);
      if (province) {
         setSelectedProvinceCode(province.code.toString());
      }
    }
  }, [provinces, editingAddress]);

  // Fetch districts when province changes
  useEffect(() => {
    if (!selectedProvinceCode) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/p/${selectedProvinceCode}?depth=2`);
        const loadedDistricts = res.data.districts;
        setDistricts(loadedDistricts);
        
        // If editing, try to find the code for the existing district
        if (editingAddress && addressFormData.district) {
           const d = loadedDistricts.find((item: any) => item.name === addressFormData.district);
           if (d) setSelectedDistrictCode(d.code.toString());
        }
      } catch (err) {
        console.error("Failed to fetch districts", err);
      }
    };
    fetchDistricts();
  }, [selectedProvinceCode]);

  // Fetch wards when district changes
  useEffect(() => {
    if (!selectedDistrictCode) {
      setWards([]);
      return;
    }
    const fetchWards = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/d/${selectedDistrictCode}?depth=2`);
        const loadedWards = res.data.wards;
        setWards(loadedWards);
      } catch (err) {
        console.error("Failed to fetch wards", err);
      }
    };
    fetchWards();
  }, [selectedDistrictCode]);

  const onProvinceChange = (code: string) => {
    const province = provinces.find(p => p.code.toString() === code);
    if (province) {
      setSelectedProvinceCode(code);
      setAddressFormData(prev => ({
        ...prev,
        city: province.name,
        district: "", 
        ward: ""
      }));
      setSelectedDistrictCode(""); 
    }
  };

  const onDistrictChange = (code: string) => {
    const district = districts.find(d => d.code.toString() === code);
    if (district) {
      setSelectedDistrictCode(code);
      setAddressFormData(prev => ({
        ...prev,
        district: district.name,
        ward: ""
      }));
    }
  };

  const onWardChange = (code: string) => {
    const ward = wards.find(w => w.name === code || w.code.toString() === code);
    if (ward) {
      setAddressFormData(prev => ({
        ...prev,
        ward: ward.name
      }));
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
              <h3 className="text-xl font-bold text-foreground">{user?.fullName}</h3>
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
          {/* Profile Section */}
          <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-xl shadow-primary/5 space-y-8">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Thông tin cá nhân</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Họ và tên</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 z-10" />
                    <Input
                      value={formData.fullName}
                      disabled
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="pl-10 h-12 rounded-xl bg-muted/40 border-border/40 focus:bg-background transition-all"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Email</Label>
                  <div className="relative opacity-70 cursor-not-allowed">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 z-10" />
                    <Input
                      value={user?.email}
                      disabled
                      className="pl-10 h-12 rounded-xl bg-muted/20 border-border/40 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Số điện thoại</Label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 z-10" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10 h-12 rounded-xl bg-muted/40 border-border/40 focus:bg-background transition-all"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Trạng thái tài khoản</Label>
                  <div className="flex items-center gap-3 p-3 h-12 rounded-xl bg-muted/40 border border-border/40">
                    <ShieldCheck className="h-4 w-4 text-success/60" />
                    <span className="text-sm text-success font-bold">{user?.isActive ? "Đang hoạt động" : "Đã khóa"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Tỉnh / Thành phố</Label>
                  <Select onValueChange={onProvinceChange} value={selectedProvinceCode}>
                    <SelectTrigger className="rounded-xl h-12 bg-muted/40 border-border/40 focus:bg-background transition-all">
                      <SelectValue placeholder="Chọn Tỉnh / Thành" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[200px] overflow-y-auto border-border/40">
                      {provinces.map((p) => (
                        <SelectItem key={p.code} value={p.code.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Quận / Huyện</Label>
                  <Select 
                    onValueChange={onDistrictChange} 
                    value={selectedDistrictCode}
                    disabled={!selectedProvinceCode}
                  >
                    <SelectTrigger className="rounded-xl h-12 bg-muted/40 border-border/40 focus:bg-background transition-all">
                      <SelectValue placeholder="Chọn Quận / Huyện" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[200px] overflow-y-auto border-border/40">
                      {districts.map((d) => (
                        <SelectItem key={d.code} value={d.code.toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Phường / Xã</Label>
                  <Select 
                    onValueChange={onWardChange} 
                    value={wards.find(w => w.name === addressFormData.ward)?.code.toString() || ""}
                    disabled={!selectedDistrictCode}
                  >
                    <SelectTrigger className="rounded-xl h-12 bg-muted/40 border-border/40 focus:bg-background transition-all">
                      <SelectValue placeholder="Chọn Phường / Xã" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[200px] overflow-y-auto border-border/40">
                      {wards.map((w) => (
                        <SelectItem key={w.code} value={w.code.toString()}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold">Địa chỉ (Số nhà, Tên đường)</Label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 z-10" />
                    <Input 
                      value={addressFormData.street}
                      onChange={(e) => setAddressFormData({...addressFormData, street: e.target.value})}
                      placeholder="Ví dụ: 123 Đường ABC"
                      className="pl-10 h-12 rounded-xl bg-muted/40 border-border/40 focus:bg-background transition-all"
                    />
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={updating}
                  size="sm"
                  className="rounded-xl px-6 font-bold h-10 gap-2 shadow-lg shadow-primary/20"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

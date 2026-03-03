"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { authApi, usersApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Camera, 
  Loader2, 
  Plus, 
  Trash2, 
  Check, 
  Edit3,
  LogOut,
  MapPinned,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";

export default function AccountPage() {
  const { user, loading, refreshUser, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab ] = useState("profile");
  
  // Profile Form State
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || ""
  });

  // Sync profile form when user data changes (e.g. after refreshUser)
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || "",
        phone: user.phone || ""
      });
    }
  }, [user]);

  // Address Form State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    receiverName: "",
    phone: "",
    city: "",
    district: "",
    ward: "",
    street: "",
    isDefault: false
  });

  // Vietnam Administrative Divisions State
  const [provinces, setProvinces] = useState<{ code: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ code: number; name: string }[]>([]);
  const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>("");

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
    if (!selectedProvinceCode) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/p/${selectedProvinceCode}?depth=2`);
        setDistricts(res.data.districts);
      } catch (err) {
        console.error("Failed to fetch districts", err);
      }
    };
    fetchDistricts();
  }, [selectedProvinceCode]);

  useEffect(() => {
    if (!selectedDistrictCode) {
      setWards([]);
      return;
    }
    const fetchWards = async () => {
      try {
        const res = await axios.get(`https://provinces.open-api.vn/api/d/${selectedDistrictCode}?depth=2`);
        setWards(res.data.wards);
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
      setAddressForm(prev => ({
        ...prev,
        city: province.name,
        district: "",
        ward: ""
      }));
      setSelectedDistrictCode("");
      setWards([]);
    }
  };

  const onDistrictChange = (code: string) => {
    const district = districts.find(d => d.code.toString() === code);
    if (district) {
      setSelectedDistrictCode(code);
      setAddressForm(prev => ({
        ...prev,
        district: district.name,
        ward: ""
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/auth";
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      await authApi.updateProfile({
        fullName: profileForm.fullName,
        phone: profileForm.phone
      });
      await refreshUser();
      toast({
        variant: "success",
        title: "Thành công",
        description: "Thông tin cá nhân đã được cập nhật."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể cập nhật thông tin."
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAddress(true);
    try {
      if (editingAddressId) {
        await usersApi.updateAddress(editingAddressId, addressForm);
      } else {
        await usersApi.addAddress(addressForm);
      }
      await refreshUser();
      setIsAddressModalOpen(false);
      resetAddressForm();
      toast({
        variant: "success",
        title: "Thành công",
        description: editingAddressId ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ mới."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Thao tác thất bại."
      });
    } finally {
      setIsSubmittingAddress(false);
    }
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    setIsDeletingAddress(true);
    try {
      await usersApi.deleteAddress(addressToDelete);
      await refreshUser();
      setIsDeleteDialogOpen(false);
      setAddressToDelete(null);
      toast({ variant: "success", title: "Đã xóa địa chỉ" });
    } catch (error) {
      toast({ variant: "destructive", title: "Lỗi khi xóa địa chỉ" });
    } finally {
      setIsDeletingAddress(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setAddressToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await usersApi.setDefaultAddress(id);
      await refreshUser();
      toast({ variant: "success", title: "Đã cập nhật địa chỉ mặc định" });
    } catch (error) {
      toast({ variant: "destructive", title: "Lỗi khi cập nhật" });
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      receiverName: "",
      phone: "",
      city: "",
      district: "",
      ward: "",
      street: "",
      isDefault: false
    });
    setEditingAddressId(null);
    setSelectedProvinceCode("");
    setSelectedDistrictCode("");
    setDistricts([]);
    setWards([]);
  };

  const findAndSetCodes = async (address: any) => {
    try {
      // Find province code
      const provinceRes = await axios.get("https://provinces.open-api.vn/api/p/");
      const province = provinceRes.data.find((p: any) => p.name === address.city);
      if (province) {
        setSelectedProvinceCode(province.code.toString());
        
        // Find district code
        const districtRes = await axios.get(`https://provinces.open-api.vn/api/p/${province.code}?depth=2`);
        const district = districtRes.data.districts.find((d: any) => d.name === address.district);
        if (district) {
          setSelectedDistrictCode(district.code.toString());
        }
      }
    } catch (err) {
      console.error("Error setting address codes", err);
    }
  };

  const openEditModal = (address: any) => {
    setAddressForm({
      receiverName: address.receiverName,
      phone: address.phone,
      city: address.city,
      district: address.district,
      ward: address.ward,
      street: address.street,
      isDefault: address.isDefault
    });
    setEditingAddressId(address._id);
    findAndSetCodes(address);
    setIsAddressModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-secondary/30 dark:bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          
          {/* Header Mobile / Tablet */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Sidebar / Profile Card */}
            <div className="w-full md:w-80 space-y-6">
              <Card className="overflow-hidden border-0 shadow-xl bg-card/80 backdrop-blur-md">
                <CardContent className="p-0">
                  <div className="h-24 bg-gradient-to-r from-primary/80 to-primary/40" />
                  <div className="px-6 pb-6 -mt-12 text-center">
                    <div className="relative inline-block group">
                      <div className="w-24 h-24 rounded-2xl border-4 border-background overflow-hidden shadow-lg bg-card">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button className="absolute bottom-1 right-1 p-2 rounded-lg bg-primary text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <h2 className="mt-4 text-xl font-bold">{user.fullName}</h2>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant="outline" className="mt-2 text-[10px] uppercase font-bold tracking-wider opacity-70">
                      {user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}
                    </Badge>
                  </div>
                  
                  <div className="border-t border-border px-4 py-2">
                    <nav className="flex flex-col gap-1">
                      <Button 
                        variant={activeTab === "profile" ? "secondary" : "ghost"} 
                        className="justify-start gap-3 h-12 w-full font-medium"
                        onClick={() => setActiveTab("profile")}
                      >
                        <User className="h-4 w-4 text-primary" />
                        Hồ sơ cá nhân
                      </Button>
                      <Button 
                        variant={activeTab === "addresses" ? "secondary" : "ghost"} 
                        className="justify-start gap-3 h-12 w-full font-medium"
                        onClick={() => setActiveTab("addresses")}
                      >
                        <MapPinned className="h-4 w-4 text-blue-500" />
                        Sổ địa chỉ
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="justify-start gap-3 h-12 w-full font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => signOut()}
                      >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                      </Button>
                    </nav>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hidden md:block">
                <CardHeader>
                  <CardTitle className="text-sm">Thanh toán & Đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-between" onClick={() => window.location.href = "/orders"}>
                    Lịch sử mua hàng <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full min-h-[500px]">
              <AnimatePresence mode="wait">
                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-0 shadow-xl overflow-hidden">
                      <CardHeader className="border-b bg-muted/30">
                        <CardTitle>Hồ sơ cá nhân</CardTitle>
                        <CardDescription>Cập nhật thông tin cơ bản của bạn tại đây</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-2xl">
                          <div className="grid gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="fullName">Họ và tên</Label>
                              <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input 
                                  id="fullName"
                                  className="pl-10 h-11"
                                  value={profileForm.fullName}
                                  onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="email">Địa chỉ Email</Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
                                <Input 
                                  id="email"
                                  className="pl-10 h-11 bg-muted/50 cursor-not-allowed"
                                  value={user.email}
                                  disabled
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Check className="h-3 w-3 text-green-500" /> Email đã được xác minh
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="phone">Số điện thoại</Label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input 
                                  id="phone"
                                  className="pl-10 h-11"
                                  placeholder="0xx xxxxxxx"
                                  value={profileForm.phone}
                                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4">
                            <Button type="submit" disabled={isUpdatingProfile} className="min-w-[150px] h-11">
                              {isUpdatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {activeTab === "addresses" && (
                  <motion.div
                    key="addresses"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">Sổ địa chỉ</h2>
                        <p className="text-sm text-muted-foreground">Quản lý địa chỉ nhận hàng của bạn</p>
                      </div>
                      <Dialog open={isAddressModalOpen} onOpenChange={(open) => {
                        if(!open) resetAddressForm();
                        setIsAddressModalOpen(open);
                      }}>
                        <DialogTrigger asChild>
                          <Button className="gap-2 shadow-lg shadow-primary/20">
                            <Plus className="h-4 w-4" /> Thêm địa chỉ mới
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                          <form onSubmit={onSubmitAddress}>
                            <DialogHeader>
                              <DialogTitle>{editingAddressId ? "Chỉnh sửa địa chỉ" : "Thêm mới địa chỉ"}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 py-6">
                              <div className="space-y-2 col-span-1">
                                <Label>Tên người nhận</Label>
                                <Input 
                                  required
                                  value={addressForm.receiverName}
                                  onChange={(e) => setAddressForm({...addressForm, receiverName: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2 col-span-1">
                                <Label>Số điện thoại</Label>
                                <Input 
                                  required
                                  value={addressForm.phone}
                                  onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                                />
                              </div>
                              <div className="space-y-2 col-span-1">
                                <Label>Tỉnh / Thành phố</Label>
                                <Select value={selectedProvinceCode} onValueChange={onProvinceChange}>
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Chọn Tỉnh / Thành phố" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {provinces.map((p) => (
                                      <SelectItem key={p.code} value={p.code.toString()}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 col-span-1">
                                <Label>Quận / Huyện</Label>
                                <Select 
                                  value={selectedDistrictCode} 
                                  onValueChange={onDistrictChange}
                                  disabled={!selectedProvinceCode}
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Chọn Quận / Huyện" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {districts.map((d) => (
                                      <SelectItem key={d.code} value={d.code.toString()}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 col-span-1">
                                <Label>Phường / Xã</Label>
                                <Select 
                                  value={addressForm.ward} 
                                  onValueChange={(val) => setAddressForm({...addressForm, ward: val})}
                                  disabled={!selectedDistrictCode}
                                >
                                  <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Chọn Phường / Xã" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {wards.map((w) => (
                                      <SelectItem key={w.code} value={w.name}>
                                        {w.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2 col-span-2">
                                <Label>Địa chỉ chi tiết (Tòa nhà, số nhà, tên đường)</Label>
                                <Input 
                                  required
                                  value={addressForm.street}
                                  onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="ghost" onClick={() => setIsAddressModalOpen(false)}>Hủy</Button>
                              <Button type="submit" disabled={isSubmittingAddress}>
                                {isSubmittingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="grid gap-4">
                      {user.addresses?.length === 0 ? (
                        <div className="text-center py-20 bg-card rounded-xl border border-dashed flex flex-col items-center">
                          <MapPin className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                          <p className="text-muted-foreground mb-4">Bạn chưa có địa chỉ giao hàng nào</p>
                          <Button variant="outline" onClick={() => setIsAddressModalOpen(true)}>Thêm địa chỉ đầu tiên</Button>
                        </div>
                      ) : (
                        user.addresses?.map((address: any) => (
                          <Card key={address._id} className={cn("border-0 shadow-lg transition-all hover:shadow-xl", address.isDefault && "ring-2 ring-primary")}>
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg">{address.receiverName}</span>
                                    {address.isDefault && (
                                      <Badge className="bg-green-500 hover:bg-green-600">Mặc định</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Phone className="h-3 w-3" /> {address.phone}
                                  </div>
                                  <div className="flex items-start gap-2 text-muted-foreground text-sm pt-1">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{address.street}, {address.ward}, {address.district}, {address.city}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEditModal(address)}>
                                    <Edit3 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(address._id)}>
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                                  </Button>
                                </div>
                              </div>
                              
                              {!address.isDefault && (
                                <div className="mt-4 pt-4 border-t">
                                  <Button variant="outline" size="sm" onClick={() => handleSetDefault(address._id)}>
                                    Thiết lập mặc định
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Xác nhận xóa
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-muted-foreground">
            Bạn có chắc chắn muốn xóa địa chỉ này? Hành động này không thể hoàn tác.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingAddress}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAddress} disabled={isDeletingAddress}>
              {isDeletingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

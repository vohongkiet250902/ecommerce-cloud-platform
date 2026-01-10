"use client";

import { Save, User, Store, Bell, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cài đặt</h1>
          <p className="text-muted-foreground">Quản lý cài đặt hệ thống</p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Lưu thay đổi
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="general" className="gap-2">
            <Store className="h-4 w-4" />
            Cửa hàng
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Tài khoản
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Thông báo
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Bảo mật
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">
              Thông tin cửa hàng
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="storeName">Tên cửa hàng</Label>
                <Input id="storeName" defaultValue="ElecStore" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email liên hệ</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="contact@elecstore.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" defaultValue="1900 1234" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" defaultValue="https://elecstore.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Textarea
                  id="address"
                  defaultValue="123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
                />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">
              Cài đặt hiển thị
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currency">Đơn vị tiền tệ</Label>
                <Select defaultValue="vnd">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vnd">VNĐ - Việt Nam Đồng</SelectItem>
                    <SelectItem value="usd">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Múi giờ</Label>
                <Select defaultValue="asia-hcm">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia-hcm">
                      Asia/Ho_Chi_Minh (GMT+7)
                    </SelectItem>
                    <SelectItem value="asia-hanoi">
                      Asia/Hanoi (GMT+7)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Ngôn ngữ</Label>
                <Select defaultValue="vi">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Định dạng ngày</Label>
                <Select defaultValue="dd-mm-yyyy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">
              Thông tin tài khoản
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" defaultValue="Admin User" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  defaultValue="admin@elecstore.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Vai trò</Label>
                <Input id="role" defaultValue="Super Admin" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Phòng ban</Label>
                <Input id="department" defaultValue="Management" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">Đổi mật khẩu</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div></div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input id="confirmPassword" type="password" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">
              Thông báo Email
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Đơn hàng mới</p>
                  <p className="text-sm text-muted-foreground">
                    Nhận email khi có đơn hàng mới
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Tồn kho thấp</p>
                  <p className="text-sm text-muted-foreground">
                    Nhận cảnh báo khi sản phẩm sắp hết hàng
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Review mới</p>
                  <p className="text-sm text-muted-foreground">
                    Nhận thông báo khi có đánh giá mới
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Báo cáo hàng ngày
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nhận email tổng kết doanh thu mỗi ngày
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">
              Thông báo Push
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Thông báo trình duyệt
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Hiển thị thông báo trên trình duyệt
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Âm thanh thông báo
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Phát âm thanh khi có thông báo mới
                  </p>
                </div>
                <Switch />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">
              Bảo mật tài khoản
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Xác thực 2 yếu tố (2FA)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Thêm lớp bảo mật bằng mã OTP
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Đăng nhập bằng thiết bị tin cậy
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Chỉ cho phép đăng nhập từ thiết bị đã xác minh
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Thông báo đăng nhập mới
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nhận email khi có đăng nhập từ thiết bị mới
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">
              Phiên đăng nhập
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <Globe className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      Chrome - Windows
                    </p>
                    <p className="text-sm text-muted-foreground">
                      TP. Hồ Chí Minh, Việt Nam • Hoạt động
                    </p>
                  </div>
                </div>
                <span className="text-sm text-success font-medium">
                  Thiết bị này
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">
                      Safari - macOS
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Hà Nội, Việt Nam • 2 ngày trước
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

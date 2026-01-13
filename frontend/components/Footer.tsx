"use client";

import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const footerLinks = {
  products: {
    title: "Sản phẩm",
    links: [
      { label: "Điện thoại", href: "/phones" },
      { label: "Laptop", href: "/laptops" },
      { label: "Tablet", href: "/tablets" },
      { label: "Phụ kiện", href: "/accessories" },
      { label: "Đồng hồ thông minh", href: "/smartwatches" },
    ],
  },
  support: {
    title: "Hỗ trợ",
    links: [
      { label: "Trung tâm hỗ trợ", href: "/support" },
      { label: "Chính sách bảo hành", href: "/warranty" },
      { label: "Chính sách đổi trả", href: "/returns" },
      { label: "Hướng dẫn mua hàng", href: "/guide" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  company: {
    title: "Về chúng tôi",
    links: [
      { label: "Giới thiệu", href: "/about" },
      { label: "Tuyển dụng", href: "/careers" },
      { label: "Tin tức", href: "/news" },
      { label: "Liên hệ", href: "/contact" },
    ],
  },
  legal: {
    title: "Chính sách",
    links: [
      { label: "Điều khoản sử dụng", href: "/terms" },
      { label: "Chính sách bảo mật", href: "/privacy" },
      { label: "Chính sách cookie", href: "/cookies" },
    ],
  },
};

const socialLinks = [
  { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Youtube, href: "https://youtube.com", label: "Youtube" },
];

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      {/* Newsletter */}
      <div className="border-b border-background/10">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <h3 className="text-2xl font-bold mb-2">Đăng ký nhận tin</h3>
              <p className="text-background/70">
                Nhận thông tin khuyến mãi và sản phẩm mới nhất
              </p>
            </div>
            <div className="flex w-full max-w-md gap-2">
              <Input
                type="email"
                placeholder="Nhập email của bạn"
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50 rounded-full"
              />
              <Button className="btn-primary rounded-full px-6 whitespace-nowrap">
                Đăng ký
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 gradient-hero rounded-xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  E
                </span>
              </div>
              <span className="text-xl font-bold">ElecStore</span>
            </div>
            <p className="text-background/70 mb-6 text-sm leading-relaxed">
              Hệ thống bán lẻ thiết bị điện tử hàng đầu Việt Nam với hơn 100 cửa
              hàng trên toàn quốc.
            </p>
            <div className="space-y-3">
              <a
                href="tel:1900123456"
                className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors"
              >
                <Phone className="w-4 h-4" />
                1900 123 456
              </a>
              <a
                href="mailto:support@elecstore.vn"
                className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@elecstore.vn
              </a>
              <p className="flex items-center gap-2 text-sm text-background/70">
                <MapPin className="w-4 h-4" />
                123 Nguyễn Huệ, Q.1, TP.HCM
              </p>
            </div>
          </div>

          {/* Links */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-background/70 hover:text-background transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-background/70 text-center md:text-left">
              © 2024 ElecStore. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

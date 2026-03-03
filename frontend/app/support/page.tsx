"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  HelpCircle,
  Clock,
  ChevronDown,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// Mock FAQs
const faqs = [
  {
    question: "Chính sách đổi trả bảo hành như thế nào?",
    answer:
      "Chúng tôi hỗ trợ đổi trả 1 đổi 1 trong vòng 30 ngày đối với các sản phẩm phát sinh lỗi từ nhà sản xuất. Sản phẩm bảo hành phải còn nguyên tem, mác và hộp.",
  },
  {
    question: "Làm thế nào để kiểm tra tình trạng đơn hàng?",
    answer:
      "Bạn có thể vào mục 'Đơn hàng của tôi' trên trang cá nhân để xem trạng thái chi tiết của từng đơn hàng. Hoặc cung cấp mã đơn qua số Hotline để được hỗ trợ kiểm tra.",
  },
  {
    question: "Có những hình thức thanh toán nào trên trang web?",
    answer:
      "Bạn có thể thanh toán qua nhiều phương thức: Thanh toán khi nhận hàng (COD), Thanh toán trực tuyến qua VNPAY, Thẻ tín dụng/ghi nợ (Visa, Mastercard), và chuyển khoản ngân hàng.",
  },
  {
    question: "Thời gian giao hàng tiêu chuẩn là bao lâu?",
    answer:
      "Đơn hàng tại TP.HCM sẽ được giao trong 24h. Các tỉnh thành khác sẽ dao động từ 2-4 ngày làm việc tuỳ thuộc vào đơn vị vận chuyển.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setName("");
      setEmail("");
      setMessage("");

      // Hide success message after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-grow pt-[100px] mb-20 text-foreground">
        {/* Hero Section */}
        <section className="bg-primary/5 py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-3xl -z-10" />

          <div className="container mx-auto px-4 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight text-primary"
            >
              Xin chào, chúng tôi có thể giúp gì cho bạn?
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Khám phá các bài viết hướng dẫn chi tiết, tra cứu thông tin nhanh
              chóng hoặc kết nối trực tiếp với đội ngũ hỗ trợ tận tâm của ProTech.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-xl mx-auto relative group"
            >
              <Input
                type="text"
                placeholder="Nhập từ khóa cần tìm (vd: Bảo hành, Thanh toán...)"
                className="w-full pl-6 pr-14 py-8 text-lg rounded-full shadow-xl bg-background border-2 border-transparent focus-visible:border-primary/50 transition-all font-medium placeholder:font-normal placeholder:text-muted-foreground/60"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-md">
                <HelpCircle className="w-5 h-5" />
              </div>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 -mt-10 lg:-mt-14 relative z-10">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-3xl p-8 shadow-xl shadow-foreground/5 border border-border/50 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500">
                <Phone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Hotline hỗ trợ 24/7</h3>
              <p className="text-muted-foreground mb-6">
                Liên hệ trực tiếp với tổng đài viên để được hỗ trợ nhanh nhất mọi
                vấn đề.
              </p>
              <a
                href="tel:0866791305"
                className="mt-auto text-lg font-bold text-primary hover:underline"
              >
                0866 791 305
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-3xl p-8 shadow-xl shadow-foreground/5 border border-border/50 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-6 text-orange-500">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Góp ý & Khiếu nại</h3>
              <p className="text-muted-foreground mb-6">
                Gửi email cho chúng tôi để chia sẻ trải nghiệm của bạn hoặc cần hỗ trợ sâu hơn.
              </p>
              <a
                href="mailto:support@protechstore.vn"
                className="mt-auto text-lg font-bold text-primary hover:underline"
              >
                support@protechstore.vn
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card rounded-3xl p-8 shadow-xl shadow-foreground/5 border border-border/50 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-500">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Hệ thống cửa hàng</h3>
              <p className="text-muted-foreground mb-6">
                Trải nghiệm sản phẩm trực tiếp và nhận sự tư vấn tận tình từ nhân viên tại cửa hàng.
              </p>
              <a
                href="#map-section"
                className="mt-auto text-lg font-bold text-primary hover:underline"
              >
                12 Nguyễn Văn Bảo, Q.Gò Vấp
              </a>
            </motion.div>
          </div>
        </div>

        {/* FAQ & Contact Section */}
        <div className="container mx-auto px-4 mt-20 lg:mt-32">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-20">
            {/* FAQs */}
            <div className="lg:col-span-3">
              <div className="mb-10">
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                  <MessageCircle className="text-primary w-8 h-8" />
                  Câu hỏi thường gặp
                </h2>
                <p className="text-muted-foreground text-lg text-balance">
                  Tổng hợp các câu hỏi phổ biến nhất từ khách hàng của ProTech để
                  giúp bạn tiết kiệm thời gian chờ đợi.
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className={`border ${
                      openFaq === idx
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card hover:border-primary/50"
                    } rounded-2xl overflow-hidden transition-all duration-300`}
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                    >
                      <span className="font-semibold tracking-wide text-lg text-foreground pr-8">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-6 h-6 text-primary flex-shrink-0 transition-transform duration-300 ${
                          openFaq === idx ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {openFaq === idx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 pt-0 text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border/50 rounded-3xl p-8 lg:p-10 shadow-2xl shadow-foreground/5 relative overflow-hidden">
                {/* Decorative blob inside form */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full -z-10" />

                <h2 className="text-2xl font-bold mb-2">Gửi yêu cầu hỗ trợ</h2>
                <p className="text-muted-foreground mb-8">
                  Vui lòng để lại thông tin, ProTech sẽ liên hệ lại với bạn
                  trong thời gian sớm nhất.
                </p>

                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[300px]"
                    >
                      <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">Gửi thành công!</h3>
                      <p className="text-sm">
                        Cảm ơn bạn đã liên hệ. Đội ngũ CSKH sẽ phản hồi lại ngay qua email của bạn.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleFormSubmit}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground ml-1">
                          Họ và tên
                        </label>
                        <Input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Nhập tên của bạn"
                          className="rounded-xl bg-background/50 h-12 focus-visible:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground ml-1">
                          Email liên hệ
                        </label>
                        <Input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="example@gmail.com"
                          className="rounded-xl bg-background/50 h-12 focus-visible:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground ml-1">
                          Nội dung hỗ trợ
                        </label>
                        <Textarea
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Hãy mô tả chi tiết vấn đề bạn đang gặp phải..."
                          className="rounded-xl bg-background/50 min-h-[120px] resize-none focus-visible:ring-primary/20"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl text-md font-bold btn-primary group mt-4 overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Đang gửi...
                          </>
                        ) : (
                          <>
                            Gửi yêu cầu ngay
                            <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Store Location Map (Dummy visual placeholder) */}
        <div id="map-section" className="container mx-auto px-4 mt-20 lg:mt-32">
          <div className="bg-secondary/30 rounded-[2rem] p-4 lg:p-8 border border-border/50">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="w-full lg:w-1/3 space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <MapPin className="text-primary w-8 h-8" />
                  Trụ sở chính
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-1 flex-shrink-0 text-foreground" />
                    <span>
                      <strong className="text-foreground block mb-1">
                        ProTech Store Gò Vấp
                      </strong>
                      12 Nguyễn Văn Bảo, Phường 1, Quận Gò Vấp, Thành phố Hồ Chí Minh
                    </span>
                  </p>
                  <p className="flex items-center gap-3">
                    <Clock className="w-5 h-5 flex-shrink-0 text-foreground" />
                    <span>
                      <strong className="text-foreground">Giờ mở cửa:</strong> 08:30 - 21:30 (Mỗi ngày)
                    </span>
                  </p>
                  <p className="flex items-center gap-3">
                    <Phone className="w-5 h-5 flex-shrink-0 text-foreground" />
                    <span>0866 791 305</span>
                  </p>
                </div>
              </div>

              {/* Map UI Component */}
              <div className="w-full lg:w-2/3 h-[350px] lg:h-[450px] relative rounded-3xl overflow-hidden border border-border shadow-inner flex items-center justify-center group">
                <iframe
                  src="https://maps.google.com/maps?q=12%20Nguyễn%20Văn%20Bảo,%20Gò%20Vấp,%20Hồ%20Chí%20Minh&t=&z=16&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full outline-none opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

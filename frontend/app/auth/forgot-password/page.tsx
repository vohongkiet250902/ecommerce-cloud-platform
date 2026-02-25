"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Mail,
  ArrowLeft,
  Loader2,
  Sun,
  Moon,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useToast } from "@/hooks/use-toast";

/* =======================
   Schemas
======================= */

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Email không hợp lệ" }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "Mã OTP phải có 6 chữ số" }),
});

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
      .regex(/[A-Z]/, { message: "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa" })
      .regex(/[a-z]/, { message: "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường" })
      .regex(/[0-9]/, { message: "Mật khẩu phải chứa ít nhất 1 chữ số" })
      .regex(/[^A-Za-z0-9]/, { message: "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt" }),
    confirmPassword: z
      .string()
      .min(8, { message: "Mật khẩu xác nhận phải có ít nhất 8 ký tự" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: Reset
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return savedTheme === "dark" || (!savedTheme && prefersDark);
  });

  const { toast } = useToast();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  /* =======================
     Forms
  ======================= */

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  /* =======================
     Handlers
  ======================= */

  const onEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      // Giả lập API gửi mail
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setUserEmail(data.email);
      setStep(2);
      toast({
        variant: "success",
        title: "✅ Đã gửi mã OTP",
        description: `Mã xác thực đã được gửi đến ${data.email}`,
      });
    } catch (err) {
      toast({ variant: "destructive", title: "❌ Lỗi", description: "Không thể gửi mã. Thử lại sau." });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: OtpFormData) => {
    setIsLoading(true);
    try {
      // Giả lập API kiểm tra OTP (mặc định cho là 123456)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep(3);
      toast({
        variant: "success",
        title: "✅ Xác thực thành công",
        description: "Vui lòng nhập mật khẩu mới của bạn.",
      });
    } catch (err) {
      toast({ variant: "destructive", title: "❌ Lỗi", description: "Mã OTP không hợp lệ." });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      // Giả lập API đổi mật khẩu
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast({
        variant: "success",
        title: "✅ Đổi mật khẩu thành công",
        description: "Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.",
      });
      // Redirect về Login sau một khoảng trễ ngắn để hiển thị toast
      setTimeout(() => {
        router.push("/auth");
      }, 1500);
    } catch (err) {
      toast({ variant: "destructive", title: "❌ Lỗi", description: "Có lỗi xảy ra." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4 relative overflow-hidden">
      {/* Decorative Circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="rounded-full hover:bg-muted/50"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-md z-10 relative">
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại đăng nhập
        </Link>

        <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative h-16 w-16 transform hover:scale-105 transition-transform duration-300 rounded-2xl overflow-hidden bg-white/50 dark:bg-white/10 p-1 shadow-sm border border-primary/10">
              <Image
                src="/assets/img/protechstore.png"
                alt="ProTech Store Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {step === 1 && "Quên mật khẩu"}
              {step === 2 && "Xác thực OTP"}
              {step === 3 && "Đặt lại mật khẩu"}
            </CardTitle>
            <CardDescription className="text-base mt-2 font-medium px-4">
              {step === 1 && "Nhập email của bạn để nhận mã xác thực"}
              {step === 2 && (
                <>
                  Mã OTP đã được gửi đến <br />
                  <span className="text-foreground font-bold">{userEmail}</span>
                </>
              )}
              {step === 3 && "Vui lòng nhập mật khẩu mới cho tài khoản của bạn"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {/* STEP 1: Email Form */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                      <FormField
                        control={emailForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input
                                  {...field}
                                  placeholder="name@example.com"
                                  className="pl-10 h-11"
                                  autoComplete="email"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-11 text-base font-medium transition-all cursor-pointer" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang gửi...</> : "Tiếp tục"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* STEP 2: OTP Form */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                      <FormField
                        control={otpForm.control}
                        name="otp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mã xác thực (6 chữ số)</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input
                                  {...field}
                                  placeholder="000000"
                                  maxLength={6}
                                  className="pl-10 h-11 text-center text-xl tracking-[0.5em] font-mono"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-3">
                        <Button type="submit" className="w-full h-11 text-base font-medium cursor-pointer" disabled={isLoading}>
                          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xác thực...</> : "Xác nhận OTP"}
                        </Button>
                        <Button
                          type="button" 
                          variant="ghost" 
                          className="w-full text-sm cursor-pointer" 
                          onClick={() => setStep(1)}
                          disabled={isLoading}
                        >
                          Thay đổi email
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* STEP 3: Reset Password Form */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Form {...resetForm}>
                    <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
                      <FormField
                        control={resetForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mật khẩu mới</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <div className="relative group">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                  <Input
                                    {...field}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 h-11"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 dropdown-content"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>

                                {/* Password Strength Meter */}
                                {field.value && (
                                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="flex gap-1 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                      {[1, 2, 3, 4, 5].map((level) => {
                                        const value = field.value || "";
                                        let score = 0;
                                        if (value.length >= 8) score++;
                                        if (/[A-Z]/.test(value)) score++;
                                        if (/[a-z]/.test(value)) score++;
                                        if (/[0-9]/.test(value)) score++;
                                        if (/[^A-Za-z0-9]/.test(value)) score++;

                                        const isActive = level <= score;
                                        const getColor = () => {
                                          if (score <= 2) return "bg-destructive";
                                          if (score <= 4) return "bg-yellow-500";
                                          return "bg-green-500";
                                        };

                                        return (
                                          <div 
                                            key={level}
                                            className={`h-full flex-1 transition-all duration-500 ${isActive ? getColor() : "bg-muted"}`}
                                          />
                                        );
                                      })}
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-wider">
                                      <span className={
                                        (field.value.length >= 8 ? "text-green-500" : "text-muted-foreground") 
                                      }>8+ ký tự</span>
                                      <span className={
                                        (/[A-Z]/.test(field.value) && /[a-z]/.test(field.value) ? "text-green-500" : "text-muted-foreground")
                                      }>Aa</span>
                                      <span className={
                                        (/[0-9]/.test(field.value) ? "text-green-500" : "text-muted-foreground")
                                      }>123</span>
                                      <span className={
                                        (/[^A-Za-z0-9]/.test(field.value) ? "text-green-500" : "text-muted-foreground")
                                      }>@#$</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={resetForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-10 pr-10 h-11"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 dropdown-content"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  tabIndex={-1}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full h-11 text-base font-medium cursor-pointer" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang cập nhật...</> : "Đặt lại mật khẩu"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`mt-8 text-center ${step !== 1 ? 'hidden' : ''}`}>
              <Link href="/auth" className="text-sm text-primary font-semibold hover:underline cursor-pointer">
                Quay lại trang Đăng nhập
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          &copy; {new Date().getFullYear()} ProTech Store. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}

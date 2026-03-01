"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  Sun,
  Moon,
  User,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
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
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/* =======================
   Schema
======================= */

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email không hợp lệ" }),
  password: z.string().min(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" }),
});

const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { message: "Họ tên phải có ít nhất 2 ký tự" }),
    email: z.string().trim().email({ message: "Email không hợp lệ" }),
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

const otpSchema = z.object({
  otp: z.string().length(6, { message: "Mã OTP phải có 6 số" }),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

type AuthState = "login" | "register" | "verify";

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}

const ErrorMessage = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
     <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 mb-4 animate-in fade-in slide-in-from-top-1">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">{message}</span>
     </div>
  );
};

function AuthContent() {
  const [authState, setAuthState] = useState<AuthState>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { toast } = useToast();
  const { 
    signIn, signUp, verifyAccount, resendActivation, 
    forgotPassword, resetPassword, isAuthenticated, loading, user 
  } = useAuth();
  
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    setError(null);
    loginForm.clearErrors();
    signupForm.clearErrors();
    otpForm.clearErrors();
  }, [authState, loginForm, signupForm, otpForm]);

  // Clear error when user types
  useEffect(() => {
    const subscription = loginForm.watch(() => {
      if (error) setError(null);
    });
    return () => subscription.unsubscribe();
  }, [loginForm, error]);

  useEffect(() => {
    const subscription = signupForm.watch(() => {
      if (error) setError(null);
    });
    return () => subscription.unsubscribe();
  }, [signupForm, error]);

  useEffect(() => {
    const subscription = otpForm.watch(() => {
      if (error) setError(null);
    });
    return () => subscription.unsubscribe();
  }, [otpForm, error]);

  useEffect(() => {
    if (!loading && isAuthenticated && user && authState !== 'verify') {
      if (user.role === "admin") router.push("/admin");
      else if (redirect) router.push(redirect);
      else router.push("/");
    }
  }, [loading, isAuthenticated, user, router, redirect, authState]);

  /* ======================= Handlers ======================= */

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await signIn(data.email, data.password);
      if (res.error) {
        if ((res as any).status === 403) {
          setTargetEmail(data.email);
          setAuthState("verify");
          toast({ 
            title: "🔐 Tài khoản chưa kích hoạt", 
            description: "Vui lòng kiểm tra email và nhập mã OTP để kích hoạt tài khoản của bạn." 
          });
        } else if ((res as any).status === 401) {
          setError("Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
        } else {
          setError(res.error.message || "Đăng nhập thất bại. Vui lòng kiểm tra kết nối.");
        }
        return;
      }
      toast({ 
        variant: "success", 
        title: "🎉 Thành công", 
        description: "Chào mừng bạn đã quay trở lại với ProTech Store!" 
      });
    } catch (err) {
      setError("Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await signUp(data.email, data.password, data.fullName);
      if (res.error) {
        if ((res as any).status === 400) {
          setError("Địa chỉ email này đã được sử dụng bởi một tài khoản khác.");
        } else {
          setError(res.error.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
        }
        return;
      }
      setTargetEmail(data.email);
      setAuthState("verify");
      toast({ 
        variant: "success", 
        title: "📧 Đăng ký thành công", 
        description: `Chúng tôi đã gửi mã xác thực đến ${data.email}. Vui lòng kiểm tra hộp thư.` 
      });
    } catch (err) {
      setError("Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (data: OtpFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await verifyAccount(targetEmail, data.otp);
      if (res.error) {
        if ((res as any).status === 400) {
          setError("Mã OTP không chính xác hoặc đã hết hạn sử dụng.");
        } else {
          setError(res.error.message || "Xác thực tài khoản thất bại.");
        }
        return;
      }
      toast({ 
        variant: "success", 
        title: "✨ Kích hoạt thành công", 
        description: "Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập để bắt đầu mua sắm!" 
      });
      setAuthState("login");
    } catch (err) {
      setError("Máy chủ không phản hồi. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const { error } = await resendActivation(targetEmail);
      if (error) toast({ variant: "destructive", title: "❌ Lỗi", description: error.message });
      else toast({ variant: "success", title: "✅ Đã gửi lại mã", description: "Vui lòng kiểm tra hộp thư đến." });
    } finally {
      setIsLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4 relative overflow-hidden">
      {/* Decorative Circles - ensure negative z-index to stay behind everything */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="rounded-full hover:bg-muted/50"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </Button>
      </div>

      {/* Main Content - ensure positive z-index */}
      <div className="w-full max-w-md z-10 relative">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại trang chủ
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
              ProTech Store
            </CardTitle>
            <CardDescription className="text-base mt-2 font-medium">
              {authState === "login" && "Đăng nhập tài khoản"}
              {authState === "register" && "Tạo tài khoản mới"}
              {authState === "verify" && "Xác thực tài khoản"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* LOGIN SCREEN */}
              {authState === "login" && (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                      <ErrorMessage message={error} />
                      <FormField control={loginForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                              <Input {...field} placeholder="name@example.com" className="pl-10 h-11" autoComplete="email" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Mật khẩu</FormLabel>
                            <Link href="/auth/forgot-password" title="Quên mật khẩu?" className="h-auto p-0 text-xs text-primary hover:underline">Quên mật khẩu?</Link>
                          </div>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                              <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11" autoComplete="current-password" />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all cursor-pointer" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> : "Đăng nhập"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* REGISTER SCREEN */}
              {authState === "register" && (
                <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-5">
                      <ErrorMessage message={error} />
                      <FormField control={signupForm.control} name="fullName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Họ và tên</FormLabel>
                          <FormControl>
                            <div className="relative group"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" /><Input {...field} placeholder="Nguyễn Văn A" className="pl-10 h-11" autoComplete="name" /></div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={signupForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative group"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" /><Input {...field} placeholder="name@example.com" className="pl-10 h-11" autoComplete="email" /></div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={signupForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mật khẩu</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11" autoComplete="new-password" />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                              {field.value && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                  <div className="flex gap-1 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                    {[1, 2, 3, 4, 5].map((level) => {
                                      const val = field.value || "";
                                      let sc = 0;
                                      if (val.length >= 8) sc++;
                                      if (/[A-Z]/.test(val)) sc++;
                                      if (/[a-z]/.test(val)) sc++;
                                      if (/[0-9]/.test(val)) sc++;
                                      if (/[^A-Za-z0-9]/.test(val)) sc++;
                                      const isActive = level <= sc;
                                      const clr = sc <= 2 ? "bg-destructive" : sc <= 4 ? "bg-warning" : "bg-success";
                                      return <div key={level} className={`h-full flex-1 transition-all duration-500 ${isActive ? clr : "bg-muted"}`} />;
                                    })}
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-wider">
                                    <span className={field.value.length >= 8 ? "text-success" : "text-muted-foreground"}>8+ ký tự</span>
                                    <span className={(/[A-Z]/.test(field.value) && /[a-z]/.test(field.value) ? "text-success" : "text-muted-foreground")}>Aa</span>
                                    <span className={(/[0-9]/.test(field.value) ? "text-success" : "text-muted-foreground")}>123</span>
                                    <span className={(/[^A-Za-z0-9]/.test(field.value) ? "text-success" : "text-muted-foreground")}>@#$</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={signupForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Xác nhận mật khẩu</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                              <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11" autoComplete="new-password" />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all cursor-pointer" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...</> : "Đăng ký tài khoản"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* VERIFY OTP SCREEN */}
              {authState === "verify" && (
                <motion.div key="verify" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center space-y-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner"><CheckCircle2 className="h-8 w-8" /></div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-xl">Xác thực OTP</h3>
                      <p className="text-sm text-muted-foreground">Mã xác thực đã được gửi đến <br/><b className="text-foreground">{targetEmail}</b></p>
                    </div>
                  </div>
                  <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(handleVerify)} className="space-y-6">
                      <ErrorMessage message={error} />
                      <FormField control={otpForm.control} name="otp" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Nhập 6 số" className="text-center h-14 text-2xl tracking-[0.5em] font-bold bg-secondary/30 border-primary/20 focus:border-primary/50" maxLength={6} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all" disabled={isLoading}>
                         {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Kích hoạt tài khoản"}
                      </Button>
                      <div className="flex flex-col gap-3 pt-2">
                        <Button variant="outline" type="button" className="h-10 text-sm gap-2" onClick={handleResendOtp} disabled={isLoading}><RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Gửi lại mã OTP</Button>
                        <Button variant="ghost" type="button" className="h-10 text-sm text-muted-foreground" onClick={() => setAuthState("login")}>Hủy bỏ và quay lại</Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 text-center flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {authState === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
              </p>
              {authState === "login" ? (
                <Button variant="link" className="text-primary font-semibold hover:text-primary/80 p-0 h-auto cursor-pointer" onClick={() => setAuthState("register")}>
                  Đăng ký ngay tài khoản mới
                </Button>
              ) : (
                <Button variant="link" className="text-primary font-semibold hover:text-primary/80 p-0 h-auto cursor-pointer" onClick={() => setAuthState("login")}>
                  Đăng nhập vào tài khoản của bạn
                </Button>
              )}
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


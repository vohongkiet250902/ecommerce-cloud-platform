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

/* =======================
   Schema
======================= */

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email không hợp lệ" }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" }),
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

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

  /* =======================
     Component
  ======================= */

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

// Helper for error display
const ErrorMessage = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
     <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 mb-4 animate-in fade-in slide-in-from-top-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <span className="font-medium">{message}</span>
     </div>
  );
};

/* =======================
   Render
======================= */

function AuthContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return savedTheme === "dark" || (!savedTheme && prefersDark);
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { toast } = useToast();
  const { signIn, signUp, isAuthenticated, loading, user } = useAuth();
  
  // Apply theme changes
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

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Reset error when switching forms
  useEffect(() => {
    setError(null);
  }, [isLogin]);

  /* =======================
     Redirect
  ======================= */

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      if (user.role === "admin") {
        // Nếu là admin, ưu tiên vào trang admin luôn
        router.push("/admin");
      } else if (redirect) {
        router.push(redirect);
      } else {
        router.push("/");
      }
    }
  }, [loading, isAuthenticated, user, router, redirect]);

  /* =======================
     Handlers
  ======================= */

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        let msg = "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
        const errorMsg = error.message.toLowerCase();

        if (
          errorMsg.includes("invalid login credentials") ||
          errorMsg.includes("user not found") ||
          errorMsg.includes("bad credentials") ||
          errorMsg.includes("invalid credentials")
        ) {
          msg = "Email hoặc mật khẩu không đúng.";
        } else if (errorMsg.includes("email not confirmed")) {
          msg = "Tài khoản của bạn đã bị khóa.";
        } else if (errorMsg.includes("network error") || errorMsg.includes("fetch")) {
          msg = "Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.";
        } else if (errorMsg.includes("rate limit")) {
          msg = "Bạn đã thử quá nhiều lần. Vui lòng quay lại sau.";
        } else if (error.message) {
           msg = error.message;
        }

        setError(msg);
        return;
      }

      toast({variant: "success", title: "✅ Thành công", description: "Đăng nhập thành công!" });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName);

      if (error) {
        let msg = "Đăng ký thất bại. Email đã tồn tại.";
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes("user already registered") || errorMsg.includes("already exists")) {
          msg = "Email này đã được đăng ký. Vui lòng sử dụng email khác.";
        } else if (errorMsg.includes("network error") || errorMsg.includes("fetch")) {
          msg = "Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền.";
        } else if (errorMsg.includes("rate limit")) {
          msg = "Bạn đã thử quá nhiều lần. Vui lòng quay lại sau.";
        } else if (error.message) {
           msg = error.message;
        }
        
        setError(msg);
        return;
      }

      toast({
        variant: "success",
        title: "✅ Thành công",
        description: "Đăng ký tài khoản thành công! Đang tự động đăng nhập...",
      });

      // Tự động đăng nhập sau khi đăng ký
      await signIn(data.email, data.password);
      signupForm.reset();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.";
      setError(errorMsg);
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
              {isLogin ? "Đăng nhập tài khoản" : "Tạo tài khoản mới"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {isLogin ? (
                /* LOGIN FORM */
                <motion.div
                  key="login-form-container"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(handleLogin)}
                      className="space-y-5"
                    >
                      <ErrorMessage message={error} />
                      
                      <FormField
                        control={loginForm.control}
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

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Mật khẩu</FormLabel>
                              <Link
                                href="/auth/forgot-password"
                                className="text-xs text-primary hover:underline"
                              >
                                Quên mật khẩu?
                              </Link>
                            </div>
                            <FormControl>
                              <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-10 pr-10 h-11"
                                  autoComplete="current-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowPassword(!showPassword)}
                                  tabIndex={-1}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          "Đăng nhập"
                        )}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              ) : (
                /* SIGNUP FORM */
                <motion.div
                  key="signup-form-container"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Form {...signupForm}>
                    <form
                      onSubmit={signupForm.handleSubmit(handleSignup)}
                      className="space-y-5"
                    >
                      <ErrorMessage message={error} />

                      <FormField
                        control={signupForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Họ và tên</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input
                                  {...field}
                                  placeholder="Nguyễn Văn A"
                                  className="pl-10 h-11"
                                  autoComplete="name"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={signupForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input
                                  {...field}
                                  type="email"
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

                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <div className="relative group">
                                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                  <Input
                                    {...field}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 h-11"
                                    autoComplete="new-password"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (signupForm.getValues("confirmPassword")) {
                                        signupForm.trigger("confirmPassword");
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
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
                                          if (score <= 4) return "bg-warning";
                                          return "bg-success";
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
                                        (field.value.length >= 8 ? "text-success" : "text-muted-foreground") 
                                      }>8+ ký tự</span>
                                      <span className={
                                        (/[A-Z]/.test(field.value) && /[a-z]/.test(field.value) ? "text-success" : "text-muted-foreground")
                                      }>Aa</span>
                                      <span className={
                                        (/[0-9]/.test(field.value) ? "text-success" : "text-muted-foreground")
                                      }>123</span>
                                      <span className={
                                        (/[^A-Za-z0-9]/.test(field.value) ? "text-success" : "text-muted-foreground")
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
                        control={signupForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Xác nhận mật khẩu</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-10 pr-10 h-11"
                                  autoComplete="new-password"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    signupForm.trigger("confirmPassword");
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                  }
                                  tabIndex={-1}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          "Đăng ký tài khoản"
                        )}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 text-center flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
              </p>
              <Button
                variant="link"
                className="text-primary font-semibold hover:text-primary/80 p-0 h-auto cursor-pointer"
                onClick={() => {
                  setIsLogin(!isLogin);
                  loginForm.reset();
                  signupForm.reset();
                }}
              >
                {isLogin ? "Đăng ký ngay tài khoản mới" : "Đăng nhập vào tài khoản của bạn"}
              </Button>
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

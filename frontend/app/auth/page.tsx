'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

/* =======================
   Schema
======================= */

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Email không hợp lệ' }),
  password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
});

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, { message: 'Họ tên phải có ít nhất 2 ký tự' }),
    email: z.string().trim().email({ message: 'Email không hợp lệ' }),
    password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
    confirmPassword: z.string().min(6, { message: 'Xác nhận mật khẩu phải có ít nhất 6 ký tự' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

/* =======================
   Component
======================= */

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize state from localStorage or system preference
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    return savedTheme === "dark" || (!savedTheme && prefersDark);
  });

  const router = useRouter();
  const { toast } = useToast();
  const { signIn, signUp, isAuthenticated, loading, user } = useAuth();

  // Apply theme changes to DOM
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
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  /* =======================
     Redirect nếu đã login
  ======================= */

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // Redirect admin users to admin dashboard
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        // Redirect regular users to home
        router.push('/');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  /* =======================
     Handlers
  ======================= */

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        let msg = 'Đăng nhập thất bại';
        if (error.message && error.message.includes('Invalid login credentials')) {
          msg = 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin.';
        } else if (error.message && error.message.includes('Email not confirmed')) {
          msg = 'Email chưa được xác nhận. Vui lòng kiểm tra email của bạn.';
        } else if (error.message) {
          msg = error.message;
        }

        toast({ variant: 'destructive', title: '❌ Đăng nhập thất bại', description: msg });
        return;
      }

      toast({ title: '✅ Thành công', description: 'Đăng nhập thành công!' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.fullName);

      if (error) {
        let msg = 'Đăng ký thất bại';
        if (error.message && error.message.includes('User already registered')) {
          msg = 'Email này đã được đăng ký. Vui lòng sử dụng email khác.';
        } else if (error.message && error.message.includes('user_id')) {
          msg = 'Có lỗi khi tạo tài khoản. Vui lòng thử lại.';
        } else if (error.message) {
          msg = error.message;
        }
        toast({ variant: 'destructive', title: '❌ Đăng ký thất bại', description: msg });
        return;
      }

      toast({
        title: '✅ Thành công',
        description: 'Đăng ký thành công! Bạn có thể đăng nhập ngay.',
      });

      setIsLogin(true);
      signupForm.reset();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
      toast({
        variant: 'destructive',
        title: '❌ Lỗi',
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* =======================
     Loading
  ======================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* =======================
     UI
  ======================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="rounded-full"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại trang chủ
        </Link>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl gradient-hero flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">E</span>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
            </CardTitle>
            <CardDescription>
              {isLogin ? 'Chào mừng bạn quay trở lại!' : 'Tạo tài khoản mới'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLogin ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  {/* Email */}
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                            <Input {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password */}
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              className="pl-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Đăng nhập
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  {/* Full Name */}
                  <FormField
                    control={signupForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ và tên</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                            <Input {...field} placeholder="Nhập họ và tên" className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                            <Input {...field} type="email" placeholder="Nhập email" className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password */}
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              className="pl-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xác nhận mật khẩu</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              className="pl-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2"
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Đăng ký
                  </Button>
                </form>
              </Form>
            )}

            <p className="text-sm text-center mt-6">
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
              <button
                className="ml-1 text-primary font-medium"
                onClick={() => {
                  setIsLogin(!isLogin);
                  loginForm.reset();
                  signupForm.reset();
                }}
              >
                {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

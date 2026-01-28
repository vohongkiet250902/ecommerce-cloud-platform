import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedLayoutProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin' | 'both';
}

export function ProtectedLayout({ children, requiredRole = 'user' }: ProtectedLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  // Đang tải
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Chưa đăng nhập
  if (!isAuthenticated || !user) {
    router.push('/auth');
    return null;
  }

  // Kiểm tra quyền admin
  if (requiredRole === 'admin' && user.role !== 'admin') {
    router.push('/');
    return null;
  }

  // Quyền truy cập
  return <>{children}</>;
}

interface RoleBasedComponentProps {
  children: ReactNode;
  requiredRole?: 'user' | 'admin';
  fallback?: ReactNode;
}

export function RoleBasedComponent({
  children,
  requiredRole = 'user',
  fallback = null,
}: RoleBasedComponentProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return fallback;
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return fallback;
  }

  return <>{children}</>;
}

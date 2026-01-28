import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
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

  // Không phải admin
  if (user.role !== 'admin') {
    router.push('/');
    return null;
  }

  return <>{children}</>;
}

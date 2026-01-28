'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  FolderTree,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { categoryApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
  parentId?: string | null;
  children?: Category[];
}

interface FormData {
  name: string;
  slug: string;
}

// Generate slug from name
function generateSlug(name: string): string {
  const vietnameseMap: Record<string, string> = {
    à: 'a',
    á: 'a',
    ạ: 'a',
    ả: 'a',
    ã: 'a',
    â: 'a',
    ầ: 'a',
    ấ: 'a',
    ậ: 'a',
    ẩ: 'a',
    ẫ: 'a',
    ă: 'a',
    ằ: 'a',
    ắ: 'a',
    ặ: 'a',
    ẳ: 'a',
    ẵ: 'a',
    è: 'e',
    é: 'e',
    ẹ: 'e',
    ẻ: 'e',
    ẽ: 'e',
    ê: 'e',
    ề: 'e',
    ế: 'e',
    ệ: 'e',
    ể: 'e',
    ễ: 'e',
    ì: 'i',
    í: 'i',
    ị: 'i',
    ỉ: 'i',
    ĩ: 'i',
    ò: 'o',
    ó: 'o',
    ọ: 'o',
    ỏ: 'o',
    õ: 'o',
    ô: 'o',
    ồ: 'o',
    ố: 'o',
    ộ: 'o',
    ổ: 'o',
    ỗ: 'o',
    ơ: 'o',
    ờ: 'o',
    ớ: 'o',
    ợ: 'o',
    ở: 'o',
    ỡ: 'o',
    ù: 'u',
    ú: 'u',
    cụ: 'u',
    ủ: 'u',
    ũ: 'u',
    ư: 'u',
    ừ: 'u',
    ứ: 'u',
    ự: 'u',
    ử: 'u',
    ữ: 'u',
    ỳ: 'y',
    ý: 'y',
    ỵ: 'y',
    ỷ: 'y',
    ỹ: 'y',
    đ: 'd',
    // ... (giữ nguyên map bảng chữ cái)
  };

  return name
    .toLowerCase()
    .split('')
    .map((char) => vietnameseMap[char] || char)
    .join('')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CategoryItemProps {
  category: Category;
  level?: number;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const CategoryItem = ({
  category,
  level = 0,
  onDelete,
  isDeleting,
}: CategoryItemProps) => {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors border-b border-border last:border-0',
          level > 0 && 'bg-secondary/20',
        )}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        <div className='flex items-center gap-3'>
          {category.children && category.children.length > 0 ? (
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
          ) : (
            <div className='w-4' />
          )}

          <FolderTree className='h-5 w-5 text-primary' />
          <div>
            <p className='font-medium text-foreground'>{category.name}</p>
            <p className='text-sm text-muted-foreground'>/{category.slug}</p>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <Badge variant='secondary' className='font-medium'>
            {calculateProductCount(category)} sản phẩm
          </Badge>

          <DropdownMenu open={deleteConfirm} onOpenChange={setDeleteConfirm}>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon-sm'>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='dropdown-content'>
              <DropdownMenuItem disabled>
                <Edit className='mr-2 h-4 w-4' />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Plus className='mr-2 h-4 w-4' />
                Thêm danh mục con
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-destructive'
                onClick={() => {
                  if (deleteConfirm) {
                    onDelete(category.id);
                    setDeleteConfirm(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 className='mr-2 h-4 w-4' />
                )}
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {category.children?.map((child) => (
        <CategoryItem
          key={child.id}
          category={child}
          level={level + 1}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </>
  );
};

function calculateProductCount(category: Category): number {
  if (!category.children || category.children.length === 0) {
    return category.productCount ?? 0;
  }
  return category.children.reduce(
    (sum, child) => sum + calculateProductCount(child),
    0,
  );
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
  });
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryApi.getCategories();
      const data = response.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh mục.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    setValidationError('');
    if (!formData.name.trim()) {
      setValidationError('Tên danh mục không được để trống');
      return false;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      setValidationError('Slug không hợp lệ');
      return false;
    }
    return true;
  };

  const handleAddCategory = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await categoryApi.createCategory(formData as any);
      toast({ title: 'Thành công', description: 'Đã thêm danh mục mới' });
      setFormData({ name: '', slug: '' });
      setIsModalOpen(false);
      await fetchCategories();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể thêm danh mục.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setDeletingId(id);
      await categoryApi.deleteCategory(id);
      toast({ title: 'Thành công', description: 'Đã xóa danh mục' });
      await fetchCategories();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa danh mục.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading)
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Danh mục</h1>
          <p className='text-muted-foreground'>Quản lý cây danh mục</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className='h-4 w-4 mr-2' /> Thêm danh mục
        </Button>
      </div>

      <div className='bg-card rounded-xl card-shadow overflow-hidden'>
        {categories.length === 0 ? (
          <div className='p-8 text-center text-muted-foreground'>
            Chưa có danh mục nào.
          </div>
        ) : (
          categories.map((cat) => (
            <CategoryItem
              key={cat.id}
              category={cat}
              onDelete={handleDeleteCategory}
              isDeleting={deletingId === cat.id}
            />
          ))
        )}
      </div>

      {isModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-card rounded-xl shadow-lg max-w-md w-full p-6 space-y-4'>
            <div className='flex justify-between items-center'>
              <h2 className='text-xl font-bold'>Thêm danh mục mới</h2>
              <X
                className='cursor-pointer'
                onClick={() => setIsModalOpen(false)}
              />
            </div>

            {validationError && (
              <div className='p-3 bg-destructive/10 text-destructive rounded-md text-sm'>
                {validationError}
              </div>
            )}

            <div className='space-y-2'>
              <Label>Tên danh mục</Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ name: val, slug: generateSlug(val) });
                }}
              />
            </div>

            <div className='space-y-2'>
              <Label>Slug</Label>
              <Input
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
              />
            </div>

            <div className='flex gap-2 pt-4'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </Button>
              <Button
                className='flex-1'
                onClick={handleAddCategory}
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

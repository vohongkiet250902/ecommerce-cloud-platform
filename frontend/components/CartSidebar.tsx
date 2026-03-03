import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { orderApi } from "@/services/api";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { X, Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";

interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  attributes?: { key: string; value: string }[];
  originalPrice?: number;
  discountPercentage?: number;
}

interface CartSidebarProps {
  cartItems: CartItem[];
  onUpdateQuantity: (id: string | number, quantity: number) => void;
  onRemoveItem: (id: string | number) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
} as const;

export function CartSidebar({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  isOpen,
  onOpenChange,
}: CartSidebarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shippingFee;

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    if (!isAuthenticated) {
      onOpenChange(false);
      toast({
        title: "Thông báo",
        description: "Vui lòng đăng nhập để thanh toán",
      });
      router.push(`/auth?redirect=${encodeURIComponent("/checkout")}`);
      return;
    }

    onOpenChange(false);
    router.push('/checkout');
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Giỏ hàng của bạn
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              ({totalItems} sản phẩm)
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {cartItems.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-6"
              >
                <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Giỏ hàng trống</h3>
                <p className="text-muted-foreground mb-8 max-w-[250px]">
                  Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm
                </p>
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    router.push('/products');
                  }} 
                  className="rounded-full px-8"
                >
                  Tiếp tục mua sắm
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <ScrollArea className="flex-1 px-6">
                  <div className="space-y-4 py-4">
                    {cartItems.map((item) => (
                      <motion.div
                        key={item.id}
                        variants={itemVariants}
                        layout
                        className="group flex gap-4 p-3 bg-muted/40 hover:bg-muted/60 transition-colors rounded-xl border border-transparent hover:border-border"
                      >
                        <div className="w-20 h-20 bg-background rounded-lg overflow-hidden flex-shrink-0 border border-border flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="font-semibold text-sm line-clamp-1 mb-1">
                              {item.name}
                            </h4>
                            {item.attributes && item.attributes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {item.attributes.map((attr, idx) => (
                                  <span key={idx} className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                                    {attr.key}: {attr.value}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-primary font-bold text-base">
                                {formatPrice(item.price)}
                              </p>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs text-muted-foreground line-through">
                                    {formatPrice(item.originalPrice)}
                                  </p>
                                  {item.discountPercentage && item.discountPercentage > 0 && (
                                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1 rounded-sm">
                                      -{item.discountPercentage}%
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center bg-background rounded-full border border-border p-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-muted"
                                onClick={() =>
                                  onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full hover:bg-muted"
                                onClick={() =>
                                  onUpdateQuantity(item.id, item.quantity + 1)
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                              onClick={() => onRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="p-6 bg-background border-t space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground text-base">Tạm tính</span>
                      <span className="font-semibold text-base">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground text-base">Phí vận chuyển</span>
                      <span>
                        {shippingFee === 0 ? (
                          <span className="text-green-600 font-semibold text-base">Miễn phí</span>
                        ) : (
                          <span className="font-semibold text-base">{formatPrice(shippingFee)}</span>
                        )}
                      </span>
                    </div>
                    {subtotal < 500000 && (
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                        <p className="text-xs text-primary font-medium">
                          Mua thêm <span className="font-bold">{formatPrice(500000 - subtotal)}</span> để được miễn phí vận chuyển
                        </p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-1000" 
                            style={{ width: `${(subtotal / 500000) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-xl py-2">
                      <span>Tổng tiền</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      className="w-full h-12 text-base font-bold rounded-xl gradient-hero shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      onClick={handleCheckout}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Đang xử lý...
                        </>
                      ) : (
                        "Thanh toán ngay"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full h-12 text-muted-foreground hover:text-foreground font-medium"
                      onClick={() => {
                        onOpenChange(false);
                        router.push('/products');
                      }}
                    >
                      Tiếp tục mua hàng
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}


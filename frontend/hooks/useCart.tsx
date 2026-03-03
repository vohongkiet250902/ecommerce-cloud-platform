"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cartApi, productApi } from "@/services/api";

export interface CartItem {
  id: string; // Unique key: productId-sku
  productId: string; // The real DB _id
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
  attributes?: { key: string; value: string }[];
  originalPrice?: number;
  discountPercentage?: number;
}

interface CartContextType {
  cartItems: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (item: CartItem) => void;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  cartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      cartApi.getCart({ expand: true })
        .then(async (res) => {
          const apiCart = res.data.data || res.data;
          
          // Use Promise.all to fetch full product details for accurate pricing/discounts
          const mappedItems = await Promise.all((apiCart.items || []).map(async (it: any) => {
            let finalPrice = it.variant?.price || 0;
            let originalPrice = it.variant?.price || 0;
            let discountPercentage = 0;
            
            try {
              if (it.product && it.product.slug) {
                const pRes = await productApi.getProductDetail(it.product.slug);
                const fullProduct = pRes.data.data || pRes.data;
                const matchedVariant = fullProduct.variants?.find((v: any) => v.sku === it.sku);
                
                if (matchedVariant) {
                  originalPrice = matchedVariant.price ?? fullProduct.price ?? originalPrice;
                  discountPercentage = matchedVariant.discountPercentage || 0;
                  finalPrice = originalPrice * (1 - discountPercentage / 100);
                }
              }
            } catch (error) {
              console.error("Failed to fetch full product details", error);
            }

            return {
              id: `${it.productId}-${it.sku}`,
              productId: it.productId,
              name: it.product?.name || "Sản phẩm",
              sku: it.sku,
              price: finalPrice,
              originalPrice,
              discountPercentage,
              quantity: it.quantity,
              image: it.variant?.image?.url || it.product?.images?.[0]?.url || "",
              attributes: it.variant?.attributes || [],
            };
          }));
          
          setCartItems(mappedItems);
          localStorage.setItem("cart", JSON.stringify(mappedItems));
        })
        .catch((e) => console.error("Failed to fetch cart", e));
    } else {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (e) {
          console.error("Failed to parse cart from localStorage", e);
        }
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addItem = async (item: CartItem) => {
    setCartItems((prev) => {
      const existingItem = prev.find((i) => i.id === item.id);
      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });

    if (isAuthenticated) {
      try {
        await cartApi.addItem({
           productId: item.productId,
           sku: item.sku,
           quantity: item.quantity
        });
      } catch (e) {
        console.error("Failed to sync cart", e);
      }
    }
  };

  const removeItem = async (id: string | number) => {
    const itemToRemove = cartItems.find(i => i.id === id);
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    
    if (isAuthenticated && itemToRemove) {
       try {
          await cartApi.removeItem({ productId: itemToRemove.productId, sku: itemToRemove.sku });
       } catch (e) {}
    }
  };

  const updateQuantity = async (id: string | number, quantity: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
    
    const itemToUpdate = cartItems.find(i => i.id === id);
    if (isAuthenticated && itemToUpdate) {
       try {
          await cartApi.addItem({ productId: itemToUpdate.productId, sku: itemToUpdate.sku, quantity: quantity });
       } catch (e) {}
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    localStorage.removeItem("cart");
    if (isAuthenticated) {
       try { await cartApi.clearCart(); } catch (e) {}
    }
  };

  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        cartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import { useEffect } from "react";
import { fetchCategoriesThunk } from "@/store/categories/categories.slice";
import { fetchBrandsThunk } from "@/store/brands/brands.slice";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(fetchCategoriesThunk());
    store.dispatch(fetchBrandsThunk());
  }, []);

  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import { useEffect } from "react";
import { fetchCategoriesThunk } from "@/store/categories/categories.slice";
import { fetchBrandsThunk } from "@/store/brands/brands.slice";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(fetchCategoriesThunk());
    store.dispatch(fetchBrandsThunk());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}

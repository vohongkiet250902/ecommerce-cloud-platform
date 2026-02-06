"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import { useEffect } from "react";
import { fetchCategoriesThunk } from "@/store/categories/categories.slice";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(fetchCategoriesThunk());
  }, []);

  return <Provider store={store}>{children}</Provider>;
}

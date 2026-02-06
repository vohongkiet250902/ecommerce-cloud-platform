// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import categoriesReducer from "./categories/categories.slice";
import brandsReducer from "./brands/brands.slice";

export const store = configureStore({
  reducer: {
    categories: categoriesReducer,
    brands: brandsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

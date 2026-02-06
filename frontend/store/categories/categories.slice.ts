import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { categoryApi } from "@/services/api";

export interface Category {
  _id: string;
  name: string;
  slug: string;
  productCount?: number;
  parentId?: string | null;
  children?: Category[];
}

interface CategoriesState {
  data: Category[];
  loading: boolean;
}

const initialState: CategoriesState = {
  data: [],
  loading: false,
};

export const fetchCategoriesThunk = createAsyncThunk(
  "categories/fetchAll",
  async () => {
    const res = await categoryApi.getCategories();
    return res.data;
  },
);

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategoriesThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCategoriesThunk.fulfilled, (state, action) => {
        state.loading = false;

        state.data = Array.isArray(action.payload)
          ? action.payload
          : [];
      })
      .addCase(fetchCategoriesThunk.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default categoriesSlice.reducer;

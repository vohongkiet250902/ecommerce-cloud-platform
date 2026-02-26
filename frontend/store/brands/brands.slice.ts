import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { brandApi } from "@/services/api";

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  productCount?: number;
  isActive: boolean;
}

interface BrandsState {
  data: Brand[];
  loading: boolean;
}

const initialState: BrandsState = {
  data: [],
  loading: false,
};

export const fetchBrandsThunk = createAsyncThunk(
  "brands/fetchAll",
  async () => {
    const res = await brandApi.getBrands();
    return res.data;
  },
);

const brandsSlice = createSlice({
  name: "brands",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrandsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBrandsThunk.fulfilled, (state, action) => {
        state.loading = false;

        state.data = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchBrandsThunk.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default brandsSlice.reducer;

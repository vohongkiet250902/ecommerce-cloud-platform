"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import { productApi } from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useSelector } from "react-redux";
import { RootState } from "@/store";

const sortOptions = [
  { value: "popular", label: "Phổ biến nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá thấp đến cao" },
  { value: "price-desc", label: "Giá cao đến thấp" },
  { value: "rating", label: "Đánh giá cao nhất" },
];

const PRODUCTS_PER_PAGE = 20;

export default function ProductsPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItemCount] = useState(3);
  const [sortBy, setSortBy] = useState("popular");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    0, 100000000,
  ]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Get categories and brands from Redux
  const { data: categoriesData } = useSelector((state: RootState) => state.categories);
  const { data: brandsData } = useSelector((state: RootState) => state.brands);

  // Transform for UI
  const categories = useMemo(() => [
    { value: "all", label: "Tất cả" },
    ...categoriesData.map((c: any) => ({ value: c._id, label: c.name }))
  ], [categoriesData]);
  
  const brands = useMemo(() => brandsData.map(b => ({ id: b._id, name: b.name })), [brandsData]);

  // Helper to find category and its children
  const getCategoryIds = useCallback((rootId: string, allCategories: any[]) => {
      const findNode = (id: string, list: any[]): any => {
          for (const item of list) {
              if (item._id === id) return item;
              if (item.children) {
                  const found = findNode(id, item.children);
                  if (found) return found;
              }
          }
          return null;
      };

      const collectIds = (node: any): string[] => {
          let ids = [node._id];
          if (node.children) {
              node.children.forEach((child: any) => {
                  ids = [...ids, ...collectIds(child)];
              });
          }
          return ids;
      };

      const root = findNode(rootId, allCategories);
      return root ? collectIds(root) : [rootId];
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await productApi.getProducts({ limit: 1000 });
        setProducts(res.data.data || res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by category (Recursive)
    if (selectedCategory !== "all") {
       const categoryIds = getCategoryIds(selectedCategory, categoriesData);
       filtered = filtered.filter((p: any) => 
          categoryIds.includes(p.categoryId) || categoryIds.includes(p.category?._id)
       );
    }
    
    // Filter by brands (ID check)
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) => 
        selectedBrands.includes(p.brandId) || selectedBrands.includes(p.brand?._id)
      );
    }

    // Filter by price range
    filtered = filtered.filter(
      (p) => {
         // Handle price traversing variants or fallback to root price
         const price = p.variants?.[0]?.price || p.price || 0;
         return price >= priceRange[0] && price <= priceRange[1];
      }
    );

    // Sort
    switch (sortBy) {
      case "newest":
        filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "price-asc":
        filtered = filtered.sort((a, b) => {
             const pa = a.variants?.[0]?.price || a.price || 0;
             const pb = b.variants?.[0]?.price || b.price || 0;
             return pa - pb;
        });
        break;
      case "price-desc":
         filtered = filtered.sort((a, b) => {
             const pa = a.variants?.[0]?.price || a.price || 0;
             const pb = b.variants?.[0]?.price || b.price || 0;
             return pb - pa;
        });
        break;
      case "rating":
        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // Popular - maybe sort by sold or review count
        filtered = filtered.sort((a, b) => (b.numReviews || 0) - (a.numReviews || 0));
    }

    return filtered;
  }, [products, selectedCategory, selectedBrands, priceRange, sortBy, categoriesData, getCategoryIds]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedBrands([]);
    setPriceRange([0, 100000000]);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedBrands.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < 100000000;

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBrands, priceRange, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        cartItemCount={cartItemCount}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Sản phẩm
          </h1>
          <p className="text-muted-foreground">
            Khám phá bộ sưu tập sản phẩm công nghệ mới nhất
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              className={`rounded-full whitespace-nowrap ${
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : ""
              }`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <ProductFilters
              brands={brands}
              selectedBrands={selectedBrands}
              onBrandsChange={setSelectedBrands}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              onClearFilters={clearFilters}
            />
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                {/* Mobile Filter Button */}
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      Bộ lọc
                      {hasActiveFilters && (
                        <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Bộ lọc</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <ProductFilters
                        brands={brands}
                        selectedBrands={selectedBrands}
                        onBrandsChange={setSelectedBrands}
                        priceRange={priceRange}
                        onPriceRangeChange={setPriceRange}
                        onClearFilters={clearFilters}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <span className="text-sm text-muted-foreground">
                  {filteredProducts.length} sản phẩm
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 mb-6"
                >
                  {selectedBrands.map((brandId) => {
                    const brandName = brands.find(b => b.id === brandId)?.name || brandId;
                    return (
                      <span
                        key={brandId}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {brandName}
                        <button
                          onClick={() =>
                            setSelectedBrands(
                              selectedBrands.filter((b) => b !== brandId)
                            )
                          }
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                  {(priceRange[0] > 0 || priceRange[1] < 100000000) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {new Intl.NumberFormat("vi-VN").format(priceRange[0])} -{" "}
                      {new Intl.NumberFormat("vi-VN").format(priceRange[1])}đ
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Xóa tất cả
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products */}
            {paginatedProducts.length > 0 ? (
              <motion.div
                layout
                className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                <AnimatePresence mode="popLayout">
                  {paginatedProducts.map((product, index) => (
                    <motion.div
                      key={product._id || index}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <ProductCard 
                        id={product.slug || product._id}
                        name={product.name}
                        price={product.variants?.[0]?.price || product.price || 0}
                        originalPrice={undefined}
                        image={product.images?.[0]?.url || ""}
                        rating={product.rating || 5}
                        reviewCount={product.numReviews || 0}
                        badge={product.totalStock < 10 ? "hot" : undefined}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">
                  Không tìm thấy sản phẩm phù hợp
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => setCurrentPage(page)}
                      className="w-10 h-10"
                    >
                      {page}
                    </Button>
                  )
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

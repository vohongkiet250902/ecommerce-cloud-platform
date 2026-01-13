"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Mock product data
const allProducts = [
  // Điện thoại
  {
    id: 1,
    name: "iPhone 15 Pro Max 256GB",
    price: 34990000,
    originalPrice: 36990000,
    image:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 256,
    badge: "hot" as const,
    category: "phone",
    brand: "Apple",
  },
  {
    id: 2,
    name: "Samsung Galaxy S24 Ultra",
    price: 31990000,
    originalPrice: 33990000,
    image:
      "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 189,
    badge: "new" as const,
    category: "phone",
    brand: "Samsung",
  },
  {
    id: 3,
    name: "iPhone 15 Pro 128GB",
    price: 28990000,
    image:
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 145,
    category: "phone",
    brand: "Apple",
  },
  {
    id: 4,
    name: "Samsung Galaxy Z Fold 5",
    price: 41990000,
    originalPrice: 44990000,
    image:
      "https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 98,
    badge: "sale" as const,
    category: "phone",
    brand: "Samsung",
  },
  {
    id: 5,
    name: "Xiaomi 14 Ultra",
    price: 23990000,
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 87,
    badge: "new" as const,
    category: "phone",
    brand: "Xiaomi",
  },
  {
    id: 6,
    name: "iPhone 14 128GB",
    price: 19990000,
    originalPrice: 22990000,
    image:
      "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 312,
    badge: "sale" as const,
    category: "phone",
    brand: "Apple",
  },
  {
    id: 7,
    name: "Xiaomi 13T Pro",
    price: 14990000,
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 78,
    category: "phone",
    brand: "Xiaomi",
  },
  {
    id: 8,
    name: "Samsung Galaxy A54",
    price: 9990000,
    originalPrice: 11990000,
    image:
      "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 234,
    badge: "sale" as const,
    category: "phone",
    brand: "Samsung",
  },

  // Laptop
  {
    id: 9,
    name: "MacBook Pro 14 M3 Pro",
    price: 49990000,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 156,
    badge: "hot" as const,
    category: "laptop",
    brand: "Apple",
  },
  {
    id: 10,
    name: "MacBook Air 15 M3",
    price: 32990000,
    image:
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 203,
    badge: "new" as const,
    category: "laptop",
    brand: "Apple",
  },
  {
    id: 11,
    name: "ASUS ROG Strix G16",
    price: 38990000,
    originalPrice: 42990000,
    image:
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 89,
    badge: "sale" as const,
    category: "laptop",
    brand: "ASUS",
  },
  {
    id: 12,
    name: "Dell XPS 15 OLED",
    price: 45990000,
    image:
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 67,
    category: "laptop",
    brand: "Dell",
  },
  {
    id: 13,
    name: "Lenovo ThinkPad X1 Carbon",
    price: 35990000,
    image:
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 112,
    category: "laptop",
    brand: "Lenovo",
  },
  {
    id: 14,
    name: "MacBook Pro 16 M3 Max",
    price: 89990000,
    image:
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 45,
    badge: "hot" as const,
    category: "laptop",
    brand: "Apple",
  },
  {
    id: 15,
    name: "ASUS ZenBook 14",
    price: 24990000,
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 156,
    category: "laptop",
    brand: "ASUS",
  },
  {
    id: 16,
    name: "Dell Inspiron 16",
    price: 18990000,
    originalPrice: 21990000,
    image:
      "https://images.unsplash.com/photo-1593642634315-48f5414c3ad9?w=400&h=400&fit=crop",
    rating: 4.3,
    reviewCount: 89,
    badge: "sale" as const,
    category: "laptop",
    brand: "Dell",
  },

  // Tablet
  {
    id: 17,
    name: "iPad Pro 12.9 M2",
    price: 28990000,
    image:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 178,
    badge: "hot" as const,
    category: "tablet",
    brand: "Apple",
  },
  {
    id: 18,
    name: "iPad Air 5",
    price: 15990000,
    image:
      "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 234,
    category: "tablet",
    brand: "Apple",
  },
  {
    id: 19,
    name: "Samsung Galaxy Tab S9 Ultra",
    price: 26990000,
    originalPrice: 29990000,
    image:
      "https://images.unsplash.com/photo-1632634684639-12d3b4a3a4a3?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 98,
    badge: "sale" as const,
    category: "tablet",
    brand: "Samsung",
  },
  {
    id: 20,
    name: "iPad Mini 6",
    price: 12990000,
    image:
      "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 167,
    category: "tablet",
    brand: "Apple",
  },
  {
    id: 21,
    name: "Samsung Galaxy Tab S8",
    price: 16990000,
    image:
      "https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=400&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 123,
    category: "tablet",
    brand: "Samsung",
  },

  // Phụ kiện
  {
    id: 22,
    name: "AirPods Pro 2",
    price: 5990000,
    image:
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 456,
    badge: "hot" as const,
    category: "accessory",
    brand: "Apple",
  },
  {
    id: 23,
    name: "Samsung Galaxy Buds 2 Pro",
    price: 3990000,
    originalPrice: 4990000,
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 189,
    badge: "sale" as const,
    category: "accessory",
    brand: "Samsung",
  },
  {
    id: 24,
    name: "MagSafe Charger",
    price: 990000,
    image:
      "https://images.unsplash.com/photo-1622552245445-d83e8a6b0e8c?w=400&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 312,
    category: "accessory",
    brand: "Apple",
  },
  {
    id: 25,
    name: "AirPods Max",
    price: 12990000,
    image:
      "https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 89,
    badge: "new" as const,
    category: "accessory",
    brand: "Apple",
  },
  {
    id: 26,
    name: "Apple Pencil 2",
    price: 3290000,
    image:
      "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 234,
    category: "accessory",
    brand: "Apple",
  },
  {
    id: 27,
    name: "Magic Keyboard",
    price: 7990000,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 145,
    category: "accessory",
    brand: "Apple",
  },
  {
    id: 28,
    name: "Samsung 45W Charger",
    price: 890000,
    image:
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 267,
    category: "accessory",
    brand: "Samsung",
  },

  // Đồng hồ thông minh
  {
    id: 29,
    name: "Apple Watch Ultra 2",
    price: 21990000,
    image:
      "https://images.unsplash.com/photo-1551816230-ef5deaed4a26?w=400&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 145,
    badge: "new" as const,
    category: "smartwatch",
    brand: "Apple",
  },
  {
    id: 30,
    name: "Apple Watch Series 9",
    price: 10990000,
    image:
      "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 267,
    category: "smartwatch",
    brand: "Apple",
  },
  {
    id: 31,
    name: "Samsung Galaxy Watch 6 Classic",
    price: 8990000,
    originalPrice: 10990000,
    image:
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 134,
    badge: "sale" as const,
    category: "smartwatch",
    brand: "Samsung",
  },
  {
    id: 32,
    name: "Apple Watch SE 2",
    price: 6990000,
    image:
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 312,
    category: "smartwatch",
    brand: "Apple",
  },
  {
    id: 33,
    name: "Samsung Galaxy Watch 6",
    price: 6490000,
    image:
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 178,
    category: "smartwatch",
    brand: "Samsung",
  },
  {
    id: 34,
    name: "Xiaomi Watch S3",
    price: 3490000,
    image:
      "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=400&h=400&fit=crop",
    rating: 4.3,
    reviewCount: 89,
    badge: "new" as const,
    category: "smartwatch",
    brand: "Xiaomi",
  },
];

const categories = [
  { value: "all", label: "Tất cả" },
  { value: "phone", label: "Điện thoại" },
  { value: "laptop", label: "Laptop" },
  { value: "tablet", label: "Tablet" },
  { value: "accessory", label: "Phụ kiện" },
  { value: "smartwatch", label: "Đồng hồ thông minh" },
];

const brands = ["Apple", "Samsung", "Xiaomi", "ASUS", "Dell", "Lenovo"];

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
  const [cartItemCount] = useState(3);
  const [sortBy, setSortBy] = useState("popular");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    0, 100000000,
  ]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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
    let filtered = [...allProducts];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by brands
    if (selectedBrands.length > 0) {
      filtered = filtered.filter((p) => selectedBrands.includes(p.brand));
    }

    // Filter by price range
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case "newest":
        filtered = filtered.sort((a, b) => b.id - a.id);
        break;
      case "price-asc":
        filtered = filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered = filtered.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filtered = filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        filtered = filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return filtered;
  }, [selectedCategory, selectedBrands, priceRange, sortBy]);

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
                  {selectedBrands.map((brand) => (
                    <span
                      key={brand}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {brand}
                      <button
                        onClick={() =>
                          setSelectedBrands(
                            selectedBrands.filter((b) => b !== brand)
                          )
                        }
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
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
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <ProductCard {...product} />
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

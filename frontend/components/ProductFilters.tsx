"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ProductFiltersProps {
  brands: string[];
  selectedBrands: string[];
  onBrandsChange: (brands: string[]) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  onClearFilters: () => void;
}

export default function ProductFilters({
  brands,
  selectedBrands,
  onBrandsChange,
  priceRange,
  onPriceRangeChange,
  onClearFilters,
}: ProductFiltersProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleBrandToggle = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      onBrandsChange(selectedBrands.filter((b) => b !== brand));
    } else {
      onBrandsChange([...selectedBrands, brand]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Price Range - Dual handle slider */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="font-semibold text-foreground mb-4">Khoảng giá</h3>
        <div className="space-y-4">
          <Slider
            value={[priceRange[0], priceRange[1]]}
            onValueChange={(value) => onPriceRangeChange([value[0], value[1]])}
            max={100000000}
            min={0}
            step={1000000}
            className="w-full"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 bg-secondary rounded-lg px-3 py-2 text-center">
              <span className="text-xs text-muted-foreground block">Từ</span>
              <span className="text-sm font-medium text-foreground">
                {formatPrice(priceRange[0])}
              </span>
            </div>
            <span className="text-muted-foreground">—</span>
            <div className="flex-1 bg-secondary rounded-lg px-3 py-2 text-center">
              <span className="text-xs text-muted-foreground block">Đến</span>
              <span className="text-sm font-medium text-foreground">
                {formatPrice(priceRange[1])}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Brands */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="font-semibold text-foreground mb-4">Thương hiệu</h3>
        <div className="space-y-3">
          {brands.map((brand) => (
            <div key={brand} className="flex items-center space-x-3">
              <Checkbox
                id={brand}
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => handleBrandToggle(brand)}
              />
              <Label
                htmlFor={brand}
                className="text-sm font-normal cursor-pointer text-foreground"
              >
                {brand}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <Button variant="outline" className="w-full" onClick={onClearFilters}>
        Xóa bộ lọc
      </Button>
    </div>
  );
}

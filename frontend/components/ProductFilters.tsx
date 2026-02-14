"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface BrandOption {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  brands: BrandOption[];
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

  const handleBrandToggle = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      onBrandsChange(selectedBrands.filter((id) => id !== brandId));
    } else {
      onBrandsChange([...selectedBrands, brandId]);
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
            <div key={brand.id} className="flex items-center space-x-3">
              <Checkbox
                id={brand.id}
                checked={selectedBrands.includes(brand.id)}
                onCheckedChange={() => handleBrandToggle(brand.id)}
              />
              <Label
                htmlFor={brand.id}
                className="text-sm font-normal cursor-pointer text-foreground"
              >
                {brand.name}
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

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategorySection from "@/components/CategorySection";
import FeaturedProducts from "@/components/FeaturedProducts";
import PromoBanner from "@/components/PromoBanner";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect admin to /admin
  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      router.push('/admin');
    }
  }, [loading, user, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show nothing while redirecting admin
  if (user?.role === 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <HeroBanner />
        <CategorySection />
        <FeaturedProducts />
        <PromoBanner />
      </main>

      <Footer />
    </div>
  );
}

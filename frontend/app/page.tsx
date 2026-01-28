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
import { Loader2 } from "lucide-react";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize state from localStorage or system preference
    const savedTheme = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
    return savedTheme === "dark" || (!savedTheme && prefersDark);
  });
  const [cartItemCount] = useState(3);
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect admin to /admin
  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      router.push('/admin');
    }
  }, [loading, user, router]);

  // Apply theme changes to DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

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
      <Header
        cartItemCount={cartItemCount}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

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

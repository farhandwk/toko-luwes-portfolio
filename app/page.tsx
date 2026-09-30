"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link"; 
import ProductCard from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, LayoutGrid, ShoppingBag, History, Settings, ChartArea, ChevronLeft, ChevronRight } from "lucide-react"; 
import { toast } from "sonner";
import { useCartStore } from "@/hooks/useCart"; 
import MobileSidebar from "@/components/MobileSidebar"; 
import { useDebounce } from 'use-debounce';

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // --- STATE PAGINASI & FILTER ---
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 500);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const limit = 20; // 20 produk per halaman agar grid 4x5 atau 5x4 tetap rapi

  // Helper untuk gambar agar ringan
  const optimizeCloudinaryUrl = (url: string) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/q_auto,f_auto,w_100/');
  };

  const { addItem } = useCartStore(); 

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Encode URI agar karakter spesial (spasi, dll) tidak merusak URL
      const searchParam = encodeURIComponent(searchQuery);
      const categoryParam = encodeURIComponent(selectedCategory);
      
      const [resProd, resAttr] = await Promise.all([
        fetch(`/api/products?page=${currentPage}&limit=${limit}&search=${searchParam}&category=${categoryParam}`),
        fetch('/api/attributes')
      ]);
      
      const dataProd = await resProd.json();
      const dataAttr = await resAttr.json();

      setProducts(dataProd.products || []);
      setTotalProducts(dataProd.total || 0);
      setCategories(dataAttr.categories || []);
      
    } catch (error) { 
      console.error(error); 
      setProducts([]); 
    } finally { 
      setIsLoading(false); 
    }
  }, [currentPage, debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- HANDLER CERDAS ---
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1); // Reset ke hal 1
    
    // LOGIKA RESET KATEGORI: Jika user mengetik, cari di semua kategori
    if (val.trim() !== "" && selectedCategory !== "Semua") {
      setSelectedCategory("Semua");
    }
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1); // Reset ke hal 1
    // Opsional: Hapus search jika pindah kategori
    // setSearchQuery(""); 
  };

  const totalPages = Math.ceil(totalProducts / limit);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* HEADER */}
      <header className="bg-white border-b shadow-sm z-10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full lg:w-auto">
              <div className="flex items-center gap-3">
                <div className="lg:hidden"><MobileSidebar onRefresh={fetchData} /></div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="h-6 w-6 text-primary" /> TOKO LUWES
                  </h1>
                  <p className="text-xs text-slate-500">Kasir Point of Sales</p>
                </div>
              </div>

              <nav className="hidden lg:flex flex-wrap items-center gap-1 ml-4 border-l pl-4">
                 <Link href="/transactions"><Button variant="ghost" className="text-slate-600 gap-2"><History className="h-4 w-4" /> Riwayat</Button></Link>
                 <Link href="/admin/products"><Button variant="ghost" className="text-slate-600 gap-2"><Settings className="h-4 w-4" /> Produk</Button></Link>
                 <Link href="/admin/analytics"><Button variant="ghost" className="text-slate-600 gap-2"><ChartArea className="h-4 w-4" /> Analytics</Button></Link>
                 <Link href="/admin/settings"><Button variant="ghost" className="text-slate-600 gap-2"><Settings className="h-4 w-4" /> Settings</Button></Link>
              </nav>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Cari barang..." 
                        className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all" 
                        value={searchQuery} 
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>
            </div>
          </div>

          {/* KATEGORI SCROLLABLE */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button 
              variant={selectedCategory === "Semua" ? "default" : "outline"} 
              size="sm" 
              onClick={() => handleCategoryChange("Semua")} 
              className="rounded-full px-4 flex-shrink-0"
            >
              Semua
            </Button>
            {categories.map((cat) => (
              <Button 
                key={cat.id} 
                variant={selectedCategory === cat.name ? "default" : "outline"} 
                size="sm" 
                onClick={() => handleCategoryChange(cat.name)} 
                className="rounded-full px-4 flex-shrink-0"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <div className="flex flex-1 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 lg:mr-[400px]">
          <div className="max-w-7xl mx-auto flex flex-col min-h-full">
            
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Mencari produk...</p>
              </div>
            ) : products.length > 0 ? (
              <>
                {/* GRID PRODUK */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 flex-1 items-start">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={addItem} />
                  ))}
                </div>

                {/* --- FOOTER PAGINASI ANGKA --- */}
                {totalProducts > limit && (
                  <div className="mt-10 mb-28 flex flex-col items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Hal <span className="text-primary">{currentPage}</span> dari {totalPages} — Total {totalProducts} Barang
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <Button 
                              key={page} 
                              variant={currentPage === page ? "default" : "outline"} 
                              size="sm" 
                              className="h-9 w-9 p-0 font-bold" 
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <span key={page} className="px-1 text-slate-400">...</span>;
                        }
                        return null;
                      })}

                      <Button variant="outline" size="icon" className="h-9 w-9" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* EMPTY STATE */
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center"><LayoutGrid className="h-8 w-8 text-slate-300" /></div>
                <p className="text-center px-4">Produk <span className="font-bold text-slate-600">"{searchQuery}"</span> tidak ada di kategori ini.</p>
                <Button variant="link" onClick={() => { handleSearchChange(""); handleCategoryChange("Semua"); }}>Tampilkan Semua Produk</Button>
              </div>
            )}
          </div>
        </main>
        
        {/* KERANJANG BELANJA (DESKTOP) */}
        <CartDrawer />
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, Tag, Ruler } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Input State
  const [newCat, setNewCat] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  // FETCH DATA
  // --- [REVISI FETCH DATA] ---
  async function fetchData() {
    try {
      // Cukup satu kali fetch karena API sudah mengirimkan paket lengkap
      const res = await fetch('/api/attributes');
      const data = await res.json();
      console.log("Data dari API:", data);

      if (res.ok) {
        // Ambil array dari dalam properti objek
        setCategories(data.categories || []);
        setUnits(data.units || []);
      } else {
        console.error("Gagal memuat atribut:", data.error);
        toast.error("Gagal mengambil data dari server");
      }
    } catch (e) { 
      console.error("Fetch Error:", e);
      toast.error("Terjadi kesalahan koneksi");
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { fetchData(); }, []);

  // --- [ADD & DELETE TETAP SAMA KARENA API POST/DELETE MASIH MENGGUNAKAN TYPE] ---
  const handleAdd = async (type: 'categories' | 'units', value: string) => {
      if (!value.trim()) return;
      setLoadingAction(true);
      try {
          const res = await fetch('/api/attributes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, name: value })
          });
          if (res.ok) {
              toast.success("Berhasil ditambah!");
              if (type === 'categories') setNewCat(""); else setNewUnit("");
              fetchData(); // Refresh data
          }
      } catch (e) { toast.error("Gagal simpan"); }
      finally { setLoadingAction(false); }
  };

  const handleDelete = async (type: 'categories' | 'units', id: string) => {
      if(!confirm("Yakin hapus?")) return;
      try {
          // DELETE tetap menggunakan query params sesuai route.ts yang baru
          const res = await fetch(`/api/attributes?type=${type}&id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success("Dihapus");
            fetchData(); // Refresh data
          } else {
            throw new Error();
          }
      } catch (e) { toast.error("Gagal hapus"); }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/">
            <Button variant="outline" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Pengaturan Master Data</h1>
            <p className="text-slate-500 text-sm">Kelola kategori dan satuan produk.</p>
        </div>
      </div>

      {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* --- KARTU KATEGORI --- */}
              <Card>
                  <CardHeader className="bg-blue-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                          <Tag className="h-5 w-5" /> Kategori Produk
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                      <div className="flex gap-2">
                          <Input 
                              placeholder="Nama Kategori Baru..." 
                              value={newCat} 
                              onChange={e => setNewCat(e.target.value)}
                          />
                          <Button disabled={loadingAction} onClick={() => handleAdd('categories', newCat)}>
                              <Plus className="h-4 w-4" />
                          </Button>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {categories.map((c) => (
                              <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border">
                                  <span className="font-medium">{c.name}</span>
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete('categories', c.id)}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>

              {/* --- KARTU SATUAN --- */}
              <Card>
                  <CardHeader className="bg-purple-50 border-b">
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                          <Ruler className="h-5 w-5" /> Satuan Barang
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                      <div className="flex gap-2">
                          <Input 
                              placeholder="Nama Satuan (Pcs, Slop)..." 
                              value={newUnit} 
                              onChange={e => setNewUnit(e.target.value)}
                          />
                          <Button disabled={loadingAction} className="bg-purple-600 hover:bg-purple-700" onClick={() => handleAdd('units', newUnit)}>
                              <Plus className="h-4 w-4" />
                          </Button>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {units.map((u) => (
                              <div key={u.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border">
                                  <span className="font-medium">{u.name}</span>
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete('units', u.id)}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>

          </div>
      )}
    </div>
  );
}
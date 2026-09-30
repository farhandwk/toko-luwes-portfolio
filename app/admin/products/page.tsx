"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { formatRupiah } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; 
import { toast } from "sonner";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, PackagePlus, Loader2, ArrowLeft, Image as ImageIcon, ChevronLeft, ChevronRight, Weight } from "lucide-react";
import { useDebounce } from 'use-debounce';

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]); 
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [unitsList, setUnitsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- STATE PAGINASI & FILTER ---
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 10;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false); 
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<Partial<any>>({});
  const [restockAmount, setRestockAmount] = useState<number | ''>('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Helper untuk gambar agar ringan
  const optimizeCloudinaryUrl = (url: string) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', '/upload/q_auto,f_auto,w_100/');
  };

  // --- FETCH DATA ---
  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const resProd = await fetch(
        `/api/products?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(categoryFilter)}`
      );
      const resAttr = await fetch('/api/attributes');
      
      const dataProd = await resProd.json();
      const { categories, units } = await resAttr.json();

      setProducts(dataProd.products || []);
      setTotalProducts(dataProd.total || 0); 
      setCategoriesList(categories || []);
      setUnitsList(units || []);
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, categoryFilter]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1); 
    if (val.trim() !== "") setCategoryFilter("Semua");
  };

  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
        toast.error("Nama, Harga, dan Kategori wajib diisi");
        return;
    }
    try {
        const method = isEditingMode ? 'PUT' : 'POST';
        const res = await fetch('/api/products', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (res.ok) {
            toast.success(isEditingMode ? "Produk diperbarui!" : "Produk berhasil ditambah!");
            setIsEditOpen(false);
            fetchAllData();
        }
    } catch (e) { toast.error("Gagal menyimpan produk"); }
  };

  const openAddModal = () => {
      setIsEditingMode(false);
      setFormData({ 
        name: "", price: "", stock: "", category_id: "", unit_id: 1, image: "", is_decimal: false 
      });
      setIsEditOpen(true);
  };

  const openEditModal = (p: any) => {
      setIsEditingMode(true);
      setFormData({
        ...p,
        // Pastikan dropdown menangkap ID yang benar dari DB
        category_id: p.category_id || p.categories?.id,
        unit_id: p.unitid || p.units?.id, 
        is_decimal: p.is_decimal || false 
      }); 
      setIsEditOpen(true);
  };

  const openRestockModal = (p: any) => {
    setSelectedProduct(p);
    setRestockAmount('');
    setIsRestockOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const data = await res.json();
        const imageUrl = data.secure_url || data.url;
        if (imageUrl) {
            setFormData(prev => ({ ...prev, image: imageUrl }));
            toast.success("Gambar berhasil diupload!");
        }
    } catch (error) { toast.error("Gagal upload gambar"); }
    finally { setIsUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Yakin hapus produk ini?")) return;
    try {
        await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        toast.success("Produk dihapus");
        fetchAllData();
    } catch (e) { toast.error("Gagal hapus"); }
  };

  const handleRestock = async () => {
    if (!selectedProduct || typeof restockAmount !== 'number' || restockAmount <= 0) {
        toast.error("Jumlah stok tidak valid"); return;
    }
    try {
        const res = await fetch('/api/products', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              row_id: selectedProduct.id,
              amount: restockAmount
             }),
        });
        if (res.ok) {
            toast.success(`Stok bertambah +${restockAmount}.`);
            setIsRestockOpen(false);
            setRestockAmount('');
            fetchAllData();
        }
    } catch (e) { toast.error("Gagal restock"); }
  };

  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
            <Link href="/"><Button variant="outline" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manajemen Produk</h1>
              <p className="text-xs text-slate-500">Kelola {totalProducts} produk toko.</p>
            </div>
        </div>
        <Button onClick={openAddModal} className="bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Button>
      </div>

      {/* FILTER BOX */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Cari produk..." 
              value={search} 
              onChange={(e) => handleSearchChange(e.target.value)} 
            />
        </div>
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Kategori" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="Semua">Semua Kategori</SelectItem>
                {categoriesList.map(c => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}
            </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin inline mr-2" /> Memuat...</TableCell></TableRow>
                ) : products.map((p) => (
                    <TableRow key={p.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                {/* KEMBALIKAN LOGIKA GAMBAR */}
                                {p.image ? (
                                    <img src={optimizeCloudinaryUrl(p.image)} alt={p.name} className="h-10 w-10 rounded object-cover border shadow-sm flex-shrink-0" />
                                ) : (
                                    <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 border flex-shrink-0">
                                        <ImageIcon className="h-4 w-4" />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        {/* FIX ERROR TITLE PADA WEIGHT */}
                                        {p.is_decimal && (
                                            <span title="Produk Timbangan" className="flex items-center">
                                                <Weight className="h-3.5 w-3.5 text-blue-500" />
                                            </span>
                                        )}
                                        <span className="font-medium">{p.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">{p.id}</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">{p.categories?.name || '-'}</span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{formatRupiah(p.price)}</TableCell>
                        <TableCell className="text-center">
                            <span className={`font-bold ${p.stock < 5 ? 'text-red-500' : 'text-slate-700'}`}>
                                {p.stock} {p.units?.name}
                            </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600" onClick={() => openRestockModal(p)}><PackagePlus className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => openEditModal(p)}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

        {/* PAGINASI */}
        {!isLoading && totalProducts > itemsPerPage && (
            <div className="flex justify-between items-center p-4 bg-slate-50 border-t">
                <div className="text-xs text-slate-500 font-medium">Hal {currentPage} dari {totalPages}</div>
                <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) && (
                            <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(page)}>{page}</Button>
                        )
                    ))}
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        )}
      </div>

      {/* --- MODAL TAMBAH / EDIT PRODUK --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditingMode ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nama Produk <span className="text-red-500">*</span></Label>
              <Input placeholder="Nama barang..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Kategori <span className="text-red-500">*</span></Label>
                <Select value={formData.category_id?.toString()} onValueChange={val => setFormData({...formData, category_id: parseInt(val)})}>
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {categoriesList.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Satuan</Label>
                <Select value={formData.unit_id?.toString()} onValueChange={val => setFormData({...formData, unit_id: parseInt(val)})}>
                  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                  <SelectContent>
                    {unitsList.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Harga Jual (Rp) <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="0" value={formData.price ?? ''} onChange={e => setFormData({...formData, price: e.target.value === '' ? '' : Number(e.target.value)})} />
              </div>
              <div className="grid gap-2">
                <Label>Stok</Label>
                <Input type="number" value={formData.stock} placeholder="0" onChange={e => setFormData({...formData, stock: e.target.value === '' ? '' : Number(e.target.value)})} disabled={isEditingMode} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4 bg-slate-50 shadow-sm border-blue-100">
                <div className="space-y-0.5">
                    <Label className="text-sm font-bold flex items-center gap-2">
                        Produk Timbangan? {formData.is_decimal && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase font-black italic">Aktif</span>}
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-tight">
                        Aktifkan untuk mengizinkan input desimal (Contoh: 1.5 kg).
                    </p>
                </div>
                <Switch 
                    checked={formData.is_decimal || false} 
                    onCheckedChange={(checked) => setFormData({ ...formData, is_decimal: checked })} 
                />
            </div>

            <div className="grid gap-2">
              <Label>Gambar Produk</Label>
              <div className="flex items-center gap-4">
                {formData.image && <img src={formData.image} className="w-12 h-12 object-cover rounded border shadow-sm" alt="Preview" />}
                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="text-xs cursor-pointer" />
                {isUploading && <Loader2 className="animate-spin h-4 w-4" />}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleSaveProduct} disabled={isUploading}>
              {isUploading ? 'Menunggu...' : 'Simpan Produk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL RESTOCK */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Tambah Stok</DialogTitle></DialogHeader>
            {selectedProduct && (
                <div className="space-y-4 py-4 text-sm">
                    <div className="bg-slate-50 p-3 rounded-md border">
                        <p className="font-bold text-slate-900">{selectedProduct.name}</p>
                        <p className="text-xs text-slate-500">Stok Saat Ini: {selectedProduct.stock} {selectedProduct.units?.name}</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Jumlah Tambahan</Label>
                        <Input type="number" placeholder="0" value={restockAmount} onChange={(e) => setRestockAmount(Number(e.target.value))} />
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsRestockOpen(false)}>Batal</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleRestock}>Konfirmasi</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
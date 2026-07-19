"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useCartStore } from '@/hooks/useCart';
import { formatRupiah } from '@/utils/currency';
import { getWIBDate } from '@/utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"; 
import { Trash2, ShoppingCart, Plus, Minus, Loader2, Send, Share2, Download, Printer, Weight } from 'lucide-react'; 
import { toast } from "sonner";
import { toPng } from 'html-to-image';
import { useReactToPrint } from 'react-to-print'; 
import Receipt from './Receipt';

interface CartDrawerProps {
  onCheckoutSuccess?: () => void;
  className?: string; 
}

const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckoutSuccess, className }) => {
  const { items, addItem, decreaseQty, removeItem, clearCart, totalPrice, updateQty } = useCartStore();
  
  // Memastikan subtotal dibulatkan (menghindari error angka desimal JS)
  const subTotal = Math.round(totalPrice());
  
  // STATE INPUT
  const [discount, setDiscount] = useState<number | ''>('');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const finalTotal = subTotal - (Number(discount) || 0);

  // STATE LAINNYA
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptData, setReceiptData] = useState({ id: '', date: '' });
  const receiptRef = useRef<HTMLDivElement>(null);

  const [receiptBlob, setReceiptBlob] = useState<Blob | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [lastTxId, setLastTxId] = useState(""); 
  
  const [isMounted, setIsMounted] = useState(false);

  // STATE SNAPSHOT (Riwayat setelah checkout)
  const [lastItems, setLastItems] = useState<any[]>([]);
  const [lastSubTotal, setLastSubTotal] = useState(0);
  const [lastDiscount, setLastDiscount] = useState(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState("Cash");
  const [lastCashReceived, setLastCashReceived] = useState(0);
  const [lastChange, setLastChange] = useState(0);

  const isAndroid = () => {
  if (typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent.toLowerCase();
  const isAndroidUA = ua.includes("android");
  
  // Deteksi Tablet yang mengaku Desktop: 
  // Biasanya mengaku Macintosh tapi punya Touch Points lebih dari 0
  const isTabletDesktopMode = 
    (ua.includes("macintosh") || ua.includes("linux")) && 
    navigator.maxTouchPoints > 0;

  return isAndroidUA || isTabletDesktopMode;
};

  // Hitung kembalian
  const change = (paymentMethod === "Cash" && typeof cashReceived === 'number') ? cashReceived - finalTotal : 0;

  const isPaymentValid = () => {
    if (items.length === 0) return false;
    if (Number(discount) > subTotal) return false;
    if (paymentMethod === "Cash") {
        return (typeof cashReceived === 'number' && cashReceived >= finalTotal);
    }
    return true;
  };

  useEffect(() => {
    setIsMounted(true);
    setReceiptData({ id: `TRX-${Date.now()}`, date: getWIBDate() });
  }, [isOpen]);

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setDiscount(val === '' ? '' : Number(val));
  };

  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCashReceived(val === '' ? '' : Number(val));
  };

  const handlePrintPC = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Struk-${lastTxId}`,
    onAfterPrint: () => toast.success("Perintah cetak dikirim!"),
  });

  const handlePrintMobile = () => {
    if (!receiptBlob) { toast.error("Sedang memproses gambar struk..."); return; }
    const reader = new FileReader();
    reader.readAsDataURL(receiptBlob);
    reader.onloadend = () => {
        const base64data = reader.result as string;
        const cleanBase64 = base64data.split(',')[1];
        const rawbtUrl = `rawbt:data:image/png;base64,${cleanBase64}`;
        window.location.href = rawbtUrl;
    };
  };

  const handleDownloadImage = () => {
    if (!receiptBlob) { toast.error("Struk belum siap"); return; }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(receiptBlob);
    link.download = `struk-${lastTxId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Struk tersimpan!");
  };

  const handleOpenWhatsApp = async () => {
    if (!receiptBlob) { toast.error("Gagal memuat gambar struk"); return; }
    let phone = manualPhone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    
    const rawMessage = `Terima kasih sudah berbelanja di Toko Luwes.\nBerikut struk transaksinya 👇`;
    const encodedMessage = encodeURIComponent(rawMessage);
    const waUrl = phone ? `https://wa.me/${phone}?text=${encodedMessage}` : `https://wa.me/?text=${encodedMessage}`;

    const file = new File([receiptBlob], `struk-${lastTxId}.png`, { type: "image/png" });
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Struk Belanja', text: rawMessage }); } 
        catch (error) { console.log("Share dibatalkan"); }
    } else { 
        window.open(waUrl, '_blank'); 
        toast.info("WhatsApp terbuka!"); 
    }
  };

  const handleCheckout = async () => {
    if (!isPaymentValid()) return;
    setIsLoading(true);
    try {
      if (receiptRef.current) {
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          const dataUrl = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#ffffff', filter: (node: any) => (node.tagName !== 'LINK'), skipFonts: true } as any);
          const res = await fetch(dataUrl);
          setReceiptBlob(await res.blob());
        } catch (imgError) { console.error("Gagal generate gambar:", imgError); }
      }
      
      // SINKRONISASI PAYLOAD DENGAN NAMA KOLOM SUPABASE (snake_case)
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items, 
          total_price: finalTotal, 
          payment_method: paymentMethod, 
          date: receiptData.date, 
          cash_amount: Number(cashReceived) || 0, // Sesuai kolom DB
          change_amount: Number(change) || 0    // Sesuai kolom DB
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Transaksi Sukses!");
        setLastTxId(result.transactionId || receiptData.id);
        setLastItems(items); 
        setLastSubTotal(subTotal); 
        setLastDiscount(Number(discount) || 0); 
        setLastPaymentMethod(paymentMethod); 
        setLastCashReceived(Number(cashReceived) || 0); 
        setLastChange(change);
        
        setShowSuccessDialog(true); 
        clearCart(); 
        setCashReceived(''); 
        setDiscount('');
        if (onCheckoutSuccess) onCheckoutSuccess();
      } else { throw new Error(result.error); }
    } catch (error: any) { console.error(error); toast.error(error.message); } finally { setIsLoading(false); }
  };

  if (!isMounted) return <div className={className}></div>;

  return (
    <div className={className}>
      
      {/* --- TAMPILAN MOBILE --- */}
      <div className="lg:hidden"> 
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <div className='fixed bottom-6 left-0 w-full flex justify-center z-40 px-4'>
                <DialogTrigger asChild>
                    <Button className="w-full h-14 text-lg rounded-full shadow-2xl bg-primary hover:bg-primary/90 flex items-center justify-between px-6">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-6 w-6" />
                            <span className="font-bold">{formatRupiah(finalTotal)}</span>
                        </div>
                        <div className="bg-white text-primary text-xs font-bold px-2 py-1 rounded-full">
                          {items.reduce((acc, item) => acc + (item.is_decimal ? 1 : item.qty), 0)} Item
                        </div>
                    </Button>
                </DialogTrigger>
            </div>
            <DialogContent className="sm:max-w-lg w-[95%] rounded-xl flex flex-col max-h-[85vh] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 border-b bg-slate-50 flex-shrink-0">
                    <DialogTitle className="font-bold flex items-center gap-2 text-base"><ShoppingCart className="h-5 w-5" /> Keranjang Belanja</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm">Keranjang kosong.</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 text-sm">
                                <div className="flex-1">
                                    <p className="font-semibold line-clamp-1">{item.name}</p>
                                    <p className="text-xs text-gray-500">{formatRupiah(item.price)} / {item.units?.name || 'unit'}</p>
                                </div>
                                <div className="flex items-center gap-1 mx-2">
                                    {item.is_decimal ? (
                                        <div className="flex items-center gap-1.5 bg-white border rounded-md px-2 py-1 shadow-sm h-9">
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                value={item.qty} 
                                                onChange={(e) => updateQty(item.id, parseFloat(e.target.value) || 0)}
                                                className="w-16 h-7 text-right font-mono font-bold text-xs p-0 border-none focus-visible:ring-0"
                                            />
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{item.units?.name || 'kg'}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => decreaseQty(item.id)}><Minus className="h-3 w-3" /></Button>
                                            <input 
                                                type="number"
                                                inputMode="numeric"
                                                value={item.qty === 0 ? '' : item.qty} 
                                                onChange={(e) => {
                                                    // Ambil nilai integer dari ketikan user
                                                    const val = parseInt(e.target.value, 10);
                                                    // Gunakan fungsi updateQty yang sudah ada di store Boss
                                                    updateQty(item.id, isNaN(val) ? 0 : val);
                                                }}
                                                onBlur={(e) => {
                                                    // Jika user meninggalkan input dalam keadaan kosong atau 0, 
                                                    // otomatis kembalikan ke angka 1 agar tidak error
                                                    if (!e.target.value || parseInt(e.target.value, 10) <= 0) {
                                                        updateQty(item.id, 1); 
                                                    }
                                                }}
                                                // Kelas Tailwind di bawah ini berfungsi melucuti desain input agar tampak seperti span
                                                className="font-bold w-8 text-center text-xs bg-transparent border-none p-0 focus:outline-none focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none appearance-none"
                                            />
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => addItem(item)}><Plus className="h-3 w-3" /></Button>
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))
                    )}
                </div>

                <div className="bg-slate-50 p-4 space-y-4 border-t flex-shrink-0">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Diskon (Rp)</Label>
                            <Input type="number" placeholder="0" value={discount} onChange={handleDiscountChange} className="font-mono h-9 text-sm"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase">Metode Pembayaran</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Tunai (Cash)</SelectItem>
                                <SelectItem value="QRIS">QRIS</SelectItem>
                                <SelectItem value="Transfer">Transfer Bank</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {paymentMethod === "Cash" && (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Uang Diterima</Label>
                            <Input type="number" placeholder="0" value={cashReceived} onChange={handleCashChange} className="text-right text-lg font-mono font-bold h-10 border-blue-200 focus:border-blue-500" />
                        </div>
                    )}
                    <div className="space-y-1 pt-2 border-t">
                        <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatRupiah(subTotal)}</span></div>
                        {Number(discount) > 0 && (<div className="flex justify-between text-sm text-red-500"><span>Diskon</span><span>- {formatRupiah(Number(discount))}</span></div>)}
                        {paymentMethod === "Cash" && (<div className="flex justify-between text-sm font-medium text-green-600"><span>Kembalian</span><span>{formatRupiah(change < 0 ? 0 : change)}</span></div>)}
                        <div className="flex justify-between items-center text-lg font-bold pt-2"><span>Total</span><span className="text-primary">{formatRupiah(finalTotal)}</span></div>
                    </div>
                    <Button className="w-full h-10 text-base font-bold shadow-sm" disabled={!isPaymentValid() || isLoading} onClick={handleCheckout}>
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : `Bayar ${formatRupiah(finalTotal)}`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      {/* --- TAMPILAN DESKTOP --- */}
      <div className="hidden lg:flex flex-col absolute top-4 right-4 w-96 bg-white rounded-xl border shadow-2xl z-50 max-h-[78vh]">
          <div className="p-3 border-b bg-slate-50 flex justify-between items-center flex-shrink-0">
            <h2 className="font-bold flex items-center gap-2 text-sm"><ShoppingCart className="h-4 w-4" /> Keranjang Belanja</h2>
             {items.length > 0 && (<Button variant="ghost" size="sm" className="h-8 text-xs text-red-500 hover:bg-red-50" onClick={() => {if(confirm('Kosongkan keranjang?')) clearCart()}}>Kosongkan</Button>)}
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
                {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">Keranjang kosong.</p>
                </div>
                ) : (
                items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 text-sm">
                        <div className="flex-1">
                            <p className="font-semibold line-clamp-1">{item.name}</p>
                            <p className="text-xs text-gray-500">{formatRupiah(item.price)} / {item.units?.name || 'unit'}</p>
                        </div>
                        <div className="flex items-center gap-1 mx-2">
                            {item.is_decimal ? (
                                <div className="flex items-center gap-1.5 bg-white border rounded-md px-2 py-1 shadow-sm h-8">
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        value={item.qty} 
                                        onChange={(e) => updateQty(item.id, parseFloat(e.target.value) || 0)}
                                        className="w-16 h-6 text-right font-mono font-bold text-xs p-0 border-none focus-visible:ring-0"
                                    />
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{item.units?.name || 'kg'}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => decreaseQty(item.id)}><Minus className="h-3 w-3" /></Button>
                                    <input 
                                        type="number"
                                        inputMode="numeric"
                                        value={item.qty === 0 ? '' : item.qty} 
                                        onChange={(e) => {
                                            // Ambil nilai integer dari ketikan user
                                            const val = parseInt(e.target.value, 10);
                                            // Gunakan fungsi updateQty yang sudah ada di store Boss
                                            updateQty(item.id, isNaN(val) ? 0 : val);
                                        }}
                                        onBlur={(e) => {
                                            // Jika user meninggalkan input dalam keadaan kosong atau 0, 
                                            // otomatis kembalikan ke angka 1 agar tidak error
                                            if (!e.target.value || parseInt(e.target.value, 10) <= 0) {
                                                updateQty(item.id, 1); 
                                            }
                                        }}
                                        // Kelas Tailwind di bawah ini berfungsi melucuti desain input agar tampak seperti span
                                        className="font-bold w-8 text-center text-xs bg-transparent border-none p-0 focus:outline-none focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none appearance-none"
                                    />
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => addItem(item)}><Plus className="h-3 w-3" /></Button>
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))
                )}
            </div>
          
          <div className="bg-slate-50 p-4 space-y-4 border-t flex-shrink-0">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Diskon (Rp)</Label>
                    <Input type="number" placeholder="0" value={discount} onChange={handleDiscountChange} className="font-mono h-9 text-sm"/>
                </div>
            </div>
            <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Cash">Tunai (Cash)</SelectItem>
                        <SelectItem value="QRIS">QRIS</SelectItem>
                        <SelectItem value="Transfer">Transfer Bank</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {paymentMethod === "Cash" && (
                <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Uang Diterima</Label>
                    <Input type="number" placeholder="0" value={cashReceived} onChange={handleCashChange} className="text-right text-lg font-mono font-bold h-10 border-blue-200 focus:border-blue-500" />
                </div>
            )}
            <div className="space-y-1 pt-2 border-t">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatRupiah(subTotal)}</span></div>
                {Number(discount) > 0 && (<div className="flex justify-between text-sm text-red-500"><span>Diskon</span><span>- {formatRupiah(Number(discount))}</span></div>)}
                {paymentMethod === "Cash" && (<div className="flex justify-between text-sm font-medium text-green-600"><span>Kembalian</span><span>{formatRupiah(change < 0 ? 0 : change)}</span></div>)}
                <div className="flex justify-between items-center text-lg font-bold pt-2"><span>Total</span><span className="text-primary">{formatRupiah(finalTotal)}</span></div>
            </div>
            <Button className="w-full h-10 text-base font-bold shadow-sm" disabled={!isPaymentValid() || isLoading} onClick={handleCheckout}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : `Bayar ${formatRupiah(finalTotal)}`}
            </Button>
          </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md w-[90%] rounded-xl">
            <DialogHeader><DialogTitle className="text-center">Transaksi Berhasil!</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <Label className="text-xs text-slate-500 mb-1.5 block font-bold uppercase">
            Nomor WhatsApp Pelanggan
        </Label>
        <div className="flex gap-2">
            <Input 
                placeholder="08xxxxxxxxxx" 
                value={manualPhone} 
                onChange={(e) => setManualPhone(e.target.value)} 
            />
            <Button variant="outline" onClick={handleDownloadImage} title="Download">
                <Download className="h-4 w-4" />
            </Button>
        </div>
    </div>

    <div className="grid grid-cols-2 gap-3 pt-2">
        {/* Tombol Cetak Utama (Dinamis) */}
        <Button 
            variant="outline" 
            className="h-16 flex flex-col" 
            onClick={isAndroid() ? handlePrintMobile : () => handlePrintPC()}
        >
            <Printer className={isAndroid() ? "h-5 w-5 text-blue-600" : "h-5 w-5"} />
            <span className="text-xs">{isAndroid() ? "Cetak BT" : "Cetak USB"}</span>
        </Button>

        {/* Tombol Kirim WA */}
        <Button 
            className="h-16 flex flex-col bg-green-600" 
            onClick={handleOpenWhatsApp}
        >
            <Share2 className="h-5 w-5" />
            <span className="text-xs text-white">Kirim WA</span>
        </Button>
        
        {/* Tombol Cadangan jika deteksi otomatis meleset */}
        <Button 
            variant="ghost" 
            className="col-span-2 text-[10px] h-6 opacity-50"
            onClick={handlePrintMobile}
        >
            Gunakan Jalur RawBT (Jika tombol utama gagal)
        </Button>
    </div>
</div>
            <DialogFooter className="sm:justify-center"><Button variant="ghost" onClick={() => { setShowSuccessDialog(false); setIsOpen(false); }}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div style={{ position: 'fixed', top: 0, left: '-9999px', zIndex: -50 }}>
        <Receipt 
            ref={receiptRef} 
            items={items.length > 0 ? items : lastItems} 
            subtotal={items.length > 0 ? subTotal : lastSubTotal} 
            total={items.length > 0 ? finalTotal : (lastSubTotal - lastDiscount)} 
            discount={items.length > 0 ? (Number(discount) || 0) : lastDiscount} 
            paymentMethod={items.length > 0 ? paymentMethod : lastPaymentMethod} 
            cashAmount={items.length > 0 ? (Number(cashReceived) || 0) : lastCashReceived} 
            changeAmount={items.length > 0 ? change : lastChange} 
            date={receiptData.date} 
            id={lastTxId || receiptData.id} 
        />
      </div>
    </div>
  );
};

export default CartDrawer;
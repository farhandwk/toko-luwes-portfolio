import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 1. Ambil Parameter
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const payment_method = searchParams.get('payment_method') || 'Semua';
    const start_date = searchParams.get('start_date'); 
    const end_date = searchParams.get('end_date');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 2. Bangun Kueri (Pilih kolom snake_case)
    let query = supabaseAdmin
      .from('transactions')
      .select('id, date, items, total_price, payment_method, cash_amount, change_amount, inserted_at', { count: 'exact' });

    // 3. Filter Search
    if (search) {
      query = query.ilike('id', `%${search}%`);
    }

    // 4. Filter Metode Bayar
    if (payment_method !== 'Semua') {
      query = query.eq('payment_method', payment_method);
    }

    // 5. Filter Tanggal
    if (start_date) {
      query = query.gte('inserted_at', start_date);
    }
    if (end_date) {
      // Tambahkan waktu akhir hari agar pencarian hingga detik terakhir
      query = query.lte('inserted_at', `${end_date}T23:59:59`);
    }

    // 6. Eksekusi
    const { data, error, count } = await query
      .order('inserted_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // 7. Mapping Data untuk Frontend
    const transactions = data.map((trx) => ({
      id: trx.id,
      date: trx.date,
      items: trx.items,
      total_price: trx.total_price,
      payment_method: trx.payment_method,
      cash_amount: trx.cash_amount,     // Penting untuk struk
      change_amount: trx.change_amount, // Penting untuk struk
    }));

    return NextResponse.json({
      transactions,
      total: count, // Ini yang dibaca frontend untuk tulisan "Total X transaksi"
      page,
      limit
    });

  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
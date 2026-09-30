import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@/lib/supabase-server';
import { error } from 'console';

// 1. GET: Ambil Produk (Sinkron dengan tabel baru)
export async function GET(req: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) return NextResponse.json({ error: "User belum login" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'Semua';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Ambil id (angka), name, price, stock, is_decimal, dan relasi
    let query = supabaseAdmin
      .from('products')
      .select('*, units(name), categories!inner(name)', { count: 'exact' });

    if (search) query = query.ilike('name', `%${search}%`);
    if (category !== 'Semua') query = query.eq('categories.name', category);

    const { data: products, error, count } = await query
      .order('id', { ascending: false }) // Urutkan berdasarkan ID terbaru
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({ products, total: count, page, limit });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal ambil data' }, { status: 500 });
  }
}

// 2. POST: Tambah Produk (ID Otomatis oleh Supabase)
export async function POST(req: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return NextResponse.json({ error: "User belum login" }, { status: 401 });

    const body = await req.json();
    const { name, price, category_id, unit_id, image, stock, is_decimal } = body;

    // JANGAN generate ID manual lagi (PROD-xxx). Hapus baris ID lama.
    const { error } = await supabaseAdmin
      .from('products')
      .insert([{
        name,
        price: Number(price), // Pastikan angka
        stock: Number(stock), // Pastikan angka
        image,
        category_id: Number(category_id), 
        unitid: Number(unit_id) || 3, // Sesuai kolom DB (tanpa underscore)
        is_decimal: is_decimal ?? false
        // id dan old_id dikosongkan agar diisi otomatis/default
      }]);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal tambah produk: ' + error.message }, { status: 500 });
  }
}

// 3. PUT: Edit Produk (Targetkan ID Angka)
export async function PUT(req: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return NextResponse.json({ error: "User belum login" }, { status: 401 });

    const body = await req.json();
    const { id, name, price, category_id, unit_id, image, stock, is_decimal } = body;

    const { error } = await supabaseAdmin
      .from('products')
      .update({
        name,
        price: Number(price),
        stock: Number(stock),
        image,
        category_id: Number(category_id),
        unitid: Number(unit_id) || 3,
        is_decimal: is_decimal ?? false
      })
      .eq('id', Number(id)); // Pastikan ID dikonversi ke Angka

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Gagal update produk: ' + error.message }, { status: 500 });
  }
}

// Function untuk restock satu produk
export async function PATCH(req: Request) {
  try {
    const supabaseServer = await createClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) return NextResponse.json({ error: "User belum login!" }, { status: 401 })
    
    const body = await req.json()
    const { row_id, amount } = body

    if (!row_id || amount === undefined) {
      return NextResponse.json({error: "Data tidak lengkap!"}, { status: 400 })
    }

    const { error: restockError } = await supabaseAdmin.rpc('increment_stock', {
      row_id: Number(row_id),
      amount: Number(amount)
    })

    if (restockError) {
      throw restockError
    }
    return NextResponse.json({ success: true })
  }
  catch (error) {
    console.error("PATCH error!!")
    return NextResponse.json({ error: "Gagal Restock Produk!!" }, { status: 500 })
  }
}

// 4. DELETE: Hapus Produk
export async function DELETE(req: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return NextResponse.json({ error: "User belum login" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID tidak ditemukan" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', Number(id)); // Konversi ke Angka

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal hapus produk: ' + error.message }, { status: 500 });
  }
}
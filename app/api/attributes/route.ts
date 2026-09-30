// app/api/attributes/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@/lib/supabase-server';

// 1. GET: Ambil Semua Atribut (Categories & Units) Sekaligus
export async function GET() {
  try {
    // Menjalankan kueri bersamaan (Parallel)
    const [categoriesRes, unitsRes] = await Promise.all([
      supabaseAdmin.from('categories').select('id, name').order('name', { ascending: true }),
      supabaseAdmin.from('units').select('id, name').order('name', { ascending: true })
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (unitsRes.error) throw unitsRes.error;

    return NextResponse.json({
      categories: categoriesRes.data || [],
      units: unitsRes.data || []
    });
  } catch (error) {
    console.error("API GET Error:", error);
    return NextResponse.json({ error: 'Gagal mengambil data atribut' }, { status: 500 });
  }
}

// 2. POST: Tambah Atribut Baru
export async function POST(request: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User belum login" }, { status: 401 });
    }

    const body = await request.json();
    const { type, name } = body; 

    if (!name || (type !== 'categories' && type !== 'units')) {
      return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(type)
      .insert([{ name }]) // Supabase akan otomatis isi id (int8)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("API POST Error:", error);
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}

// 3. DELETE: Hapus Atribut
export async function DELETE(request: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "User belum login" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id || (type !== 'categories' && type !== 'units')) {
      return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from(type)
      .delete()
      .eq('id', id); // ID di sini akan dicocokkan dengan int8 di database

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API DELETE Error:", error);
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 });
  }
}
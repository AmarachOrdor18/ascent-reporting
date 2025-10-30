import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> } // ✅ Next.js 15+ requires Promise-wrapped params
) {
  const { name } = await context.params; // ✅ unwrap the promise

  try {
    const datasourceName = name;
    const searchParams = request.nextUrl.searchParams;
    const tableType = searchParams.get('table') || 'ACTIVE'; // RAW, ACTIVE, or HIST
    const limit = parseInt(searchParams.get('limit') || '100');

    const tableName = `${datasourceName}_${tableType}`;
    const supabase = getSupabaseClient();

    // ✅ Fetch data
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      tableName,
      data: data || [],
      count: count || 0,
      limit,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preview' },
      { status: 500 }
    );
  }
}

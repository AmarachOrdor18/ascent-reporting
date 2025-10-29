import { NextResponse, NextRequest } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await params since it's now a Promise in Next.js 16
    const { id } = await context.params;
    const { datasourceName } = await request.json();

    const supabase = getSupabaseClient();

    // Get update type
    const { data: dsData, error: dsError } = await supabase
      .from('data_sources')
      .select('datasource_update_type')
      .eq('datasource_name', datasourceName)
      .single();

    if (dsError || !dsData) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    const updateType = dsData.datasource_update_type;

    // Call the admit function via RPC
    const { data, error } = await supabase.rpc('admit_data', {
      p_datasource_name: datasourceName,
      p_update_type: updateType
    });

    if (error) throw error;

    const rowsAffected = data || 0;

    // Reset lobby count
    await supabase
      .from('data_sources')
      .update({ lobby: 0 })
      .eq('datasource_name', datasourceName);

    // Log to audit
    await supabase.from('audit_log').insert({
      action_type: 'ADMIT_DATA',
      table_name: datasourceName,
      user_name: 'CONTI',
      details: { rows_affected: rowsAffected, update_type: updateType }
    });

    return NextResponse.json({
      success: true,
      rowsAffected,
      message: `Successfully admitted ${rowsAffected} rows to active table`
    });
  } catch (error: any) {
    console.error('Admit error:', error);
    return NextResponse.json({ error: error.message || 'Admit failed' }, { status: 500 });
  }
}

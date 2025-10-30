import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Promise wrapped
) {
  const { id } = await context.params; // ✅ await the Promise

  try {
    const { datasourceName } = await request.json();
    const supabase = getSupabaseClient();

    const rawTable = `${datasourceName}_RAW`;
    const activeTable = `${datasourceName}_ACTIVE`;

    // ✅ Get update type
    const { data: dsData, error: dsError } = await supabase
      .from('data_sources')
      .select('datasource_update_type')
      .eq('datasource_name', datasourceName)
      .single();

    if (dsError || !dsData) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    const updateType = dsData.datasource_update_type;

    // ✅ Count rows in RAW
    const { count: rawCount, error: countError } = await supabase
      .from(rawTable)
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    if (!rawCount || rawCount === 0) {
      return NextResponse.json(
        { error: 'No data in RAW table to admit' },
        { status: 400 }
      );
    }

    // ✅ If REPLACE, clear ACTIVE table first
    if (updateType === 'REPLACE') {
      const { error: deleteError } = await supabase
        .from(activeTable)
        .delete()
        .neq('id', 0);

      if (deleteError) {
        // Fallback delete all manually
        const { data: allRows } = await supabase.from(activeTable).select('id');
        if (allRows?.length) {
          await supabase.from(activeTable).delete().in('id', allRows.map(r => r.id));
        }
      }
    }

    // ✅ Get all data from RAW
    const { data: rawData, error: fetchError } = await supabase
      .from(rawTable)
      .select('*');

    if (fetchError) throw fetchError;

    // ✅ Insert into ACTIVE
    const { error: insertError } = await supabase
      .from(activeTable)
      .insert(rawData || []);

    if (insertError) throw insertError;

    // ✅ Clear RAW table
    const { error: clearError } = await supabase
      .from(rawTable)
      .delete()
      .neq('id', 0);

    if (clearError && rawData?.length) {
      await supabase.from(rawTable).delete().in('id', rawData.map(r => r.id));
    }

    // ✅ Reset lobby count
    await supabase
      .from('data_sources')
      .update({ lobby: 0 })
      .eq('datasource_name', datasourceName);

    // ✅ Log to audit
    await supabase.from('audit_log').insert({
      action_type: 'ADMIT_DATA',
      table_name: datasourceName,
      user_name: 'CONTI',
      details: { rows_affected: rawCount, update_type: updateType }
    });

    return NextResponse.json({
      success: true,
      rowsAffected: rawCount,
      message: `Successfully admitted ${rawCount} rows for ${datasourceName} (ID: ${id})`
    });
  } catch (error: any) {
    console.error('Admit error:', error);
    return NextResponse.json(
      { error: error.message || 'Admit failed' },
      { status: 500 }
    );
  }
}

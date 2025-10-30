import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

// ===============================
// GET: Fetch all active SQL views
// ===============================
export async function GET() {
  const supabase = getSupabaseClient();

  try {
    // Fetch active views and join dataset names
    const { data, error } = await supabase
      .from('sql_views')
      .select(`
        view_id,
        view_name,
        view_definition,
        dataset_id,
        data_sets (dataset_name),
        created_at,
        created_by,
        is_active
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error('Error fetching views:', error);
    return NextResponse.json(
      { error: 'Failed to fetch views' },
      { status: 500 }
    );
  }
}

// ===============================
// POST: Create a new SQL view
// ===============================
export async function POST(request: Request) {
  const supabase = getSupabaseClient();

  try {
    const { viewName, viewDefinition, datasetId } = await request.json();

    // 1️⃣ Create the SQL view directly via RPC (optional)
    const { error: execError } = await supabase.rpc('exec_sql', {
      query: viewDefinition,
    });

    if (execError) throw execError;

    // 2️⃣ Register metadata in sql_views table
    const { error: insertError } = await supabase
      .from('sql_views')
      .insert([
        {
          view_name: viewName,
          view_definition: viewDefinition,
          dataset_id: datasetId,
          created_by: 'CONTI',
        },
      ]);

    if (insertError) throw insertError;

    return NextResponse.json(
      {
        success: true,
        message: 'View created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating view:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create view' },
      { status: 500 }
    );
  }
}

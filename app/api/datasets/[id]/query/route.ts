import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // ✅ Next.js expects a Promise
) {
  const resolvedParams = await context.params; // unwrap the Promise
  const datasetId = resolvedParams.id;

  try {
    const supabase = getSupabaseClient();

    // Get dataset info
    const { data: dataset, error: dsError } = await supabase
      .from('data_sets')
      .select('dataset_id, dataset_name, dataset_description')
      .eq('dataset_id', datasetId)
      .single();

    if (dsError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Get associated views
    const { data: views, error: viewsError } = await supabase
      .from('sql_views')
      .select('view_name')
      .eq('dataset_id', datasetId)
      .eq('is_active', true);

    if (viewsError) throw viewsError;

    const qry02View = views?.find(v => v.view_name.endsWith('_QRY02'));

    if (!qry02View) {
      return NextResponse.json(
        { error: 'No query view found for this dataset' },
        { status: 404 }
      );
    }

    // Execute query using RPC
    const { data: reportData, error: queryError } = await supabase.rpc('query_view', {
      view_name: qry02View.view_name
    });

    if (queryError) throw queryError;

    return NextResponse.json({
      dataset,
      viewName: qry02View.view_name,
      data: reportData || [],
      rowCount: reportData?.length || 0,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Dataset query error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to query dataset' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // Next.js expects params as Promise
) {
  try {
    // Await the params promise
    const { id: datasetId } = await context.params;
    const searchParams = request.nextUrl.searchParams;

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000'); // Default 1000 rows per page
    const offset = (page - 1) * limit;

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

    if (viewsError) {
      throw viewsError;
    }

    const qry02View = views?.find(v => v.view_name.endsWith('_QRY02'));

    if (!qry02View) {
      return NextResponse.json({ error: 'No query view found for this dataset' }, { status: 404 });
    }

    console.log(`Querying ${qry02View.view_name} with pagination: page=${page}, limit=${limit}`);

    // Get total count (optional caching)
    const { count, error: countError } = await supabase
      .from(qry02View.view_name)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.warn('Count query failed:', countError);
    }

    // Get paginated data
    const { data: reportData, error: queryError } = await supabase
      .from(qry02View.view_name)
      .select('*')
      .range(offset, offset + limit - 1);

    if (queryError) {
      throw queryError;
    }

    const totalPages = count ? Math.ceil(count / limit) : 1;

    // Return JSON response
    return NextResponse.json({
      dataset,
      viewName: qry02View.view_name,
      data: reportData || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
      },
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

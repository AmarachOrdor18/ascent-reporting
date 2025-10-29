import { NextResponse } from 'next/server';
import { getSupabaseClient, getTable } from '@/lib/db';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('datasource_created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching data sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data sources' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      datasource_id, 
      datasource_name, 
      datasource_description,
      datasource_update_type,
      columns 
    } = body;

    // Validate datasource name starts with DS_
    if (!datasource_name.startsWith('DS_')) {
      return NextResponse.json(
        { error: 'Datasource name must start with DS_' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Insert data source
    const { error: insertError } = await supabase
      .from('data_sources')
      .insert({
        datasource_id, 
        datasource_name, 
        datasource_description,
        datasource_update_type: datasource_update_type || 'REPLACE',
        created_by: 'CONTI'
      });

    if (insertError) {
      throw insertError;
    }

    const parsedColumns = typeof columns === 'string' ? JSON.parse(columns) : columns;
    const { error: rpcError } = await supabase.rpc('create_datasource_tables', {
        p_datasource_name: datasource_name,
         p_columns: parsedColumns, // ✅ send as object/array, not string
    });


    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Data source created successfully'
    });
  } catch (error: any) {
    console.error('Error creating data source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create data source' },
      { status: 500 }
    );
  }
}
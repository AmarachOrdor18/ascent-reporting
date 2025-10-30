import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';

// Helper to parse CREATE TABLE SQL and extract columns
function parseCreateTableSQL(sql: string): { columns: any[]; error?: string } {
  try {
    // Remove comments and extra whitespace
    let cleanSQL = sql
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();

    // Extract content between parentheses
    const match = cleanSQL.match(/CREATE\s+TABLE\s+[\w_]+\s*\(([\s\S]+)\)/i);
    if (!match) {
      return { columns: [], error: 'Invalid CREATE TABLE syntax' };
    }

    const columnsStr = match[1];
    const columnDefinitions = columnsStr.split(',').map(s => s.trim());

    const columns = [];
    for (const def of columnDefinitions) {
      // Skip constraints and other non-column definitions
      if (
        def.toUpperCase().includes('PRIMARY KEY') ||
        def.toUpperCase().includes('FOREIGN KEY') ||
        def.toUpperCase().includes('CONSTRAINT') ||
        def.toUpperCase().includes('UNIQUE') ||
        def.toUpperCase().includes('CHECK')
      ) {
        continue;
      }

      // Parse column definition
      const parts = def.trim().split(/\s+/);
      if (parts.length < 2) continue;

      const name = parts[0].replace(/["`']/g, '');
      let type = parts[1].toUpperCase();

      // Extract type with precision if exists (e.g., VARCHAR(100))
      const typeMatch = def.match(/(\w+)\s*\(([^)]+)\)/i);
      if (typeMatch) {
        type = `${typeMatch[1].toUpperCase()}(${typeMatch[2]})`;
      }

      columns.push({ name, type });
    }

    return { columns };
  } catch (error: any) {
    return { columns: [], error: error.message };
  }
}

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
      datasource_name, 
      datasource_description,
      datasource_update_type,
      sql_query
    } = body;

    // Validate datasource name starts with DS_
    if (!datasource_name.startsWith('DS_')) {
      return NextResponse.json(
        { error: 'Datasource name must start with DS_' },
        { status: 400 }
      );
    }

    // Parse SQL query to extract columns
    const { columns, error: parseError } = parseCreateTableSQL(sql_query);
    
    if (parseError || columns.length === 0) {
      return NextResponse.json(
        { error: parseError || 'No valid columns found in SQL query' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Insert data source (ID will be auto-generated)
    const { data: insertedDS, error: insertError } = await supabase
      .from('data_sources')
      .insert({
        datasource_name, 
        datasource_description,
        datasource_update_type: datasource_update_type || 'REPLACE',
        created_by: 'CONTI'
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Create the three tables using RPC
    const { error: rpcError } = await supabase.rpc('create_datasource_tables', {
      p_datasource_name: datasource_name,
      p_columns: columns
    });

    if (rpcError) {
      // Rollback - delete the data source entry
      await supabase
        .from('data_sources')
        .delete()
        .eq('datasource_id', insertedDS.datasource_id);
      
      throw rpcError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Data source created successfully',
      datasource_id: insertedDS.datasource_id
    });
  } catch (error: any) {
    console.error('Error creating data source:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create data source' },
      { status: 500 }
    );
  }
}
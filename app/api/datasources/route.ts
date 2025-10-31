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
      return { columns: [], error: 'Invalid CREATE TABLE syntax. Must be: CREATE TABLE name (columns...)' };
    }

    const columnsStr = match[1];
    
    // Smart split: only split on commas that are NOT inside parentheses
    const columnDefinitions: string[] = [];
    let currentDef = '';
    let parenDepth = 0;
    
    for (let i = 0; i < columnsStr.length; i++) {
      const char = columnsStr[i];
      
      if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === ',' && parenDepth === 0) {
        // Only split on commas outside parentheses
        columnDefinitions.push(currentDef.trim());
        currentDef = '';
        continue;
      }
      
      currentDef += char;
    }
    
    // Don't forget the last definition
    if (currentDef.trim()) {
      columnDefinitions.push(currentDef.trim());
    }

    const columns = [];
    for (const def of columnDefinitions) {
      const trimmedDef = def.trim();
      
      if (!trimmedDef) continue;
      
      // Skip constraints and other non-column definitions
      const upperDef = trimmedDef.toUpperCase();
      if (
        upperDef.startsWith('PRIMARY KEY') ||
        upperDef.startsWith('FOREIGN KEY') ||
        upperDef.startsWith('CONSTRAINT') ||
        upperDef.startsWith('UNIQUE') ||
        upperDef.startsWith('CHECK') ||
        upperDef.startsWith('INDEX')
      ) {
        continue;
      }

      // Parse column definition
      // Format: column_name TYPE(params) [constraints]
      const parts = trimmedDef.split(/\s+/);
      if (parts.length < 2) continue;

      // Get column name (remove quotes)
      const name = parts[0].replace(/["`']/g, '').toLowerCase();
      
      // Get type with parameters
      let type = '';
      
      // Check if type has parentheses (e.g., VARCHAR(100), DECIMAL(18,2))
      const typeMatch = trimmedDef.match(/^\w+\s+(\w+\s*\([^)]+\))/i);
      if (typeMatch) {
        type = typeMatch[1].toUpperCase().replace(/\s+/g, '');
      } else {
        // Simple type without parameters (e.g., DATE, TEXT, INT)
        type = parts[1].toUpperCase();
      }

      columns.push({ 
        name: name,
        type: type
      });
    }

    if (columns.length === 0) {
      return { columns: [], error: 'No valid columns found in CREATE TABLE statement' };
    }

    return { columns };
  } catch (error: any) {
    return { columns: [], error: `Parser error: ${error.message}` };
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

    console.log('Received datasource creation request:', {
      datasource_name,
      datasource_update_type
    });

    // Validate datasource name starts with DS_
    if (!datasource_name.startsWith('DS_')) {
      return NextResponse.json(
        { error: 'Datasource name must start with DS_' },
        { status: 400 }
      );
    }

    // Validate SQL query exists
    if (!sql_query || !sql_query.trim()) {
      return NextResponse.json(
        { error: 'SQL CREATE TABLE query is required' },
        { status: 400 }
      );
    }

    // Parse SQL query to extract columns
    const { columns, error: parseError } = parseCreateTableSQL(sql_query);
    
    console.log('Parsed columns:', JSON.stringify(columns, null, 2));
    
    if (parseError) {
      return NextResponse.json(
        { error: `SQL Parse Error: ${parseError}` },
        { status: 400 }
      );
    }
    
    if (columns.length === 0) {
      return NextResponse.json(
        { error: 'No valid columns found in SQL query' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Check if datasource already exists
    const { data: existing } = await supabase
      .from('data_sources')
      .select('datasource_name')
      .eq('datasource_name', datasource_name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Datasource ${datasource_name} already exists` },
        { status: 400 }
      );
    }

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
      console.error('Insert datasource error:', insertError);
      throw insertError;
    }

    console.log('Datasource inserted:', insertedDS.datasource_id);

    // Prepare columns as proper JSON array
    const columnsJson = columns.map(col => ({
      name: String(col.name),
      type: String(col.type)
    }));

    console.log('Calling RPC with columns:', JSON.stringify(columnsJson, null, 2));

    // Create the three tables using RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_datasource_tables', {
      p_datasource_name: datasource_name,
      p_columns: columnsJson
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      
      // Rollback - delete the data source entry
      await supabase
        .from('data_sources')
        .delete()
        .eq('datasource_id', insertedDS.datasource_id);
      
      throw new Error(`Failed to create tables: ${rpcError.message}`);
    }

    console.log('Tables created successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Data source created successfully',
      datasource_id: insertedDS.datasource_id,
      tables_created: true,
      columns_created: columns.length
    });
  } catch (error: any) {
    console.error('Error creating data source:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create data source',
        details: error.details || error.hint || null
      },
      { status: 500 }
    );
  }
}
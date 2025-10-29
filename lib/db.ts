import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabase;
}

// Query function that mimics pg behavior
export async function query(text: string, params?: any[]) {
  const client = getSupabaseClient();
  const start = Date.now();

  try {
    // Use Supabase RPC for raw SQL queries
    const { data, error } = await client.rpc('exec_sql', {
      query: text,
      params: params || [],
    });

    const duration = Date.now() - start;
    console.log('Executed query', { 
      text: text.substring(0, 100), 
      duration, 
      success: !error 
    });

    if (error) {
      throw error;
    }

    // Return in pg-compatible format
    return {
      rows: data || [],
      rowCount: Array.isArray(data) ? data.length : 0,
    };
  } catch (error: any) {
    console.error('Database query error:', error);
    throw error;
  }
}

// For table operations using Supabase client directly
export function getTable(tableName: string) {
  const client = getSupabaseClient();
  return client.from(tableName);
}

// Batch insert helper for large datasets
export async function batchInsert(
  tableName: string,
  columns: string[],
  rows: any[][],
  batchSize: number = 1000
) {
  const client = getSupabaseClient();
  let totalInserted = 0;

  try {
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Convert rows array to objects
      const records = batch.map(row => {
        const record: any = {};
        columns.forEach((col, idx) => {
          record[col] = row[idx];
        });
        return record;
      });

      const { error } = await client.from(tableName).insert(records);

      if (error) {
        throw error;
      }

      totalInserted += batch.length;
      console.log(`Inserted batch: ${totalInserted}/${rows.length} rows`);
    }

    return totalInserted;
  } catch (error) {
    console.error('Batch insert error:', error);
    throw error;
  }
}

// Helper for batch insert with progress callback
export async function batchInsertWithProgress(
  tableName: string,
  columns: string[],
  rows: any[][],
  onProgress?: (progress: number, current: number, total: number) => void,
  batchSize: number = 1000
) {
  const client = getSupabaseClient();
  let totalInserted = 0;
  const total = rows.length;

  try {
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      // Convert rows array to objects
      const records = batch.map(row => {
        const record: any = {};
        columns.forEach((col, idx) => {
          record[col] = row[idx];
        });
        return record;
      });

      const { error } = await client.from(tableName).insert(records);

      if (error) {
        throw error;
      }

      totalInserted += batch.length;
      const progress = Math.floor((totalInserted / total) * 100);
      
      console.log(`Progress: ${progress}% (${totalInserted}/${total} rows)`);

      if (onProgress) {
        onProgress(progress, totalInserted, total);
      }
    }

    return totalInserted;
  } catch (error) {
    console.error('Batch insert with progress error:', error);
    throw error;
  }
}
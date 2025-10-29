import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, batchInsert } from '@/lib/db';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const datasourceName = formData.get('datasourceName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`Starting upload for ${datasourceName}: ${file.name} (${file.size} bytes)`);

    const uploadId = Date.now();
    const rawTable = `${datasourceName}_RAW`;

    // Parse CSV
    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (parsed.errors.length > 0) {
      console.error('CSV parsing errors:', parsed.errors);
      return NextResponse.json(
        { error: 'CSV parsing failed', details: parsed.errors },
        { status: 400 }
      );
    }

    const data = parsed.data as any[];
    if (data.length === 0) {
      return NextResponse.json(
        { error: 'No data found in CSV' },
        { status: 400 }
      );
    }

    console.log(`Parsed ${data.length} rows`);

    // Get column names from first row
    const columns = Object.keys(data[0]);
    const allColumns = [...columns, 'upload_id', 'uploaded_by', 'uploaded_at'];

    // Prepare rows for batch insert
    const rows = data.map(row => {
      const values = columns.map(col => row[col] ?? null);
      return [...values, uploadId, 'CONTI', new Date().toISOString()];
    });

    // Batch insert with Supabase
    const totalInserted = await batchInsert(rawTable, allColumns, rows, 1000);

    // Track upload in database
    const supabase = getSupabaseClient();
    await supabase.from('upload_sessions').insert({
      upload_id: uploadId,
      datasource_name: datasourceName,
      file_name: file.name,
      row_count: totalInserted,
      status: 'UPLOADED',
      uploaded_by: 'CONTI'
    });

    // Update lobby count
    const { data: rawData } = await supabase
      .from(rawTable)
      .select('*', { count: 'exact', head: true });

    await supabase
      .from('data_sources')
      .update({ lobby: rawData?.length || totalInserted })
      .eq('datasource_name', datasourceName);

    return NextResponse.json({
      success: true,
      uploadId,
      rowCount: totalInserted,
      message: `Successfully uploaded ${totalInserted} rows`
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
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

    // Validate file name matches datasource name
    const fileName = file.name.replace(/\.(csv|CSV)$/, '');
    if (fileName !== datasourceName) {
      return NextResponse.json(
        { 
          error: `File name must match datasource name. Expected: ${datasourceName}.csv, Got: ${file.name}`,
          details: `Please rename your file to ${datasourceName}.csv`
        },
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

    const supabase = getSupabaseClient();

    // Batch insert records
    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from(rawTable)
        .insert(batch);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to insert batch at row ${i}: ${insertError.message}`);
      }

      totalInserted += batch.length;
      console.log(`Inserted: ${totalInserted}/${data.length} rows`);
    }

    // Track upload in database
    await supabase.from('upload_sessions').insert({
      upload_id: uploadId,
      datasource_name: datasourceName,
      file_name: file.name,
      row_count: totalInserted,
      status: 'UPLOADED',
      uploaded_by: 'CONTI'
    });

    // Update lobby count
    const { count } = await supabase
      .from(rawTable)
      .select('*', { count: 'exact', head: true });

    await supabase
      .from('data_sources')
      .update({ lobby: count || 0 })
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
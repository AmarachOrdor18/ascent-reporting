import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const datasourceName = formData.get('datasourceName') as string;

    console.log('Upload request received:', {
      fileName: file?.name,
      fileSize: file?.size,
      datasourceName
    });

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!datasourceName) {
      return NextResponse.json(
        { error: 'Datasource name is required' },
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

    console.log('File validation passed');

    const rawTable = `${datasourceName}_RAW`;

    // Parse CSV
    console.log('Parsing CSV...');
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
        { error: 'CSV parsing failed', details: parsed.errors.slice(0, 5) },
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

    console.log(`Parsed ${data.length} rows with columns:`, Object.keys(data[0]));

    const supabase = getSupabaseClient();

    // Check if RAW table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from(rawTable)
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Table check error:', tableError);
      return NextResponse.json(
        { 
          error: `Table ${rawTable} does not exist. Please create the datasource first.`,
          details: tableError.message
        },
        { status: 400 }
      );
    }

    console.log('Table exists, starting batch insert...');

    // Batch insert records
    const batchSize = 5000;
    let totalInserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      console.log(`Inserting batch ${Math.floor(i/batchSize) + 1}: rows ${i+1} to ${Math.min(i+batchSize, data.length)}`);
      
      const { error: insertError } = await supabase
        .from(rawTable)
        .insert(batch);

      if (insertError) {
        console.error('Insert error:', insertError);
        
        // Try to provide more context
        return NextResponse.json(
          { 
            error: `Failed to insert batch at row ${i + 1}`,
            details: insertError.message,
            hint: insertError.hint || 'Check that CSV columns match table structure',
            sample_row: batch[0]
          },
          { status: 500 }
        );
      }

      totalInserted += batch.length;
      console.log(`Progress: ${totalInserted}/${data.length} rows inserted`);
    }

    console.log('All data inserted, updating metadata...');

    // Track upload in database
    const uploadId = Date.now();
    const { error: sessionError } = await supabase.from('upload_sessions').insert({
      upload_id: uploadId,
      datasource_name: datasourceName,
      file_name: file.name,
      row_count: totalInserted,
      status: 'UPLOADED',
      uploaded_by: 'CONTI'
    });

    if (sessionError) {
      console.warn('Failed to track upload session:', sessionError);
    }

    // Update lobby count
    const { count } = await supabase
      .from(rawTable)
      .select('*', { count: 'exact', head: true });

    const { error: updateError } = await supabase
      .from('data_sources')
      .update({ lobby: count || 0 })
      .eq('datasource_name', datasourceName);

    if (updateError) {
      console.warn('Failed to update lobby count:', updateError);
    }

    console.log('Upload complete!');

    return NextResponse.json({
      success: true,
      uploadId,
      rowCount: totalInserted,
      message: `Successfully uploaded ${totalInserted} rows to ${rawTable}`
    });
    
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Upload failed',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { getTable } from '@/lib/db';  // ✅ use the helper that returns the Supabase table

// ===============================
// GET: Fetch all datasets
// ===============================
export async function GET() {
  try {
    const { data, error } = await getTable('data_sets')
      .select('dataset_id, dataset_name, dataset_description, dataset_updated_at')
      .order('dataset_updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch datasets' },
      { status: 500 }
    );
  }
}

// ===============================
// POST: Insert a new dataset
// ===============================
export async function POST(request: Request) {
  try {
    const { dataset_id, dataset_name, dataset_description } = await request.json();

    const { error } = await getTable('data_sets').insert([
      { dataset_id, dataset_name, dataset_description },
    ]);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Dataset created successfully',
    });
  } catch (error: any) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create dataset' },
      { status: 500 }
    );
  }
}

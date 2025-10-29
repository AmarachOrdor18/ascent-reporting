import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        dataset_id,
        dataset_name,
        dataset_description,
        dataset_updated_at
      FROM data_sets 
      ORDER BY dataset_updated_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch datasets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { dataset_id, dataset_name, dataset_description } = await request.json();

    await query(
      `INSERT INTO data_sets (dataset_id, dataset_name, dataset_description)
       VALUES ($1, $2, $3)`,
      [dataset_id, dataset_name, dataset_description]
    );

    return NextResponse.json({
      success: true,
      message: 'Dataset created successfully'
    });
  } catch (error: any) {
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create dataset' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        v.view_id,
        v.view_name,
        v.view_definition,
        v.dataset_id,
        d.dataset_name,
        v.created_at,
        v.created_by,
        v.is_active
      FROM sql_views v
      LEFT JOIN data_sets d ON v.dataset_id = d.dataset_id
      WHERE v.is_active = true
      ORDER BY v.created_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching views:', error);
    return NextResponse.json(
      { error: 'Failed to fetch views' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { viewName, viewDefinition, datasetId } = await request.json();

    // Create the view in the database
    await query(viewDefinition);

    // Register the view
    await query(
      `INSERT INTO sql_views (
        view_name,
        view_definition,
        dataset_id,
        created_by
      )
      VALUES ($1, $2, $3, $4)`,
      [viewName, viewDefinition, datasetId, 'CONTI']
    );

    return NextResponse.json({
      success: true,
      message: 'View created successfully'
    });
  } catch (error: any) {
    console.error('Error creating view:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create view' },
      { status: 500 }
    );
  }
}
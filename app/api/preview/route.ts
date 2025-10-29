import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableName = searchParams.get('table');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Sanitize table name to prevent SQL injection
    const validTablePattern = /^[a-zA-Z0-9_]+$/;
    if (!validTablePattern.test(tableName)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      );
    }

    // Get data with limit
    const result = await query(
      `SELECT * FROM ${tableName} LIMIT $1`,
      [limit]
    );

    return NextResponse.json({
      rows: result.rows,
      count: result.rowCount,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preview' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableName = searchParams.get('table');
    const format = searchParams.get('format') || 'csv';

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

    // Sanitize table name
    const validTablePattern = /^[a-zA-Z0-9_]+$/;
    if (!validTablePattern.test(tableName)) {
      return NextResponse.json(
        { error: 'Invalid table name' },
        { status: 400 }
      );
    }

    // Fetch all data
    const result = await query(`SELECT * FROM ${tableName}`);

    if (format === 'csv') {
      const csv = Papa.unparse(result.rows);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${tableName}_${Date.now()}.csv"`,
        },
      });
    } else if (format === 'json') {
      return new NextResponse(JSON.stringify(result.rows, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${tableName}_${Date.now()}.json"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid format' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export' },
      { status: 500 }
    );
  }
}
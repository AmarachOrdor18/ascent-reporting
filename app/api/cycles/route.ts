import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { format } from 'date-fns';

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        cycle_id,
        cycle_type,
        cycle_date,
        cycle_reference_id,
        opened_by,
        opened_at,
        status,
        closed_at,
        closed_by
      FROM report_cycles 
      ORDER BY opened_at DESC`
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching cycles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cycles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { cycleType, cycleDate } = await request.json();

    const referenceId = `${cycleType.toUpperCase()}_${format(
      new Date(cycleDate),
      'yyyyMMdd'
    )}_${Date.now()}`;

    await query(
      `INSERT INTO report_cycles (
        cycle_type,
        cycle_date,
        cycle_reference_id,
        opened_by
      )
      VALUES ($1, $2, $3, $4)`,
      [cycleType, cycleDate, referenceId, 'CONTI']
    );

    return NextResponse.json({
      success: true,
      referenceId,
      message: 'Cycle created successfully'
    });
  } catch (error: any) {
    console.error('Error creating cycle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create cycle' },
      { status: 500 }
    );
  }
}
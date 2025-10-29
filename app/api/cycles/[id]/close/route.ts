import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { cycleReferenceId, datasourceNames } = await request.json();

    // Close cycle and move data to history
    await query(
      `SELECT close_cycle($1, $2)`,
      [cycleReferenceId, datasourceNames]
    );

    return NextResponse.json({
      success: true,
      message: 'Cycle closed successfully'
    });
  } catch (error: any) {
    console.error('Error closing cycle:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close cycle' },
      { status: 500 }
    );
  }
}
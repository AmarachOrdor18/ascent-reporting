import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { cycleReferenceId, datasourceNames } = await request.json();

    // Close cycle and move data to history
    await query(`SELECT close_cycle($1, $2)`, [cycleReferenceId, datasourceNames]);

    return NextResponse.json({
      success: true,
      message: `Cycle ${id} closed successfully`
    });
  } catch (error: unknown) {
    console.error('Error closing cycle:', error);
    const message = error instanceof Error ? error.message : 'Failed to close cycle';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

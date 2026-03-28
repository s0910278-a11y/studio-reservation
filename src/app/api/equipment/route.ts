import { NextResponse } from 'next/server';
import { getEquipmentFromSheet } from '../../../lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getEquipmentFromSheet();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error (Equipment):', error);
    return NextResponse.json({ error: 'Failed to fetch equipment data' }, { status: 500 });
  }
}

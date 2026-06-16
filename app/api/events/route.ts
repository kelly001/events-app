import { NextResponse } from 'next/server'
import { mockEvents } from '../../../src/mockEvents'

export async function GET() {
  return NextResponse.json({
    events: mockEvents,
    updatedAt: new Date().toISOString()
  })
}

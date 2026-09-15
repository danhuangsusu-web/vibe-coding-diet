import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    service: 'food-sense-api',
    status: 'ok'
  })
}

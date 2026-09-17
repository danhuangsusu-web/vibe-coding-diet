import { NextResponse } from 'next/server'

import { isMealAnalysisAiConfigured } from '../../../lib/ai-provider'

export function GET() {
  return NextResponse.json({
    aiConfigured: isMealAnalysisAiConfigured(),
    ok: true,
    service: 'food-sense-api',
    status: 'ok'
  })
}

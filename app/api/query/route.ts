import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/agent';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    console.log('[API] Processing query:', query);
    const result = await runQuery(query);

    return NextResponse.json({
      success: true,
      query: result.userQuery,
      sql: result.generatedSQL,
      results: result.executionResult,
      error: result.error,
      messages: result.messages,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error('[API] Error:', errorMessage);
    console.error('[API] Full error:', error);
    return NextResponse.json(
      {
        error: `Server error: ${errorMessage}`,
        success: false,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

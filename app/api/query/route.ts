import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/agent';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, confirmed } = body;

    // Validate query
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

    const cleanQuery = query.trim();
    const lowerQuery = cleanQuery.toLowerCase();

    // Detect delete request and ask confirmation first
    const isDeleteCommand =
      lowerQuery.startsWith('delete') ||
      lowerQuery.includes(' remove ') ||
      lowerQuery.includes(' delete employee') ||
      lowerQuery.includes('delete employee');

    if (isDeleteCommand && !confirmed) {
      return NextResponse.json({
        success: true,
        needsConfirmation: true,
        message: `Are you sure you want to delete this record?`,
        originalQuery: cleanQuery,
      });
    }

    console.log('[API] Processing query:', cleanQuery);

    const result = await runQuery(cleanQuery);

    return NextResponse.json({
      success: true,
      needsConfirmation: false,
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
        success: false,
        error: `Server error: ${errorMessage}`,
        details:
          process.env.NODE_ENV === 'development'
            ? String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
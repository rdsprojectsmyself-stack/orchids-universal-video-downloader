import { NextRequest, NextResponse } from 'next/server';
import { adminAuthMiddleware } from '@/middleware/adminAuth';
import { handleCors, corsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;
  return NextResponse.json({});
}

export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const authError = await adminAuthMiddleware(request);
  if (authError) {
    return authError;
  }

  try {
    const BACKEND_URL = process.env.BACKEND_URL;
    if (!BACKEND_URL) {
      throw new Error('BACKEND_URL is not configured');
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats from backend');
    }

    const stats = await response.json();
    const origin = request.headers.get('origin');
    return NextResponse.json(stats, {
      headers: corsHeaders(origin),
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = 'dhanaprabha216@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}

export async function adminAuthMiddleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: '403 Forbidden – Admin access only' },
      { status: 403 }
    );
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const response = await fetch(`${backendUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      throw new Error('Verification failed');
    }

    const data = await response.json();

    if (!data.user || !data.user.isAdmin) {
      return NextResponse.json(
        { error: '403 Forbidden – Admin access only' },
        { status: 403 }
      );
    }

    return null;
  } catch (error) {
    return NextResponse.json(
      { error: '403 Forbidden – Admin access only' },
      { status: 403 }
    );
  }
}


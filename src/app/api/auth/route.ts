// src/app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Cookies from 'js-cookie';

export async function POST(request: NextRequest) {
  try {
    const { authData } = await request.json();
    if (!authData || !authData.token || !authData.refreshToken || !authData.userData) {
      return NextResponse.json({ error: 'Missing authentication data' }, { status: 400 });
    }

    // Set cookies in the seller dashboard domain
    Cookies.set('accessToken', authData.token, {
      expires: 1 / 24, // 1 hour
      secure: true,
      sameSite: 'lax',
    });

    Cookies.set('refreshToken', authData.refreshToken, {
      expires: 1, // 1 day
      secure: true,
      sameSite: 'lax',
    });

    Cookies.set('sellerData', JSON.stringify(authData.userData), {
      expires: 1,
      secure: true,
      sameSite: 'lax',
    });

    Cookies.set('role', 'SELLER', {
      expires: 1,
      secure: true,
      sameSite: 'lax',
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed. Please try logging in again.' },
      { status: 500 }
    );
  }
}
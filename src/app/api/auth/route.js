import { NextResponse } from 'next/server';

export async function POST(request) {
  const { password } = await request.json();

  if (password === process.env.APP_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'auth-session',
      value: 'authenticated',
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}

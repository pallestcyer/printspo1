import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello from the API!' });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Email sent successfully!' });
} 
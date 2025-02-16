import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  return NextResponse.json({ message: 'Hello from the API!' });
}

export async function POST(_request: Request) {
  return NextResponse.json({ message: 'Email sent successfully!' });
} 
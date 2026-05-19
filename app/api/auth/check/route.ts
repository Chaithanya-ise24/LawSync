import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'lawsync-secret-key-change-this-in-production';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ authenticated: true, user: decoded });
  } catch {
    // Completely omitted the unused '(error)' variable to prevent linter errors
    return NextResponse.json({ authenticated: false });
  }
}
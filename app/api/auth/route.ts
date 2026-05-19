import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simple in-memory storage (in production, use a real database)
const users: { id: number; email: string; password: string }[] = [];

const JWT_SECRET = process.env.JWT_SECRET || 'lawsync-secret-key-change-this-in-production';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
      // LOGIN: Verify password
      const isValid = await bcrypt.compare(password, existingUser.password);
      
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      
      const token = jwt.sign({ id: existingUser.id, email }, JWT_SECRET, { expiresIn: '7d' });
      
      const response = NextResponse.json({ 
        success: true, 
        message: 'Logged in successfully',
        user: { email }
      });
      
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      
      return response;
      
    } else {
      // SIGNUP: Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: users.length + 1, email, password: hashedPassword };
      users.push(newUser);
      
      const token = jwt.sign({ id: newUser.id, email }, JWT_SECRET, { expiresIn: '7d' });
      
      const response = NextResponse.json({ 
        success: true, 
        message: 'Account created successfully',
        user: { email }
      });
      
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      
      return response;
    }
    
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
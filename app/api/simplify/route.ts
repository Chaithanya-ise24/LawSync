import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    console.log('📝 Simplifying document...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are a legal document simplifier. Take this legal document and rewrite it in simple, plain English that a normal person can understand.

IMPORTANT RULES:
1. Remove all legalese and complex legal jargon
2. Use short, simple sentences
3. Explain what each clause means in everyday language
4. Highlight any risks or important obligations
5. Keep the original meaning intact

Document to simplify:
${text.substring(0, 5000)}

Return the simplified version in clear sections with bullet points. Keep it easy to read.`;

    const result = await model.generateContent(prompt);
    const simplified = result.response.text();
    
    console.log('✅ Simplification complete');
    return NextResponse.json({ simplified });
    
  } catch (error) {
    console.error('Simplification error:', error);
    return NextResponse.json({ 
      simplified: 'Could not simplify the document at this time. Please try again.',
      error: (error as Error).message 
    });
  }
}
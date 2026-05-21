import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { message, documentContext } = await req.json();
    
    if (!message || message.trim() === '') {
      return NextResponse.json({ reply: 'Please ask a legal question.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        reply: '⚠️ API key not configured. Please add GEMINI_API_KEY to .env.local' 
      });
    }

    // Use Gemini 2.5 Flash - faster responses
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let prompt = `You are LawSync AI, a legal assistant for Indian consumers. Provide helpful legal information.
    
    User question: ${message}`;
    
    if (documentContext) {
      prompt += `\n\nDocument context: ${documentContext.substring(0, 3000)}`;
    }
    
    const result = await model.generateContent(prompt);
    const reply = result.response.text();
    
    return NextResponse.json({ reply });
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ 
      reply: '⚠️ Service error. Please try again.' 
    });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini AI securely using your environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Legal system prompt - structures application behavioral logic
const LEGAL_SYSTEM_PROMPT = `You are LawSync AI, a helpful legal assistant for Indian consumers. 
Your role is to provide general legal information, not formal legal advice. 
Always remind users to consult a licensed attorney for specific legal matters.
Focus on Indian laws including: Consumer Protection Act, Indian Contract Act, Tenancy laws, Employment laws.
Keep responses clear, simple, structured, and helpful. 
If you don't know something, say so honestly.
Always include a clear disclaimer that this is not professional legal advice.`;

// Type definition for incoming request conversation arrays
interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ reply: 'Please ask a legal question.' });
    }

    // Instantiate model with standard systemic parameters
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: LEGAL_SYSTEM_PROMPT
    });

    // Cleanly map context into Gemini's native multi-turn payload syntax
    // Gemini API enforces that history states use exactly 'user' or 'model' roles
    const formattedHistory = (history || [])
      .slice(-6) // Safely extract the last 6 turns
      .map((msg: ChatMessage) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

    // Configure structural guardrails
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    // Initialize native SDK multi-turn conversation object
    const chatSession = model.startChat({
      history: formattedHistory,
      safetySettings,
      generationConfig: {
        temperature: 0.3, // Lower temperature enforces factual accuracy over creativity in legal scopes
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Transmit the active prompt node
    const result = await chatSession.sendMessage(message);
    let reply = result.response.text();

    // Enforce safe disclaimers if absent from the generated output tokens
    const lowerReply = reply.toLowerCase();
    if (reply.length > 0 && !lowerReply.includes('not legal advice') && !lowerReply.includes('consult a')) {
      reply += '\n\n⚠️ *Disclaimer: This is AI-generated legal information, not formal legal advice. Please consult a qualified attorney for your specific situation.*';
    }

    return NextResponse.json({ reply });
    
  } catch (error) {
    console.error('Gemini API Integration Failure Details:', error);
    
    // Type-safely resolve error string mapping without relying on 'any' tags
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('API key')) {
      return NextResponse.json({ 
        reply: '⚠️ API key configuration mismatch. Please map a valid GEMINI_API_KEY inside your root environment variables.' 
      }, { status: 500 });
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return NextResponse.json({ 
        reply: '⚠️ Conversational traffic limits reached. Please re-attempt your request in a few moments.' 
      }, { status: 429 });
    }
    
    return NextResponse.json({ 
      reply: '⚠️ Operational runtime anomaly encountered. Please resubmit your legal query in a moment.' 
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' });
    }
    
    console.log(`📄 Processing: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    // Use Gemini 2.5 Flash for OCR
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    console.log('🔍 Sending to Gemini Vision for OCR (this may take 10-20 seconds)...');
    
    const result = await model.generateContent([
      {
        text: "Extract ALL text from this document exactly as it appears. Extract EVERYTHING: names, dates, addresses, rent amounts, deposit amounts, clauses, terms, conditions, and any other text. Return ONLY the extracted text, no commentary or explanations."
      },
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      }
    ]);
    
    const extractedText = result.response.text();
    console.log(`✅ Gemini Vision extracted: ${extractedText.length} characters`);
    
    if (!extractedText || extractedText.trim().length < 20) {
      return NextResponse.json({ 
        text: '', 
        error: 'No text could be extracted from this document. The file may be corrupted or contain only images without text.'
      });
    }
    
    return NextResponse.json({ text: extractedText, method: 'gemini-vision' });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process document: ' + (error as Error).message });
  }
}
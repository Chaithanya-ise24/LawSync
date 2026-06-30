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
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');
    
    // Use Gemini Vision for OCR
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    console.log('🔍 Sending to Gemini Vision for OCR...');
    
    const result = await model.generateContent([
      "Extract ALL text from this document. Return ONLY the extracted text. Do not add any commentary.",
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      }
    ]);
    
    const extractedText = result.response.text();
    console.log(`✅ Extracted: ${extractedText.length} chars`);
    
    if (!extractedText || extractedText.trim().length < 20) {
      return NextResponse.json({ 
        text: '', 
        error: 'No text could be extracted'
      });
    }
    
    return NextResponse.json({ text: extractedText, method: 'gemini-vision' });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process PDF' });
  }
}
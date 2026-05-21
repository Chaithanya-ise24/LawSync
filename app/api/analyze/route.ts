import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    console.log('📊 Analyze request received, text length:', text?.length);
    
    if (!text || text.length < 10) {
      console.log('⚠️ Text too short, returning fallback');
      return NextResponse.json({
        documentType: 'Unknown Document',
        certificateNumber: 'Not specified',
        executionDate: 'Not specified',
        executionLocation: 'Not specified',
        parties: {
          firstParty: { name: 'Not specified', details: '' },
          secondParty: { name: 'Not specified', details: '' }
        },
        property: { address: 'Not specified', type: 'Not specified', features: [] },
        financialTerms: { monthlyRent: 'Not specified', securityDeposit: 'Not specified', otherCharges: [] },
        keyClauses: [],
        riskScore: 50,
        riskLevel: 'Medium',
        summary: 'Unable to analyze document. Text extraction failed.',
        jurisdiction: 'INDIA (Central Laws)',
        redFlags: { severe: 0, critical: 0, current: 0 },
        jargonCount: 0,
        ambiguousTerms: 0,
        pageCount: 1,
        keyFindings: ['Document could not be analyzed']
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are a legal document analyzer. Extract and structure the following information from this document. Return ONLY valid JSON.

Document text: ${text.substring(0, 8000)}

Return this exact JSON:
{
  "documentType": "Type of document",
  "certificateNumber": "",
  "executionDate": "",
  "executionLocation": "",
  "parties": {
    "firstParty": { "name": "", "details": "" },
    "secondParty": { "name": "", "details": "" }
  },
  "property": {
    "address": "",
    "type": "",
    "features": []
  },
  "financialTerms": {
    "monthlyRent": "",
    "securityDeposit": "",
    "otherCharges": []
  },
  "keyClauses": [],
  "riskScore": 50,
  "riskLevel": "Medium",
  "summary": "",
  "jurisdiction": "INDIA (Central Laws)",
  "redFlags": { "severe": 0, "critical": 0, "current": 0 },
  "jargonCount": 0,
  "ambiguousTerms": 0,
  "pageCount": 1,
  "keyFindings": []
}`;

    const result = await model.generateContent(prompt);
    let response = result.response.text();
    
    if (response.includes('```json')) {
      response = response.split('```json')[1].split('```')[0];
    } else if (response.includes('```')) {
      response = response.split('```')[1];
    }
    
    const analysis = JSON.parse(response);
    console.log('✅ Analysis successful');
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed',
      documentType: 'Error',
      riskScore: 50,
      riskLevel: 'Medium',
      summary: 'Analysis service temporarily unavailable'
    });
  }
}
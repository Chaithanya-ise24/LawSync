import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    console.log('📊 Analyze request received, text length:', text?.length);
    
    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'Document too short' }, { status: 400 });
    }

    // Use Gemini 2.5 Flash for analysis
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `You are a legal document analyzer. Extract and structure the following information from this document. Return ONLY valid JSON, no markdown, no explanations.

Document: ${text.substring(0, 8000)}

Return this exact JSON structure:
{
  "documentType": "Type of document (e.g., Rental Agreement, Employment Contract, NDA)",
  "certificateNumber": "Any reference/registration number if present",
  "executionDate": "Date when document was signed",
  "executionLocation": "Place where document was executed",
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
  "keyClauses": [
    { "title": "Notice Period", "description": "", "riskLevel": "High/Medium/Low" },
    { "title": "Termination", "description": "", "riskLevel": "High/Medium/Low" },
    { "title": "Liability", "description": "", "riskLevel": "High/Medium/Low" }
  ],
  "riskScore": 50,
  "riskLevel": "Medium",
  "summary": "Brief 1-2 sentence summary",
  "jurisdiction": "INDIA (Central Laws)",
  "redFlags": { "severe": 0, "critical": 0, "current": 0 },
  "jargonCount": 0,
  "ambiguousTerms": 0,
  "pageCount": 1,
  "keyFindings": []
}`;

    const result = await model.generateContent(prompt);
    let response = result.response.text();
    
    // Clean JSON from markdown
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
    // Return fallback data
    return NextResponse.json({
      documentType: 'Legal Document',
      certificateNumber: 'Not specified',
      executionDate: 'Not specified',
      executionLocation: 'Not specified',
      parties: {
        firstParty: { name: 'Not specified', details: '' },
        secondParty: { name: 'Not specified', details: '' }
      },
      property: {
        address: 'Not specified',
        type: 'Not specified',
        features: []
      },
      financialTerms: {
        monthlyRent: 'Not specified',
        securityDeposit: 'Not specified',
        otherCharges: []
      },
      keyClauses: [],
      riskScore: 50,
      riskLevel: 'Medium',
      summary: 'Analysis could not be completed',
      jurisdiction: 'INDIA (Central Laws)',
      redFlags: { severe: 0, critical: 0, current: 0 },
      jargonCount: 0,
      ambiguousTerms: 0,
      pageCount: 1,
      keyFindings: ['Analysis service unavailable']
    });
  }
}
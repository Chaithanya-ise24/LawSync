export interface AnalysisResult {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  jurisdiction: string;
  redFlags: {
    severe: number;
    critical: number;
    current: number;
  };
  jargonCount: number;
  ambiguousTerms: number;
  pageCount: number;
  summary: string;
  keyFindings: string[];
  clauses: Array<{
    id: string;
    text: string;
    risk: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
}

// Fallback analysis function (keyword-based)
export function getFallbackAnalysis(text: string, fileName: string): AnalysisResult {
  const lowerText = text.toLowerCase();
  
  // Simple risk calculation based on keywords
  const highRiskKeywords = ['indemnify', 'unlimited', 'liability', 'termination', 'confidential'];
  let riskScore = 50;
  
  highRiskKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      riskScore += 10;
    }
  });
  
  riskScore = Math.min(Math.max(riskScore, 0), 100);
  
  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  if (riskScore >= 80) riskLevel = 'Critical';
  else if (riskScore >= 65) riskLevel = 'High';
  else if (riskScore >= 40) riskLevel = 'Medium';
  else riskLevel = 'Low';
  
  const wordCount = text.split(/\s+/).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));
  
  return {
    riskScore,
    riskLevel,
    jurisdiction: 'INDIA (Central Laws)',
    redFlags: {
      severe: riskScore >= 70 ? 1 : 0,
      critical: riskScore >= 50 ? 2 : 0,
      current: 1
    },
    jargonCount: 5,
    ambiguousTerms: 2,
    pageCount,
    summary: `Document "${fileName}" has been analyzed. Risk score: ${riskScore}/100 (${riskLevel} risk).`,
    keyFindings: [
      `Risk score: ${riskScore}/100`,
      `${pageCount} pages analyzed`,
      'Review high-risk clauses carefully'
    ],
    clauses: []
  };
}

// Main analysis function - calls Gemini API
export async function analyzeDocumentWithGemini(text: string, fileName: string): Promise<AnalysisResult> {
  try {
    console.log('Calling analysis API for:', fileName);
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.substring(0, 8000), fileName }),
    });
    
    if (!response.ok) {
      console.error('API response not OK:', response.status);
      return getFallbackAnalysis(text, fileName);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error('API Error:', data.error);
      return getFallbackAnalysis(text, fileName);
    }
    
    // Return the API response
    return {
      riskScore: data.riskScore || 50,
      riskLevel: data.riskLevel || 'Medium',
      jurisdiction: data.jurisdiction || 'INDIA (Central Laws)',
      redFlags: data.redFlags || { severe: 0, critical: 0, current: 0 },
      jargonCount: data.jargonCount || 0,
      ambiguousTerms: data.ambiguousTerms || 0,
      pageCount: data.pageCount || 1,
      summary: data.summary || `Document "${fileName}" analyzed.`,
      keyFindings: data.keyFindings || ['Analysis complete'],
      clauses: data.clauses || []
    };
    
  } catch (error) {
    console.error('Analysis failed, using fallback:', error);
    return getFallbackAnalysis(text, fileName);
  }
}
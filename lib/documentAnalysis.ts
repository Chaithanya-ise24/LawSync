export interface AnalysisResult {
  documentType: string;
  certificateNumber: string;
  executionDate: string;
  executionLocation: string;
  parties: {
    firstParty: { name: string; details: string };
    secondParty: { name: string; details: string };
  };
  property: {
    address: string;
    type: string;
    features: string[];
  };
  financialTerms: {
    monthlyRent: string;
    securityDeposit: string;
    otherCharges: string[];
  };
  keyClauses: Array<{
    title: string;
    description: string;
    riskLevel: 'High' | 'Medium' | 'Low';
  }>;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  // Legacy fields for dashboard compatibility
  jurisdiction: string;
  redFlags: { severe: number; critical: number; current: number };
  jargonCount: number;
  ambiguousTerms: number;
  pageCount: number;
  keyFindings: string[];
  clauses: Array<{
    id: string;
    text: string;
    risk: 'high' | 'medium' | 'low';
    explanation: string;
  }>;
}

// Delay helper for rate limit retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function getFallbackAnalysis(text: string, fileName: string): AnalysisResult {
  const lowerText = text.toLowerCase();
  
  // Calculate risk score based on keywords
  let riskScore = 30;
  const highRiskKeywords = ['indemnify', 'unlimited liability', 'irrevocable', 'binding', 'confidential', 'non-compete', 'exclusive', 'forever', 'waive', 'forfeit', 'penalty', 'termination without notice'];
  
  highRiskKeywords.forEach(keyword => {
    const count = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
    riskScore += count * 5;
  });
  
  riskScore = Math.min(Math.max(riskScore, 0), 100);
  
  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  if (riskScore >= 80) riskLevel = 'Critical';
  else if (riskScore >= 65) riskLevel = 'High';
  else if (riskScore >= 40) riskLevel = 'Medium';
  else riskLevel = 'Low';
  
  const jargonCount = (lowerText.match(/\b(hereby|wherein|thereof|hereinafter|heretofore|whereas|thereto|hereunder|notwithstanding)\b/g) || []).length;
  const ambiguousTerms = (lowerText.match(/\b(reasonable|asap|promptly|soon|fair|appropriate|substantial|material)\b/g) || []).length;
  const wordCount = text.split(/\s+/).length;
  const pageCount = Math.max(1, Math.ceil(wordCount / 500));
  
  const severeCount = (lowerText.match(/\b(indemnify|unlimited liability|irrevocable)\b/g) || []).length;
  const criticalCount = (lowerText.match(/\b(confidential|non-compete|exclusive|waive|forfeit)\b/g) || []).length;
  
  // Try to extract document type from filename
  let documentType = 'Legal Document';
  if (fileName.toLowerCase().includes('rental') || fileName.toLowerCase().includes('agreement')) {
    documentType = 'Rental Agreement';
  } else if (fileName.toLowerCase().includes('employment') || fileName.toLowerCase().includes('contract')) {
    documentType = 'Employment Contract';
  } else if (fileName.toLowerCase().includes('nda') || fileName.toLowerCase().includes('confidential')) {
    documentType = 'NDA Agreement';
  }
  
  // Try to extract basic info from text
  let ownerName = 'Not specified';
  let tenantName = 'Not specified';
  let monthlyRent = 'Not specified';
  let securityDeposit = 'Not specified';
  
  // Simple regex extraction
  const ownerMatch = text.match(/Owner[:\s]+([A-Z][A-Za-z\s.]+)/i);
  if (ownerMatch) ownerName = ownerMatch[1].trim();
  
  const tenantMatch = text.match(/Tenant[:\s]+([A-Z][A-Za-z\s.]+)/i);
  if (tenantMatch) tenantName = tenantMatch[1].trim();
  
  const rentMatch = text.match(/rent\s+Rs\.?\s*(\d[\d,]+)/i);
  if (rentMatch) monthlyRent = `₹${rentMatch[1]}`;
  
  const depositMatch = text.match(/deposit\s+Rs\.?\s*(\d[\d,]+)/i);
  if (depositMatch) securityDeposit = `₹${depositMatch[1]}`;
  
  return {
    documentType,
    certificateNumber: 'Not specified',
    executionDate: 'Not specified',
    executionLocation: 'Not specified',
    parties: {
      firstParty: { name: ownerName, details: '' },
      secondParty: { name: tenantName, details: '' }
    },
    property: {
      address: 'Not specified',
      type: 'Not specified',
      features: []
    },
    financialTerms: {
      monthlyRent,
      securityDeposit,
      otherCharges: []
    },
    keyClauses: [
      { title: 'Review Required', description: 'Document contains legal terms that need review', riskLevel: 'Medium' }
    ],
    riskScore,
    riskLevel,
    summary: `Document "${fileName}" analyzed. Risk score: ${riskScore}/100 (${riskLevel} risk).`,
    jurisdiction: 'INDIA (Central Laws)',
    redFlags: { severe: severeCount, critical: criticalCount, current: 1 },
    jargonCount,
    ambiguousTerms,
    pageCount,
    keyFindings: [
      `Risk score: ${riskScore}/100 (${riskLevel} risk)`,
      `${severeCount + criticalCount} high-risk clauses detected`,
      `${jargonCount} legal jargon terms found`,
      `Review indemnity and liability clauses carefully`
    ],
    clauses: []
  };
}

export async function analyzeDocumentWithGemini(text: string, fileName: string, retryCount = 0): Promise<AnalysisResult> {
  try {
    // Add delay between retries (exponential backoff)
    if (retryCount > 0) {
      const waitTime = 2000 * Math.pow(2, retryCount - 1);
      console.log(`⏳ Rate limited, waiting ${waitTime/1000}s before retry ${retryCount}/5...`);
      await delay(waitTime);
    }
    
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.substring(0, 8000) }),
    });
    
    // Handle rate limiting (429)
    if (response.status === 429) {
      console.log(`⚠️ Rate limit hit (attempt ${retryCount + 1}/5)`);
      if (retryCount < 5) {
        return analyzeDocumentWithGemini(text, fileName, retryCount + 1);
      }
      console.log('❌ Max retries reached, using fallback analysis');
      return getFallbackAnalysis(text, fileName);
    }
    
    if (!response.ok) {
      console.log(`API error: ${response.status}, using fallback analysis`);
      return getFallbackAnalysis(text, fileName);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log('API error, using fallback analysis');
      return getFallbackAnalysis(text, fileName);
    }
    
    // Merge structured data with legacy fields
    return {
      // Structured fields
      documentType: data.documentType || getFallbackAnalysis(text, fileName).documentType,
      certificateNumber: data.certificateNumber || 'Not specified',
      executionDate: data.executionDate || 'Not specified',
      executionLocation: data.executionLocation || 'Not specified',
      parties: data.parties || { firstParty: { name: '', details: '' }, secondParty: { name: '', details: '' } },
      property: data.property || { address: '', type: '', features: [] },
      financialTerms: data.financialTerms || { monthlyRent: '', securityDeposit: '', otherCharges: [] },
      keyClauses: data.keyClauses || [],
      // Legacy fields for dashboard compatibility
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
    console.error('Analysis error:', error);
    if (retryCount < 5) {
      console.log(`🔄 Retry ${retryCount + 1}/5 after error...`);
      await delay(3000);
      return analyzeDocumentWithGemini(text, fileName, retryCount + 1);
    }
    return getFallbackAnalysis(text, fileName);
  }
}
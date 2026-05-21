'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import mammoth from 'mammoth';
import { Header } from '@/components/layout/Header';
import { 
  MessageCircle, Send, Upload, FileText, Download, 
  Loader2, Trash2, Shield, Flag,
  FolderOpen
} from 'lucide-react';

// AnalysisResult interface
interface AnalysisResult {
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

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentDocuments, setRecentDocuments] = useState<{ name: string; date: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [simplifiedText, setSimplifiedText] = useState('');
  const [simplifying, setSimplifying] = useState(false);
  const [showStructuredView, setShowStructuredView] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('lawsync_user');
      if (!user) router.push('/login');
      setLoading(false);
      const savedDocs = localStorage.getItem('lawsync_documents');
      if (savedDocs) setRecentDocuments(JSON.parse(savedDocs));
    };
    checkAuth();
  }, [router]);

  const addNotification = (message: string, type: string) => {
    console.log(`[${type}] ${message}`);
  };

  const readDOCXFile = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch {
      return 'Could not extract text from DOCX.';
    }
  };

  const simplifyDocument = async () => {
    if (!documentText) { addNotification('No document loaded', 'error'); return; }
    setSimplifying(true);
    try {
      const response = await fetch('/api/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: documentText }),
      });
      const data = await response.json();
      setSimplifiedText(data.simplified);
      addNotification('Document simplified!', 'success');
    } catch {
      addNotification('Simplification failed', 'error');
    } finally {
      setSimplifying(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setIsAnalyzing(true);
    
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('📤 Sending PDF to /api/parse-pdf...');
        
        const parseResponse = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        });
        
        const parseData = await parseResponse.json();
        console.log('📥 Parse response:', parseData);
        
        if (parseData.error) {
          addNotification(parseData.error, 'error');
          setUploading(false);
          setIsAnalyzing(false);
          return;
        }
        
        text = parseData.text;
        
        // Allow any text length - don't reject short text
        if (!text || text.trim().length === 0) {
          addNotification('Could not extract text from PDF. The file may be corrupted or password protected.', 'error');
          setUploading(false);
          setIsAnalyzing(false);
          return;
        }
        
        console.log('📝 Extracted text length:', text.length);
        console.log('📝 First 200 chars:', text.substring(0, 200));
        
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await readDOCXFile(file);
      } else {
        text = await file.text();
      }
      
      if (!text || text.trim().length === 0) {
        addNotification('No text content found', 'error');
        setUploading(false);
        setIsAnalyzing(false);
        return;
      }
      
      setDocumentText(text);
      setActiveDocument(file.name);
      
      console.log('📤 Sending to /api/analyze...');
      
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.substring(0, 8000) }),
      });
      
      const analysisResult = await analysisResponse.json();
      console.log('📊 Analysis result:', analysisResult);
      
      if (analysisResult.error) {
        addNotification('Analysis failed: ' + analysisResult.error, 'error');
      } else {
        setAnalysis(analysisResult);
        addNotification(`Gemini AI analyzed "${file.name}"`, 'success');
      }
      
      const newDoc = { name: file.name, date: new Date().toLocaleDateString() };
      const updatedDocs = [newDoc, ...(recentDocuments || []).slice(0, 4)];
      setRecentDocuments(updatedDocs);
      localStorage.setItem('lawsync_documents', JSON.stringify(updatedDocs));
      
      setChatMessages([{ 
        role: 'assistant', 
        content: `I've analyzed "${file.name}". Risk Score: ${analysisResult.riskScore || '?'}/100. What would you like to know?` 
      }]);
      
    } catch (error) {
      console.error('Upload error:', error);
      addNotification('Failed to analyze document', 'error');
    } finally {
      setUploading(false);
      setIsAnalyzing(false);
    }
  };
  
  const handleDownloadReport = () => {
    if (!analysis || !activeDocument) { addNotification('No document loaded', 'error'); return; }
    
    let report = `LAWSYNC DOCUMENT ANALYSIS REPORT\n`;
    report += `================================\n\n`;
    report += `Document: ${activeDocument}\n`;
    report += `Date: ${new Date().toLocaleString()}\n\n`;
    
    report += `📋 DOCUMENT OVERVIEW\n`;
    report += `-------------------\n`;
    report += `Type: ${analysis.documentType}\n`;
    report += `Certificate: ${analysis.certificateNumber}\n`;
    report += `Execution Date: ${analysis.executionDate}\n`;
    report += `Location: ${analysis.executionLocation}\n\n`;
    
    report += `👥 PARTIES INVOLVED\n`;
    report += `-----------------\n`;
    report += `Owner: ${analysis.parties.firstParty.name}\n`;
    report += `Tenant: ${analysis.parties.secondParty.name}\n\n`;
    
    report += `🏠 PROPERTY DETAILS\n`;
    report += `------------------\n`;
    report += `Address: ${analysis.property.address}\n`;
    report += `Type: ${analysis.property.type}\n`;
    if (analysis.property.features.length > 0) {
      report += `Features: ${analysis.property.features.join(', ')}\n`;
    }
    report += `\n`;
    
    report += `💰 FINANCIAL TERMS\n`;
    report += `----------------\n`;
    report += `Monthly Rent: ${analysis.financialTerms.monthlyRent}\n`;
    report += `Security Deposit: ${analysis.financialTerms.securityDeposit}\n`;
    if (analysis.financialTerms.otherCharges.length > 0) {
      report += `Other Charges: ${analysis.financialTerms.otherCharges.join(', ')}\n`;
    }
    report += `\n`;
    
    report += `⚙️ KEY CLAUSES\n`;
    report += `-------------\n`;
    analysis.keyClauses.forEach((clause, i) => {
      report += `${i + 1}. ${clause.title} (${clause.riskLevel} Risk)\n`;
      report += `   ${clause.description}\n`;
    });
    report += `\n`;
    
    report += `📊 RISK ASSESSMENT\n`;
    report += `----------------\n`;
    report += `Risk Score: ${analysis.riskScore}/100\n`;
    report += `Risk Level: ${analysis.riskLevel}\n`;
    report += `Summary: ${analysis.summary}\n`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lawsync_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Report downloaded', 'success');
  };
  
  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', content: chatInput }, { role: 'assistant', content: '...' }]);
    const userMessage = chatInput;
    setChatInput('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, documentContext: documentText?.substring(0, 3000) }),
      });
      const data = await response.json();
      setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: data.reply }]);
    } catch {
      setChatMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    }
  };
  
  const clearChat = () => { setChatMessages([]); addNotification('Chat cleared', 'info'); };
  const deleteDocument = () => { setActiveDocument(null); setDocumentText(''); setAnalysis(null); setSimplifiedText(''); addNotification('Document removed', 'info'); };
  
  if (loading) return <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>;
  
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 dark:bg-linear-to-br dark:from-slate-900 dark:via-slate-800 dark:to-blue-900">        <div className="flex">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900/50 backdrop-blur-sm border-r border-slate-800 min-h-[calc(100vh-60px)] transition-all duration-300 hidden lg:block`}>
            <nav className="p-4 space-y-1">
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-slate-800 rounded-lg transition group">
                <FolderOpen className="w-5 h-5 group-hover:text-blue-400 transition" />
                <span className={sidebarOpen ? 'block' : 'hidden'}>Upload Document</span>
              </button>
              <button onClick={clearChat} className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-slate-800 rounded-lg transition group">
                <Trash2 className="w-5 h-5 group-hover:text-blue-400 transition" />
                <span className={sidebarOpen ? 'block' : 'hidden'}>Clear Chat</span>
              </button>
              <button onClick={handleDownloadReport} className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-slate-800 rounded-lg transition group">
                <Download className="w-5 h-5 group-hover:text-blue-400 transition" />
                <span className={sidebarOpen ? 'block' : 'hidden'}>Export Report</span>
              </button>
              <button onClick={simplifyDocument} disabled={!activeDocument || simplifying} className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:bg-slate-800 rounded-lg transition group">
                <FileText className="w-5 h-5 group-hover:text-blue-400 transition" />
                <span className={sidebarOpen ? 'block' : 'hidden'}>{simplifying ? 'Simplifying...' : 'Simplify Document'}</span>
              </button>
            </nav>
          </aside>
          
          <main className="flex-1 p-6 overflow-x-auto">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx,.txt" className="hidden" />
            
            {uploading && (
              <div className="fixed bottom-4 right-4 bg-slate-800 rounded-lg shadow-lg p-3 z-50 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-white text-sm">Uploading and analyzing...</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN - Document Workspace */}
              <div className="lg:col-span-2 space-y-6">
                {/* Upload Widget */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-slate-800/50 transition cursor-pointer group">
                    {isAnalyzing ? <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-spin" />
                      : <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3 group-hover:text-blue-400 transition" />}
                    <p className="text-gray-300 font-medium text-lg">{isAnalyzing ? 'Gemini AI is analyzing...' : activeDocument || 'Upload Legal Document for Analysis'}</p>
                    <p className="text-gray-500 text-sm mt-1">PDF, DOCX, TXT up to 10MB</p>
                    {activeDocument && <button onClick={(e) => { e.stopPropagation(); deleteDocument(); }} className="mt-3 text-red-400 text-sm hover:text-red-300">Remove document</button>}
                  </div>
                </div>
                
                {/* Document Viewer with Structured Display */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium">{activeDocument || 'No document loaded'}</span>
                    </div>
                    {analysis && (
                      <div className="flex gap-2">
                        <button onClick={() => setShowStructuredView(true)} className={`px-3 py-1 rounded-lg text-sm transition ${showStructuredView ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                          Structured View
                        </button>
                        <button onClick={() => setShowStructuredView(false)} className={`px-3 py-1 rounded-lg text-sm transition ${!showStructuredView ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                          Raw Text
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 h-500px overflow-y-auto">
                    {!analysis && !documentText && (
                      <div className="text-center text-gray-500 py-20">
                        <Upload className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                        <p>Upload a document to see analysis</p>
                      </div>
                    )}
                    
                    {showStructuredView && analysis ? (
                      <div className="space-y-6">
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">📋 DOCUMENT OVERVIEW</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-gray-400">Document Type:</p>
                            <p className="text-white">{analysis.documentType}</p>
                            <p className="text-gray-400">Certificate No:</p>
                            <p className="text-white">{analysis.certificateNumber}</p>
                            <p className="text-gray-400">Execution Date:</p>
                            <p className="text-white">{analysis.executionDate}</p>
                            <p className="text-gray-400">Location:</p>
                            <p className="text-white">{analysis.executionLocation}</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">👥 PARTIES INVOLVED</h4>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-400">Owner:</span> <span className="text-white">{analysis.parties.firstParty.name}</span></p>
                            <p><span className="text-gray-400">Tenant:</span> <span className="text-white">{analysis.parties.secondParty.name}</span></p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">💰 FINANCIAL TERMS</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-gray-400">Monthly Rent:</p>
                            <p className="text-white font-semibold">{analysis.financialTerms.monthlyRent}</p>
                            <p className="text-gray-400">Security Deposit:</p>
                            <p className="text-white">{analysis.financialTerms.securityDeposit}</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">⚙️ KEY CLAUSES</h4>
                          <div className="space-y-3">
                            {analysis.keyClauses.map((clause, idx) => (
                              <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                                clause.riskLevel === 'High' ? 'border-red-500 bg-red-500/10' : 
                                clause.riskLevel === 'Medium' ? 'border-yellow-500 bg-yellow-500/10' : 
                                'border-green-500 bg-green-500/10'
                              }`}>
                                <p className="font-semibold text-white text-sm">{clause.title}</p>
                                <p className="text-gray-300 text-xs mt-1">{clause.description}</p>
                                <p className={`text-xs mt-2 ${
                                  clause.riskLevel === 'High' ? 'text-red-400' : 
                                  clause.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                                }`}>Risk: {clause.riskLevel}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">📊 RISK ASSESSMENT</h4>
                          <div className="text-center">
                            <div className="text-4xl font-bold text-yellow-400">{analysis.riskScore}/100</div>
                            <p className={`text-sm mt-2 font-semibold ${
                              analysis.riskLevel === 'Low' ? 'text-green-400' : 
                              analysis.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                            }`}>{analysis.riskLevel} Risk</p>
                            <p className="text-gray-400 text-xs mt-3">{analysis.summary}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-300 whitespace-pre-wrap">
                        {simplifiedText ? simplifiedText : (documentText ? documentText.substring(0, 5000) : 'Upload a document to see analysis')}
                      </div>
                    )}
                  </div>
                  
                  {simplifiedText && documentText && (
                    <div className="p-3 border-t border-slate-700 bg-slate-800/50 flex justify-between">
                      <button onClick={() => setSimplifiedText('')} className="text-blue-400 text-sm">View Original</button>
                      <button onClick={() => setShowStructuredView(true)} className="text-blue-400 text-sm">View Structured</button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* RIGHT COLUMN - Analysis Panel (Quick Stats) */}
              <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                  <h3 className="text-gray-400 text-sm font-semibold mb-4">Risk Scorecard</h3>
                  <div className="text-center">
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="#1e293b" strokeWidth="12"/>
                        <circle cx="64" cy="64" r="56" fill="none" stroke={analysis?.riskScore && analysis.riskScore > 66 ? '#ef4444' : analysis?.riskScore && analysis.riskScore > 33 ? '#eab308' : '#22c55e'} strokeWidth="12" strokeDasharray="352" strokeDashoffset={352 - (352 * (analysis?.riskScore || 0) / 100)}/>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{analysis?.riskScore || '-'}</span>
                        <span className="text-gray-400 text-xs">/100</span>
                      </div>
                    </div>
                    <p className={`text-sm mt-3 font-semibold ${analysis?.riskLevel === 'Low' ? 'text-green-400' : analysis?.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>{analysis?.riskLevel || 'No Data'}</p>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                  <h4 className="text-gray-300 text-sm font-semibold flex items-center gap-2 mb-4"><Flag className="w-4 h-4 text-red-400" /> Red Flags</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-red-500/10 rounded"><span>Severe</span><span className="font-bold text-red-400">{analysis?.redFlags.severe || 0}</span></div>
                    <div className="flex justify-between p-2 bg-yellow-500/10 rounded"><span>Critical</span><span className="font-bold text-yellow-400">{analysis?.redFlags.critical || 0}</span></div>
                    <div className="flex justify-between p-2 bg-blue-500/10 rounded"><span>Current</span><span className="font-bold text-blue-400">{analysis?.redFlags.current || 0}</span></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chat Section */}
            <div className="mt-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-2"><MessageCircle className="w-5 h-5 text-blue-400" /><h3 className="text-white font-semibold">LAWSYNC AI</h3></div>
                  <button onClick={clearChat} className="text-gray-400 text-sm">Clear</button>
                </div>
                <div className="h-80 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-200'}`}>{msg.content}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-slate-700 flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask about your document..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 outline-none" disabled={!activeDocument} />
                  <button onClick={sendMessage} disabled={!activeDocument} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"><Send className="w-4 h-4 text-white" /></button>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-6 flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
              <p className="text-gray-400 text-xs flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" /> AI analysis by Google Gemini. Not legal advice.</p>
              <button onClick={handleDownloadReport} disabled={!activeDocument} className="px-4 py-2 bg-blue-600 rounded-lg disabled:opacity-50"><Download className="w-4 h-4 text-white inline mr-2" /> Report</button>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
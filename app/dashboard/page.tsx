'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeDocumentWithGemini, AnalysisResult } from '@/lib/documentAnalysis';
import mammoth from 'mammoth';
import { 
  MessageCircle, Send, Upload, 
  ChevronDown,
  Bell,
  History, Search, Download, Flag,
  Menu, FolderOpen, Globe,
  Shield, Loader2, Trash2, LogOut
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string; link?: string; linkTarget?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentDocuments, setRecentDocuments] = useState<{ name: string; date: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jurisdiction, setJurisdiction] = useState('India');
  const [showJurisdictionMenu, setShowJurisdictionMenu] = useState(false);

  // Check auth using localStorage
  useEffect(() => {
    const checkAuth = () => {
      const user = localStorage.getItem('lawsync_user');
      if (!user) {
        router.push('/login');
      }
      setLoading(false);
      
      const savedDocs = localStorage.getItem('lawsync_documents');
      if (savedDocs) {
        setRecentDocuments(JSON.parse(savedDocs));
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem('lawsync_user');
    localStorage.removeItem('auth_token');
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const readPDFFile = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        return `[PDF Error: ${data.error || 'Could not parse PDF'}]`;
      }
      
      if (!data.text || data.text.trim().length === 0) {
        return '[PDF Error: No text content found. Try a TXT file.]';
      }
      
      return data.text;
    } catch {
      return '[PDF Error: Failed to process PDF. Please try a TXT or DOCX file.]';
    }
  };
  
  const readDOCXFile = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch {
      return 'Could not extract text from DOCX. Please try a different file.';
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
        text = await readPDFFile(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await readDOCXFile(file);
      } else {
        text = await file.text();
      }
      
      if (text.includes('Error') || text.length < 50) {
        addNotification(text, 'error');
        setUploading(false);
        setIsAnalyzing(false);
        return;
      }
      
      setDocumentText(text);
      setActiveDocument(file.name);
      
      const analysisResult = await analyzeDocumentWithGemini(text, file.name);
      setAnalysis(analysisResult);
      
      const newDoc = { name: file.name, date: new Date().toLocaleDateString() };
      const updatedDocs = [newDoc, ...(recentDocuments || []).slice(0, 4)];
      setRecentDocuments(updatedDocs);
      localStorage.setItem('lawsync_documents', JSON.stringify(updatedDocs));
      
      setChatMessages([{
        role: 'assistant',
        content: `I've analyzed "${file.name}" using Gemini AI.\n\n📊 Risk Score: ${analysisResult.riskScore}/100 (${analysisResult.riskLevel})\n📋 Summary: ${analysisResult.summary}\n\nWhat would you like to know?`,
      }]);
      
      addNotification(`Gemini AI analyzed "${file.name}"`, 'success');
      
    } catch {
      addNotification('Failed to analyze document', 'error');
    } finally {
      setUploading(false);
      setIsAnalyzing(false);
    }
  };
  
  const addNotification = (message: string, type: string) => {
    setNotifications(prev => [{ id: Date.now(), message, type }, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== Date.now()));
    }, 5000);
  };
  
  const handleDownloadReport = () => {
    if (!analysis || !activeDocument) {
      addNotification('No document loaded', 'error');
      return;
    }
    
    const report = `
LAWSYNC DOCUMENT ANALYSIS REPORT
================================
Document: ${activeDocument}
Date: ${new Date().toLocaleString()}
Risk Score: ${analysis.riskScore}/100 (${analysis.riskLevel})
Jurisdiction: ${analysis.jurisdiction}
Severe Red Flags: ${analysis.redFlags.severe}
Critical Content: ${analysis.redFlags.critical}
Summary: ${analysis.summary}
    `;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lawsync_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    addNotification('Report downloaded', 'success');
  };
  
  const handleSearch = () => {
    if (!searchQuery.trim() || !documentText) {
      addNotification('No document loaded', 'error');
      return;
    }
    
    const results = documentText.match(new RegExp(`.{0,50}${searchQuery}.{0,50}`, 'gi')) || [];
    addNotification(`Found ${results.length} matches for "${searchQuery}"`, 'info');
  };
  
  const handleJurisdictionChange = (newJurisdiction: string) => {
    setJurisdiction(newJurisdiction);
    setShowJurisdictionMenu(false);
    addNotification(`Jurisdiction changed to ${newJurisdiction}`, 'info');
    if (analysis) {
      setAnalysis({ ...analysis, jurisdiction: `${newJurisdiction} (Central Laws)` });
    }
  };
  
  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || chatInput;
    if (!messageToSend.trim()) return;
    
    setChatMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'assistant', content: '...' }]);
    
    try {
      const history = chatMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      let messageWithContext = messageToSend;
      if (documentText) {
        messageWithContext = `Document: ${activeDocument}\n\nQuestion: ${messageToSend}`;
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageWithContext, history }),
      });
      
      const data = await response.json();
      
      setChatMessages(prev => [...prev.slice(0, -1), { 
        role: 'assistant', 
        content: data.reply,
      }]);
      
    } catch {
      setChatMessages(prev => [...prev.slice(0, -1), { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error.' 
      }]);
    }
  };
  
  const handlePromptSuggestion = (suggestion: string) => {
    setChatInput(suggestion);
    sendMessage(suggestion);
  };
  
  const clearChat = () => {
    setChatMessages([]);
    addNotification('Chat cleared', 'info');
  };
  
  const deleteDocument = () => {
    setActiveDocument(null);
    setDocumentText('');
    setAnalysis(null);
    setChatMessages([]);
    addNotification('Document removed', 'info');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-blue-900">
      
      {/* GLOBAL TOP HEADER */}
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-30">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition lg:hidden">
                <Menu className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <span className="font-semibold text-white text-lg">LawSync</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center bg-slate-800/80 rounded-lg px-4 py-2 w-96 border border-slate-700">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search within document..." 
                className="bg-transparent border-none outline-none text-white text-sm ml-3 w-full placeholder-gray-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {/* History Dropdown */}
              <div className="relative">
                <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-slate-800 rounded-lg transition text-gray-300">
                  <History className="w-5 h-5" />
                </button>
                {showHistory && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40">
                    <div className="p-3 border-b border-slate-700">
                      <p className="text-xs text-gray-400 font-medium">RECENT DOCUMENTS</p>
                    </div>
                    {recentDocuments.map((doc, i) => (
                      <div key={i} className="px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 cursor-pointer">
                        📄 {doc.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            
              {/* Notifications */}
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 hover:bg-slate-800 rounded-lg relative">
                  <Bell className="w-5 h-5 text-gray-300" />
                  {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40">
                    <div className="p-3 border-b border-slate-700">
                      <p className="text-xs text-gray-400 font-medium">NOTIFICATIONS</p>
                    </div>
                    {notifications.map((n) => (
                      <div key={n.id} className="px-4 py-2 text-sm text-gray-300">
                        {n.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Jurisdiction Toggle */}
              <div className="relative">
                <button onClick={() => setShowJurisdictionMenu(!showJurisdictionMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition">
                  <Globe className="w-4 h-4 text-gray-300" />
                  <span className="text-sm text-gray-300 font-medium">{jurisdiction}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
                {showJurisdictionMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-40">
                    <button onClick={() => handleJurisdictionChange('India')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">🇮🇳 India</button>
                    <button onClick={() => handleJurisdictionChange('USA')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">🇺🇸 USA</button>
                    <button onClick={() => handleJurisdictionChange('UK')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700">🇬🇧 UK</button>
                  </div>
                )}
              </div>
              
              {/* Logout Button */}
              <button onClick={handleLogout} className="w-8 h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center hover:opacity-90 transition">
                <LogOut className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* LEFT SIDEBAR */}
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
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-slate-800/50 transition cursor-pointer group">
                  {isAnalyzing ? (
                    <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-spin" />
                  ) : (
                    <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3 group-hover:text-blue-400 transition" />
                  )}
                  <p className="text-gray-300 font-medium text-lg">
                    {isAnalyzing ? 'Gemini AI is analyzing...' : activeDocument || 'Upload Legal Document for Analysis'}
                  </p>
                  <p className="text-gray-500 text-sm mt-1">PDF, DOCX, TXT up to 10MB</p>
                  {activeDocument && (
                    <button onClick={(e) => { e.stopPropagation(); deleteDocument(); }} className="mt-3 text-red-400 text-sm hover:text-red-300">
                      Remove document
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
                <div className="p-6 h-112.5 overflow-y-auto text-gray-300 whitespace-pre-wrap">
                  {documentText ? documentText.substring(0, 3000) : 'Upload a document to see analysis'}
                </div>
              </div>
            </div>
            
            {/* RIGHT COLUMN - Analysis Panel */}
            <div className="space-y-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                <h3 className="text-gray-400 text-sm font-semibold mb-4">Risk Scorecard</h3>
                <div className="text-center">
                  <span className="text-5xl font-bold text-yellow-400">{analysis?.riskScore || '-'}</span>
                  <span className="text-gray-400">/100</span>
                  <p className={`text-sm mt-2 font-semibold ${
                    analysis?.riskLevel === 'Low' ? 'text-green-400' : 
                    analysis?.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{analysis?.riskLevel || 'No Data'}</p>
                </div>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
                <h4 className="text-gray-300 text-sm font-semibold flex items-center gap-2 mb-4">
                  <Flag className="w-4 h-4 text-red-400" /> Red Flags
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-red-500/10 rounded"><span>Severe</span><span className="font-bold text-red-400">{analysis?.redFlags.severe || 0}</span></div>
                  <div className="flex justify-between p-2 bg-yellow-500/10 rounded"><span>Critical</span><span className="font-bold text-yellow-400">{analysis?.redFlags.critical || 0}</span></div>
                  <div className="flex justify-between p-2 bg-blue-500/10 rounded"><span>Current</span><span className="font-bold text-blue-400">{analysis?.redFlags.current || 0}</span></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* CHAT SECTION */}
          <div className="mt-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold">LAWSYNC AI</h3>
                </div>
                <button onClick={clearChat} className="text-gray-400 text-sm">Clear</button>
              </div>
              
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-200'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-slate-700 flex gap-2 flex-wrap">
                <button onClick={() => handlePromptSuggestion('Summarize the contract')} className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-1 rounded-full">Summarize</button>
                <button onClick={() => handlePromptSuggestion('What are the risks?')} className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-1 rounded-full">Risks</button>
                <button onClick={() => handlePromptSuggestion('Explain liability')} className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 px-3 py-1 rounded-full">Liability</button>
              </div>
              
              <div className="p-4 border-t border-slate-700 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask about your document..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 outline-none"
                  disabled={!activeDocument}
                />
                <button onClick={() => sendMessage()} disabled={!activeDocument} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
          
          {/* FOOTER */}
          <div className="mt-6 flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
            <p className="text-gray-400 text-xs flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              AI analysis by Google Gemini. Not legal advice.
            </p>
            <button onClick={handleDownloadReport} disabled={!activeDocument} className="px-4 py-2 bg-blue-600 rounded-lg disabled:opacity-50">
              <Download className="w-4 h-4 text-white inline mr-2" /> Report
            </button>
          </div>
        </main>
      </div>
      
      <style jsx>{`
        .highlight-flash { animation: flash 0.5s; }
        @keyframes flash { 50% { background-color: rgba(59,130,246,0.3); } }
      `}</style>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { FileText, Download } from 'lucide-react';

export default function DocumentPanel() {
  const [docType, setDocType] = useState('demand');
  const [details, setDetails] = useState('');
  const [generated, setGenerated] = useState('');

  const templates = {
    demand: 'Demand Letter for Payment',
    complaint: 'Consumer Complaint Letter',
    termination: 'Employment Termination Notice',
    tenant: 'Tenant Notice to Landlord',
  };

  const generateDocument = () => {
    // Simple template-based generation for now
    const docs = {
      demand: `Dear Sir/Madam,\n\nThis is a formal demand for payment of ₹${details} which is overdue. Please make the payment within 7 days.\n\nSincerely,\n[Your Name]`,
      complaint: `To,\nThe Consumer Forum\n\nSubject: Complaint against [Company Name]\n\nDear Sir,\n\nI wish to file a complaint regarding...`,
      termination: `Dear Employee,\n\nPlease accept this letter as formal notice of termination of your employment, effective [Date].\n\nSincerely,\n[Company Name]`,
      tenant: `To,\nThe Landlord\n\nSubject: Notice of Repair Issues\n\nDear Sir,\n\nI am writing to bring the following issues to your attention...`,
    };
    setGenerated(docs[docType as keyof typeof docs]);
  };

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-4 border-b bg-linear-to-r from-green-500/20 to-teal-500/20">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-400" />
          <h2 className="font-bold text-white">Document Tools</h2>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full glass rounded-lg px-3 py-2 text-white"
        >
          {Object.entries(templates).map(([key, label]) => (
            <option key={key} value={key} className="bg-gray-800">{label}</option>
          ))}
        </select>
        
        <textarea
          placeholder="Enter details (amounts, names, dates...)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="w-full glass rounded-lg px-3 py-2 text-white placeholder-white/50 text-sm"
        />
        
        <button
          onClick={generateDocument}
          className="w-full bg-linear-to-r from-blue-500 to-purple-600 py-2 rounded-lg font-semibold"
        >
          Generate Document
        </button>
        
        {generated && (
          <div className="mt-4">
            <div className="glass rounded-lg p-3 max-h-40 overflow-y-auto text-white/80 text-sm whitespace-pre-wrap">
              {generated}
            </div>
            <button className="mt-2 text-blue-400 text-sm flex items-center gap-1">
              <Download className="w-3 h-3" /> Download
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
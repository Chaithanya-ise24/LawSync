'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { BookOpen, AlertCircle } from 'lucide-react';

const resources = [
  { title: '🏠 Tenant Rights India', desc: 'Rent control, eviction, deposit' },
  { title: '💼 Consumer Protection Act', desc: 'Defective products, refunds' },
  { title: '📄 Employment Contracts', desc: 'Notice period, termination' },
  { title: '🛡️ Cyber Law Basics', desc: 'Online fraud, data privacy' },
];

export default function LegalHubPanel() {
  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-4 border-b bg-linear-to-r from-purple-500/20 to-pink-500/20">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-white">Legal Hub</h2>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {resources.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3 glass rounded-xl hover:bg-white/10 cursor-pointer">
            <div>
              <div className="font-semibold text-white text-sm">{item.title}</div>
              <div className="text-white/40 text-xs">{item.desc}</div>
            </div>
            <span className="text-white/30 text-xs">→</span>
          </div>
        ))}
        
        <div className="mt-4 p-3 glass-dark rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
            <p className="text-white/70 text-xs">
              This AI provides legal information, not legal advice. 
              For complex matters, consult a licensed attorney.
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
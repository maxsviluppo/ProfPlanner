import React from 'react';
import { X, ArrowLeft, Clock } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void; // Kept for interface compatibility but unused in blocking mode
  conflicts: string[];
}

const ConflictModal: React.FC<ConflictModalProps> = ({ isOpen, onClose, conflicts }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-red-500/10 flex items-start gap-4">
          <div className="bg-red-500/20 p-3 rounded-full shrink-0 text-red-400">
             <Clock size={28} />
          </div>
          <div className="flex-1">
             <h3 className="text-xl font-bold text-white mb-1">Sovrapposizione Orari</h3>
             <p className="text-red-200/80 text-sm leading-relaxed">
               Impossibile salvare. Gli orari inseriti entrano in conflitto con altre lezioni già programmate.
             </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-slate-900 to-slate-800">
           <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Conflitti Rilevati ({conflicts.length})</h4>
           <div className="space-y-2">
             {conflicts.map((msg, index) => (
               <div key={index} className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <p className="text-sm text-slate-200 font-medium leading-snug">
                    {msg.replace('CONFLITTO:', '').trim()}
                  </p>
               </div>
             ))}
           </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-slate-900 flex justify-end">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-900/20 transition font-bold text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Torna indietro e correggi
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConflictModal;
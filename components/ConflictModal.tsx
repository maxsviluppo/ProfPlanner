import React from 'react';
import { AlertTriangle, X, Check, ArrowRight } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflicts: string[];
}

const ConflictModal: React.FC<ConflictModalProps> = ({ isOpen, onClose, onConfirm, conflicts }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-amber-500/10 flex items-start gap-4">
          <div className="bg-amber-500/20 p-3 rounded-full shrink-0 text-amber-400">
             <AlertTriangle size={28} />
          </div>
          <div className="flex-1">
             <h3 className="text-xl font-bold text-white mb-1">Conflitti Rilevati</h3>
             <p className="text-amber-200/80 text-sm leading-relaxed">
               Attenzione, ci sono delle sovrapposizioni di orario con altre lezioni già presenti.
             </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-slate-900 to-slate-800">
           <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Dettagli sovrapposizioni ({conflicts.length})</h4>
           <div className="space-y-2">
             {conflicts.map((msg, index) => (
               <div key={index} className="bg-white/5 border border-white/5 p-3 rounded-lg flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <p className="text-sm text-slate-300 font-medium leading-snug">{msg.replace('CONFLITTO:', '').replace('INTERNO:', '').trim()}</p>
               </div>
             ))}
           </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 bg-slate-900 flex flex-col sm:flex-row gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition font-medium text-sm"
          >
            Annulla e correggi
          </button>
          
          <button 
            onClick={onConfirm}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-900/20 transition font-bold text-sm flex items-center justify-center gap-2 group"
          >
            <Check size={16} />
            Salva Comunque
            <ArrowRight size={16} className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConflictModal;
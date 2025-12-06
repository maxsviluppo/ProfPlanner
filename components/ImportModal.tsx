import React, { useState } from 'react';
import { parseScheduleData } from '../services/geminiService';
import { Course } from '../types';
import { Loader2, X, FileText, Sparkles } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (courses: Course[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const courses = await parseScheduleData(inputText);
      if (courses.length === 0) {
        setError("L'AI non ha trovato corsi validi nel testo. Riprova con un formato più chiaro.");
      } else {
        onImport(courses);
        setInputText('');
        onClose();
      }
    } catch (err) {
      // Logghiamo l'errore per evitare "unused variable" in TypeScript strict mode
      console.error("Import error:", err);
      setError("Errore durante l'elaborazione. Verifica la connessione o i dati.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-purple-400" size={20} />
              Importazione Intelligente
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Incolla qui sotto i dati dal tuo file Excel, PDF o email. L'AI organizzerà tutto.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 flex flex-col gap-4">
          <div className="relative flex-1">
            <textarea
              className="w-full h-64 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono text-sm"
              placeholder={`Esempio di dati incollati:
Lunedì 21/10 Informatica 09:00-13:00 Aula 3
Martedì 22/10 Inglese 14:00-16:00 Online
...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition font-medium"
          >
            Annulla
          </button>
          <button
            onClick={handleProcess}
            disabled={isLoading || !inputText.trim()}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Analisi in corso...
              </>
            ) : (
              <>
                <FileText size={18} />
                Elabora Diario
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
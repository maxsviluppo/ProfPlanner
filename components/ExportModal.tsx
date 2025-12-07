import React, { useState, useMemo } from 'react';
import { Course, Institute } from '../types';
import { X, FileText, Calendar, Download, Share2, Copy, CheckCircle2, Filter, Sun } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  institutes: Institute[];
}

type ExportType = 'COURSES' | 'FREE_TIME';
type DateRangeType = 'MONTH' | 'CUSTOM';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, courses, institutes }) => {
  // State for Configuration
  const [exportType, setExportType] = useState<ExportType>('COURSES');
  const [rangeType, setRangeType] = useState<DateRangeType>('MONTH');
  
  // Date Filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Course Filters
  const [filterInstitute, setFilterInstitute] = useState<string>('');
  const [filterCourseName, setFilterCourseName] = useState<string>('');

  // Result State
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Extract unique course names for dropdown
  const uniqueNames = useMemo(() => Array.from(new Set(courses.map(c => c.name))).sort(), [courses]);

  if (!isOpen) return null;

  // --- LOGIC: DATE GENERATION ---
  const getDatesInRange = (startDate: Date, endDate: Date) => {
    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  // --- LOGIC: GENERATE REPORT ---
  const handleGenerate = () => {
    let startDate: Date;
    let endDate: Date;

    // 1. Determine Date Range
    if (rangeType === 'MONTH') {
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 0);
    } else {
      if (!customStartDate || !customEndDate) {
        alert("Seleziona data inizio e fine.");
        return;
      }
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    }

    // Adjust for timezone issues when comparing strings
    // We normalize to YYYY-MM-DD string comparison which is safer for this app structure
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    let result = "";

    // --- MODE A: COURSES LIST ---
    if (exportType === 'COURSES') {
      // Filter Courses
      const filtered = courses.filter(c => {
         const inRange = c.date >= startStr && c.date <= endStr;
         const matchInst = !filterInstitute || c.instituteId === filterInstitute;
         const matchName = !filterCourseName || c.name === filterCourseName;
         return inRange && matchInst && matchName;
      }).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

      if (filtered.length === 0) {
        setGeneratedText("Nessun corso trovato con i filtri selezionati.");
        return;
      }

      result += `📅 REPORT CORSI\n`;
      result += `Periodo: ${new Date(startStr).toLocaleDateString('it-IT')} - ${new Date(endStr).toLocaleDateString('it-IT')}\n`;
      result += `--------------------------\n\n`;

      filtered.forEach(c => {
         const dateFormatted = new Date(c.date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' });
         const inst = institutes.find(i => i.id === c.instituteId)?.name || 'N/D';
         result += `🔹 ${dateFormatted} | ${c.startTime}-${c.endTime}\n`;
         result += `   ${c.name} (${inst})\n\n`;
      });
      
      result += `Totale lezioni: ${filtered.length}`;
    } 
    // --- MODE B: FREE TIME ---
    else {
      result += `🏝️ REPORT DISPONIBILITÀ\n`;
      result += `Periodo: ${new Date(startStr).toLocaleDateString('it-IT')} - ${new Date(endStr).toLocaleDateString('it-IT')}\n`;
      result += `(Esclusi Sabato e Domenica)\n`;
      result += `--------------------------\n\n`;

      const allDates = getDatesInRange(startDate, endDate);
      let foundFreeDays = 0;

      allDates.forEach(d => {
        const dayOfWeek = d.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip Sat (6) and Sun (0)

        const dateStr = d.toISOString().split('T')[0];
        const dateFormatted = d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' });

        // Find courses for this specific day
        const dayCourses = courses.filter(c => c.date === dateStr);

        if (dayCourses.length === 0) {
          // Whole day free
          result += `✅ ${dateFormatted}: TUTTO IL GIORNO LIBERO\n`;
          foundFreeDays++;
        } else {
          // Check Morning / Afternoon (Threshold 14:00)
          const isMorningBusy = dayCourses.some(c => parseInt(c.startTime.split(':')[0]) < 14);
          const isAfternoonBusy = dayCourses.some(c => parseInt(c.startTime.split(':')[0]) >= 14);

          // Logic:
          // If morning is busy but afternoon is NOT -> Afternoon Free
          // If afternoon is busy but morning is NOT -> Morning Free
          
          if (!isMorningBusy && isAfternoonBusy) {
             result += `☀️ ${dateFormatted}: MATTINA LIBERA\n`;
             foundFreeDays++;
          } else if (isMorningBusy && !isAfternoonBusy) {
             result += `🌙 ${dateFormatted}: POMERIGGIO LIBERO\n`;
             foundFreeDays++;
          }
          // If both busy, we don't list it as "free"
        }
      });

      if (foundFreeDays === 0) {
         result += "Nessuna disponibilità trovata nel periodo selezionato (o solo Sab/Dom).";
      }
    }

    setGeneratedText(result);
  };

  const handleCopy = async () => {
    if (generatedText) {
      await navigator.clipboard.writeText(generatedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleShare = async () => {
    if (generatedText && navigator.share) {
      try {
        await navigator.share({
          title: 'ProfPlanner Report',
          text: generatedText,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
        handleCopy();
        alert("Funzione di condivisione non supportata. Il testo è stato copiato negli appunti.");
    }
  };

  const reset = () => {
      setGeneratedText(null);
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="text-blue-400" size={24} />
            Esporta Dati
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
           
           {!generatedText ? (
             <div className="space-y-6">
                
                {/* 1. Choose Type */}
                <div className="grid grid-cols-2 gap-3">
                   <button 
                     onClick={() => setExportType('COURSES')}
                     className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${exportType === 'COURSES' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700'}`}
                   >
                      <FileText size={24} />
                      <span className="text-sm font-bold">Lista Corsi</span>
                   </button>
                   <button 
                     onClick={() => setExportType('FREE_TIME')}
                     className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${exportType === 'FREE_TIME' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700'}`}
                   >
                      <Sun size={24} />
                      <span className="text-sm font-bold">Giorni Liberi</span>
                   </button>
                </div>

                {/* 2. Choose Range */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-4">
                   <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Calendar size={14} /> Periodo Temporale
                   </h3>
                   
                   <div className="flex gap-2 mb-2">
                      <button 
                        onClick={() => setRangeType('MONTH')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${rangeType === 'MONTH' ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-slate-400'}`}
                      >
                        Per Mese
                      </button>
                      <button 
                        onClick={() => setRangeType('CUSTOM')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${rangeType === 'CUSTOM' ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-slate-400'}`}
                      >
                        Personalizzato
                      </button>
                   </div>

                   {rangeType === 'MONTH' ? (
                      <div className="flex gap-2">
                         <select 
                           className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm outline-none"
                           value={selectedMonth}
                           onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                         >
                            {Array.from({length: 12}, (_, i) => (
                               <option key={i} value={i}>{new Date(2000, i, 1).toLocaleDateString('it-IT', { month: 'long' })}</option>
                            ))}
                         </select>
                         <select 
                           className="w-24 bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm outline-none"
                           value={selectedYear}
                           onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                         >
                            <option value={selectedYear - 1}>{selectedYear - 1}</option>
                            <option value={selectedYear}>{selectedYear}</option>
                            <option value={selectedYear + 1}>{selectedYear + 1}</option>
                         </select>
                      </div>
                   ) : (
                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                            <label className="text-[10px] text-slate-400">Da</label>
                            <input 
                              type="date" 
                              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm [color-scheme:dark]" 
                              value={customStartDate}
                              onChange={e => setCustomStartDate(e.target.value)}
                            />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-slate-400">A</label>
                            <input 
                              type="date" 
                              className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm [color-scheme:dark]" 
                              value={customEndDate}
                              onChange={e => setCustomEndDate(e.target.value)}
                            />
                         </div>
                      </div>
                   )}
                </div>

                {/* 3. Filters (Only for Courses) */}
                {exportType === 'COURSES' && (
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-4 animate-in slide-in-from-right-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Filter size={14} /> Filtri Opzionali
                    </h3>
                    
                    <div className="space-y-2">
                       <select 
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm outline-none"
                          value={filterInstitute}
                          onChange={(e) => setFilterInstitute(e.target.value)}
                       >
                          <option value="">Tutte le scuole</option>
                          {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                       </select>

                       <select 
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-white text-sm outline-none"
                          value={filterCourseName}
                          onChange={(e) => setFilterCourseName(e.target.value)}
                       >
                          <option value="">Tutti i corsi</option>
                          {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
                       </select>
                    </div>
                  </div>
                )}
             </div>
           ) : (
             <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="text-sm font-bold text-white">Anteprima Report</h3>
                   <button onClick={reset} className="text-xs text-blue-400 hover:underline">Modifica parametri</button>
                </div>
                <textarea 
                  className="flex-1 w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm font-mono text-slate-300 resize-none focus:outline-none"
                  readOnly
                  value={generatedText}
                />
             </div>
           )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex gap-3">
           {!generatedText ? (
             <button 
               onClick={handleGenerate}
               className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition"
             >
               Genera Report
             </button>
           ) : (
             <>
                <button 
                  onClick={handleCopy}
                  className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${copySuccess ? 'bg-green-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                >
                  {copySuccess ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                  {copySuccess ? 'Copiato!' : 'Copia'}
                </button>
                <button 
                  onClick={handleShare}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Share2 size={18} /> Condividi
                </button>
             </>
           )}
        </div>

      </div>
    </div>
  );
};

export default ExportModal;
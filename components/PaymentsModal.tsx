import React, { useState, useMemo } from 'react';
import { Course, Institute } from '../types';
import { X, Wallet, Filter, CheckCircle2, Circle, Calculator, Calendar, Tag, ArrowUpDown } from 'lucide-react';

interface PaymentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  institutes: Institute[];
  onUpdateCourses: (courses: Course[]) => void;
}

const PaymentsModal: React.FC<PaymentsModalProps> = ({ isOpen, onClose, courses, institutes, onUpdateCourses }) => {
  const [activeTab, setActiveTab] = useState<'to_pay' | 'paid'>('to_pay');
  const [selectedInstituteFilter, setSelectedInstituteFilter] = useState<string>('');
  const [selectedNameFilter, setSelectedNameFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Extract unique course names for filter
  const uniqueNames = useMemo(() => Array.from(new Set(courses.map(c => c.name))).sort(), [courses]);

  // Helper: Calculate Price
  const calculatePrice = (course: Course): number => {
    const inst = institutes.find(i => i.id === course.instituteId);
    if (!inst || !inst.defaultRate) return 0;

    if (inst.rateType === 'PER_LESSON') {
      return inst.defaultRate;
    } else {
      // HOURLY
      const [startH, startM] = course.startTime.split(':').map(Number);
      const [endH, endM] = course.endTime.split(':').map(Number);
      let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (diffMinutes < 0) diffMinutes = 0;
      return (diffMinutes / 60) * inst.defaultRate;
    }
  };

  // Filter and Sort Data
  const filteredCourses = useMemo(() => {
    let data = courses.filter(c => {
      // Tab Filter
      const isPaid = !!c.isPaid;
      if (activeTab === 'to_pay' && isPaid) return false;
      if (activeTab === 'paid' && !isPaid) return false;

      // Dropdown Filters
      if (selectedInstituteFilter && c.instituteId !== selectedInstituteFilter) return false;
      if (selectedNameFilter && c.name !== selectedNameFilter) return false;

      return true;
    });

    // Sorting
    return data.sort((a, b) => {
      if (sortBy === 'name') {
        const nameComp = a.name.localeCompare(b.name);
        if (nameComp !== 0) return nameComp;
        return a.date.localeCompare(b.date); // Secondary sort by date
      } else {
        // Sort by Date
        const dateComp = a.date.localeCompare(b.date);
        if (dateComp !== 0) return dateComp;
        return a.startTime.localeCompare(b.startTime);
      }
    });
  }, [courses, activeTab, selectedInstituteFilter, selectedNameFilter, sortBy]);

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCourses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCourses.map(c => c.id)));
    }
  };

  // Batch Action
  const handleConfirmAction = () => {
    if (selectedIds.size === 0) return;

    const updatedCourses = courses.map(c => {
      if (selectedIds.has(c.id)) {
        return { ...c, isPaid: activeTab === 'to_pay' }; // If in "to_pay", set true. If "paid", set false (undo).
      }
      return c;
    });

    onUpdateCourses(updatedCourses);
    setSelectedIds(new Set());
  };

  // Calculate Total of Selection
  const totalSelectedAmount = useMemo(() => {
    let total = 0;
    filteredCourses.forEach(c => {
      if (selectedIds.has(c.id)) {
        total += calculatePrice(c);
      }
    });
    return total;
  }, [filteredCourses, selectedIds, institutes]);

  // Calculate Total of LIST (Outstanding or Already Paid)
  const totalInListAmount = useMemo(() => {
    return filteredCourses.reduce((acc, c) => acc + calculatePrice(c), 0);
  }, [filteredCourses, institutes]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-emerald-400" size={24} />
            Gestione Pagamenti
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Filters & Controls */}
        <div className="p-4 border-b border-white/5 bg-slate-800/30 flex flex-col gap-3 shrink-0">
          
          {/* Tabs */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-white/10 self-start">
             <button 
               onClick={() => { setActiveTab('to_pay'); setSelectedIds(new Set()); }}
               className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === 'to_pay' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
               Da Pagare
             </button>
             <button 
               onClick={() => { setActiveTab('paid'); setSelectedIds(new Set()); }}
               className={`px-4 py-1.5 rounded-md text-sm font-bold transition ${activeTab === 'paid' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
               Pagati / Fatturati
             </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
             <div className="flex-1 relative">
                <select 
                  className="w-full appearance-none bg-slate-900 border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={selectedInstituteFilter}
                  onChange={e => setSelectedInstituteFilter(e.target.value)}
                >
                  <option value="">Tutte le scuole</option>
                  {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <Filter className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" size={14} />
             </div>

             <div className="flex-1 relative">
                <select 
                  className="w-full appearance-none bg-slate-900 border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={selectedNameFilter}
                  onChange={e => setSelectedNameFilter(e.target.value)}
                >
                  <option value="">Tutti i corsi</option>
                  {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <Tag className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" size={14} />
             </div>

             <button 
               onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
               className="px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-slate-300 hover:text-white text-sm flex items-center gap-2 justify-center"
               title="Cambia ordinamento"
             >
               <ArrowUpDown size={16} />
               {sortBy === 'date' ? 'Per Data' : 'Per Gruppo'}
             </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 space-y-2 bg-black/20">
          
          {filteredCourses.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
               <Calculator size={48} className="mx-auto mb-4 opacity-20" />
               <p>Nessun corso trovato in questa sezione.</p>
            </div>
          ) : (
             <>
                <div className="flex items-center justify-between px-2 mb-2">
                   <button 
                     onClick={toggleSelectAll}
                     className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
                   >
                     {selectedIds.size === filteredCourses.length ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                     Seleziona tutti ({filteredCourses.length})
                   </button>
                   <span className="text-xs text-slate-500">
                     {activeTab === 'to_pay' ? 'Seleziona per segnare come pagato' : 'Seleziona per annullare pagamento'}
                   </span>
                </div>

                {filteredCourses.map((course, idx) => {
                   const inst = institutes.find(i => i.id === course.instituteId);
                   const price = calculatePrice(course);
                   const isSelected = selectedIds.has(course.id);
                   const showHeader = sortBy === 'name' && (idx === 0 || filteredCourses[idx-1].name !== course.name);

                   return (
                     <React.Fragment key={course.id}>
                       {showHeader && (
                         <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur py-2 px-2 border-b border-white/10 mt-4 mb-1">
                            <h3 className="text-sm font-bold text-purple-300">{course.name}</h3>
                         </div>
                       )}

                       <div 
                         onClick={() => toggleSelection(course.id)}
                         className={`relative p-3 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${
                           isSelected 
                             ? 'bg-indigo-900/20 border-indigo-500/50' 
                             : 'bg-slate-800/40 border-white/5 hover:border-white/20'
                         }`}
                       >
                          <div className={`shrink-0 transition-colors ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`}>
                             {isSelected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </div>

                          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                             <div className="col-span-2 sm:col-span-1">
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                   <Calendar size={12} />
                                   {new Date(course.date).toLocaleDateString('it-IT')}
                                </p>
                                <p className="text-xs font-mono text-slate-500">
                                   {course.startTime}-{course.endTime}
                                </p>
                             </div>

                             <div className="col-span-2 sm:col-span-2">
                                <p className="font-bold text-white text-sm truncate">{course.name}</p>
                                {inst && (
                                   <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: inst.color}}/>
                                      {inst.name}
                                   </p>
                                )}
                             </div>

                             <div className="col-span-2 sm:col-span-1 text-right">
                                <span className={`font-bold font-mono text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                   € {price.toFixed(2)}
                                </span>
                             </div>
                          </div>
                       </div>
                     </React.Fragment>
                   );
                })}
             </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-900 flex justify-between items-center shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
           <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Selezionato</p>
                <p className="text-xl font-bold text-white font-mono">
                    € {totalSelectedAmount.toFixed(2)}
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold">
                    {activeTab === 'to_pay' ? 'Totale da Saldare' : 'Totale Incassato'}
                </p>
                <p className={`text-sm font-bold font-mono ${activeTab === 'to_pay' ? 'text-red-400' : 'text-emerald-400'}`}>
                    € {totalInListAmount.toFixed(2)}
                </p>
              </div>
           </div>
           
           <button
             disabled={selectedIds.size === 0}
             onClick={handleConfirmAction}
             className={`px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
               activeTab === 'to_pay' 
                 ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500' 
                 : 'bg-slate-700 text-white hover:bg-slate-600'
             }`}
           >
             {activeTab === 'to_pay' ? (
                <>
                  <Wallet size={20} /> Conferma
                </>
             ) : (
                <>
                  <ArrowUpDown size={20} /> Ripristina
                </>
             )}
           </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentsModal;
import React, { useState, useEffect } from 'react';
import { Course, Modality, Institute } from '../types';
import { X, Save, Calendar, Building2, Plus, Trash2, Check } from 'lucide-react';

interface CourseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (courses: Course[]) => void;
  initialData?: Course | null;
  institutes: Institute[];
  onAddInstitute: (name: string) => Institute;
  preselectedDate?: string; // New prop
}

interface SessionRow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  modality: Modality;
}

const CourseForm: React.FC<CourseFormProps> = ({ 
  isOpen, onClose, onSubmit, initialData, institutes, onAddInstitute, preselectedDate 
}) => {
  // Global Course Data
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [selectedInstituteId, setSelectedInstituteId] = useState<string>('');
  const [newInstituteName, setNewInstituteName] = useState('');
  const [isAddingInstitute, setIsAddingInstitute] = useState(false);

  // Sessions Data
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode: Single session edit
        setCourseName(initialData.name);
        setCourseCode(initialData.code || '');
        setSelectedInstituteId(initialData.instituteId || '');
        setSessions([{
          id: Date.now().toString(),
          date: initialData.date,
          startTime: initialData.startTime,
          endTime: initialData.endTime,
          modality: initialData.modality
        }]);
      } else {
        // Create Mode
        setCourseName('');
        setCourseCode('');
        setSelectedInstituteId('');
        
        // Use preselected date if available, otherwise today
        const defaultDate = preselectedDate || new Date().toISOString().split('T')[0];
        
        setSessions([{
          id: Date.now().toString(),
          date: defaultDate,
          startTime: '09:00',
          endTime: '13:00',
          modality: 'PRESENZA'
        }]);
      }
      setIsAddingInstitute(false);
      setNewInstituteName('');
    }
  }, [initialData, isOpen, preselectedDate]);

  if (!isOpen) return null;

  const handleAddSession = () => {
    const lastSession = sessions[sessions.length - 1];
    setSessions([...sessions, {
      id: Date.now().toString() + Math.random(),
      date: lastSession ? lastSession.date : (preselectedDate || new Date().toISOString().split('T')[0]),
      startTime: lastSession ? lastSession.startTime : '09:00',
      endTime: lastSession ? lastSession.endTime : '13:00',
      modality: lastSession ? lastSession.modality : 'PRESENZA'
    }]);
  };

  const handleRemoveSession = (id: string) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter(s => s.id !== id));
    }
  };

  const updateSession = (id: string, field: keyof SessionRow, value: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleCreateInstitute = () => {
    if (newInstituteName.trim()) {
      const newInst = onAddInstitute(newInstituteName);
      setSelectedInstituteId(newInst.id);
      setIsAddingInstitute(false);
      setNewInstituteName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName) return;

    // Create a course object for each session
    const newCourses: Course[] = sessions.map(session => ({
      id: initialData ? initialData.id : Math.random().toString(36).substr(2, 9),
      name: courseName,
      code: courseCode,
      instituteId: selectedInstituteId,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      modality: session.modality,
    }));

    onSubmit(newCourses);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white">
            {initialData ? 'Modifica Lezione' : 'Nuovo Corso'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
            
            {/* --- SEZIONE 1: Dati Comuni --- */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-4">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Building2 size={16} /> Dati Generali Corso
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Nome Materia / Corso</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                    value={courseName}
                    onChange={e => setCourseName(e.target.value)}
                    placeholder="Es. Digital Marketing"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Codice (Opzionale)</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                    value={courseCode}
                    onChange={e => setCourseCode(e.target.value)}
                    placeholder="Es. MKT-01"
                  />
                </div>
              </div>

              {/* Institute Selection */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Istituto / Scuola</label>
                {!isAddingInstitute ? (
                  <div className="flex gap-2">
                    <select
                      className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                      value={selectedInstituteId}
                      onChange={e => setSelectedInstituteId(e.target.value)}
                    >
                      <option value="">-- Seleziona o crea nuovo --</option>
                      {institutes.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddingInstitute(true)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
                    <input
                      type="text"
                      className="flex-1 bg-slate-900 border border-purple-500/50 rounded-lg px-3 py-2 text-white focus:outline-none"
                      placeholder="Nome nuovo istituto..."
                      value={newInstituteName}
                      onChange={e => setNewInstituteName(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateInstitute}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingInstitute(false)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* --- SEZIONE 2: Sessioni --- */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} /> Calendario Lezioni
                </h3>
              </div>
              
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="bg-slate-800/30 p-3 rounded-lg border border-white/5 flex flex-col md:flex-row gap-3 items-end md:items-center animate-in slide-in-from-bottom-2">
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full">
                      {/* Date */}
                      <div className="space-y-1 col-span-2 md:col-span-1">
                         <label className="text-[10px] text-slate-500 uppercase">Data</label>
                         <input
                           type="date"
                           required
                           className="w-full bg-slate-900 border border-white/10 rounded text-sm px-2 py-1.5 text-white [color-scheme:dark]"
                           value={session.date}
                           onChange={e => updateSession(session.id, 'date', e.target.value)}
                         />
                      </div>
                      
                      {/* Times */}
                      <div className="space-y-1">
                         <label className="text-[10px] text-slate-500 uppercase">Inizio</label>
                         <input
                           type="time"
                           required
                           className="w-full bg-slate-900 border border-white/10 rounded text-sm px-2 py-1.5 text-white [color-scheme:dark]"
                           value={session.startTime}
                           onChange={e => updateSession(session.id, 'startTime', e.target.value)}
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] text-slate-500 uppercase">Fine</label>
                         <input
                           type="time"
                           required
                           className="w-full bg-slate-900 border border-white/10 rounded text-sm px-2 py-1.5 text-white [color-scheme:dark]"
                           value={session.endTime}
                           onChange={e => updateSession(session.id, 'endTime', e.target.value)}
                         />
                      </div>

                      {/* Modality */}
                      <div className="space-y-1 col-span-2 md:col-span-1">
                         <label className="text-[10px] text-slate-500 uppercase">Tipo</label>
                         <select
                           className={`w-full border-none rounded text-sm px-2 py-1.5 focus:outline-none appearance-none cursor-pointer font-medium text-white ${
                             session.modality === 'DAD' 
                             ? 'bg-blue-600' 
                             : 'bg-emerald-600'
                           }`}
                           value={session.modality}
                           onChange={e => updateSession(session.id, 'modality', e.target.value as Modality)}
                         >
                           <option value="PRESENZA" className="bg-slate-800 text-white">In Aula</option>
                           <option value="DAD" className="bg-slate-800 text-white">Online</option>
                         </select>
                      </div>
                    </div>

                    {/* Delete Row */}
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSession(session.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition mb-[2px] self-end md:self-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!initialData && (
                <button
                  type="button"
                  onClick={handleAddSession}
                  className="w-full py-2 border border-dashed border-white/20 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/40 transition text-sm flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Aggiungi un'altra data
                </button>
              )}
            </div>

          </div>

          <div className="p-4 sm:p-5 border-t border-white/10 bg-white/5 shrink-0">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3.5 rounded-xl hover:from-emerald-400 hover:to-green-500 transition shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 text-lg transform hover:scale-[1.01]"
            >
              <Save size={20} />
              {initialData ? 'Salva Modifiche' : `Conferma ${sessions.length} Lezioni`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CourseForm;
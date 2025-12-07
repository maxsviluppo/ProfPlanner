import React, { useState, useEffect, useRef } from 'react';
import { Course, Institute } from './types';
import CourseCard from './components/CourseCard';
import CourseForm from './components/CourseForm';
import ImportModal from './components/ImportModal';
import NotificationModal from './components/NotificationModal';
import ConflictModal from './components/ConflictModal'; 
import SettingsModal from './components/SettingsModal'; 
import CalendarView from './components/CalendarView';
import StatsOverview from './components/StatsOverview'; 
import PaymentsModal from './components/PaymentsModal'; 
import ExportModal from './components/ExportModal'; 
import { Auth } from './components/Auth'; // AUTH COMPONENT
import { db } from './services/db'; 
import { supabase } from './services/supabaseClient';
import { Plus, Upload, Briefcase, ChevronLeft, ChevronRight, List, Settings, Filter, CalendarDays, Wallet, Download, LogOut } from 'lucide-react';

const DEFAULT_COLOR = '#38bdf8';

const App: React.FC = () => {
  // Session State
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // App State
  const [courses, setCourses] = useState<Course[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false); 
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  // Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictMessages, setConflictMessages] = useState<string[]>([]);

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [notificationCourses, setNotificationCourses] = useState<Course[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Notification Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // View State - Default to 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [selectedInstituteFilter, setSelectedInstituteFilter] = useState<string>(''); // Empty = ALL
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(''); // Empty = ALL (New Filter)

  // Filtering state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); 
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());

  const listRef = useRef<HTMLDivElement>(null);

  // Current Date for Header
  const todayFormatted = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  
  // Extract unique subjects for the filter dropdown
  const uniqueSubjects = Array.from(new Set(courses.map(c => c.name))).sort();

  // --- 1. SESSION MANAGEMENT ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 2. DATA LOADING ---
  const loadData = async () => {
    if (!session) return;
    try {
      const [loadedCourses, loadedInstitutes] = await Promise.all([
        db.courses.getAll(),
        db.institutes.getAll()
      ]);
      setCourses(loadedCourses);
      setInstitutes(loadedInstitutes);

      checkTomorrowCourses(loadedCourses);
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  useEffect(() => {
    if (session) {
        loadData();
    } else {
        setCourses([]);
        setInstitutes([]);
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const checkTomorrowCourses = (currentCourses: Course[]) => {
     const tomorrow = new Date();
     tomorrow.setDate(tomorrow.getDate() + 1);
     const tomorrowStr = tomorrow.toISOString().split('T')[0];
     
     const upcoming = currentCourses.filter(c => c.date === tomorrowStr);
     if (upcoming.length > 0) {
         setNotificationCourses(upcoming);
         setShowNotificationModal(true);
         
         if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
             new Notification("Promemoria Lezioni", {
               body: `Domani hai ${upcoming.length} lezioni in programma.`
             });
         }
     }
  };

  const handleToggleNotifications = () => {
    if (!notificationsEnabled) {
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setNotificationsEnabled(true);
          }
        });
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  // --- Institute Management (REAL TIME DB) ---
  const handleAddInstitute = (name: string, color: string = DEFAULT_COLOR, rate?: number, rateType?: 'HOURLY' | 'PER_LESSON') => {
    // Generate temporary ID or handle on backend. Here we use text ID for consistency
    const newInst: Institute = {
      id: crypto.randomUUID(),
      name,
      color,
      defaultRate: rate,
      rateType: rateType || 'HOURLY'
    };
    
    // Optimistic UI Update
    setInstitutes(prev => [...prev, newInst]); 
    
    // Fire and forget (do not await here to keep function synchronous for UI components)
    db.institutes.create(newInst).catch(error => {
        console.error("Error creating institute", error);
    });

    return newInst;
  };

  const handleUpdateInstitute = async (updatedInst: Institute) => {
    setInstitutes(institutes.map(i => i.id === updatedInst.id ? updatedInst : i));
    try {
        await db.institutes.update(updatedInst);
    } catch (error) {
        console.error("Error updating institute", error);
    }
  };

  const handleDeleteInstitute = async (id: string) => {
    if (window.confirm("Eliminare questa scuola? Le lezioni associate rimarranno ma senza scuola.")) {
      setInstitutes(institutes.filter(i => i.id !== id));
      // Remove instituteId from local courses
      setCourses(courses.map(c => c.instituteId === id ? { ...c, instituteId: undefined } : c));
      
      try {
          await db.institutes.delete(id);
      } catch (error) {
          console.error("Error deleting institute", error);
      }
    }
  };

  // --- Course Management (REAL TIME DB) ---

  const checkConflicts = (newCourses: Course[], existingCourses: Course[], skipIds: string[] = []): string[] => {
    const conflicts: string[] = [];

    newCourses.forEach(newC => {
       const newStart = parseInt(newC.startTime.replace(':', ''));
       const newEnd = parseInt(newC.endTime.replace(':', ''));
       
       existingCourses.forEach(exC => {
          if (skipIds.includes(exC.id)) return; 
          if (newC.date !== exC.date) return;
          
          const exStart = parseInt(exC.startTime.replace(':', ''));
          const exEnd = parseInt(exC.endTime.replace(':', ''));

          if (newStart < exEnd && newEnd > exStart) {
            conflicts.push(`CONFLITTO: ${newC.date} | ${newC.startTime}-${newC.endTime} (${newC.name}) si sovrappone a ${exC.startTime}-${exC.endTime} (${exC.name})`);
          }
       });
    });

    return conflicts;
  };

  const saveCoursesToDb = async (coursesToSave: Course[], isUpdate: boolean) => {
    if (isUpdate) {
        // Optimistic
        const idsToUpdate = coursesToSave.map(c => c.id);
        setCourses(courses.map(c => idsToUpdate.includes(c.id) ? coursesToSave.find(n => n.id === c.id)! : c));
        
        // DB Call
        try {
            await Promise.all(coursesToSave.map(c => db.courses.update(c)));
        } catch (error) {
            console.error("Update failed", error);
        }
    } else {
        // Add new
        setCourses([...courses, ...coursesToSave]);
        try {
            await db.courses.createMany(coursesToSave);
        } catch (error) {
             console.error("Create failed", error);
        }
    }

    setConflictMessages([]);
    setIsConflictModalOpen(false);
  };

  const handleSaveCourses = (newCourses: Course[]) => {
    const isEdit = newCourses.length === 1 && courses.some(c => c.id === newCourses[0].id);
    const idsToSkip = isEdit ? [newCourses[0].id] : [];

    const conflicts = checkConflicts(newCourses, courses, idsToSkip);

    if (conflicts.length > 0) {
      setConflictMessages(conflicts);
      setIsConflictModalOpen(true);
      return; 
    }

    saveCoursesToDb(newCourses, isEdit);
  };

  const handleDeleteCourse = async (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa lezione?")) {
      setCourses(courses.filter(c => c.id !== id));
      try {
         await db.courses.delete(id);
      } catch (error) {
         console.error("Delete failed", error);
      }
    }
  };

  const handleUpdateCourseStatus = async (updatedCourse: Course) => {
    setCourses(courses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    try {
        await db.courses.update(updatedCourse);
    } catch (error) {
        console.error("Status update failed", error);
    }
  };
  
  const handleBatchUpdateCourses = async (updatedCoursesList: Course[]) => {
    setCourses(updatedCoursesList); // This might be heavy if list is huge, usually we merge
    try {
        await db.courses.upsertMany(updatedCoursesList);
    } catch (error) {
        console.error("Batch update failed", error);
    }
  };

  const handleImportCourses = async (importedCourses: Course[]) => {
    setCourses([...courses, ...importedCourses]);
    try {
        await db.courses.createMany(importedCourses);
    } catch (error) {
        console.error("Import failed", error);
    }
  };

  const handleResetAll = async (keepInstitutes: boolean = false) => {
    setCourses([]);
    try {
        await db.courses.deleteAll();
    } catch (e) { console.error(e); }
    
    if (!keepInstitutes) {
        setInstitutes([]);
        try {
            await db.institutes.deleteAll();
        } catch (e) { console.error(e); }
    }
    setIsSettingsOpen(false);
  };

  // --- RENDER ---
  
  if (loadingSession) {
      return (
          <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                  <Briefcase size={40} className="text-purple-500 mb-4" />
                  <p className="text-slate-400 font-medium">Caricamento...</p>
              </div>
          </div>
      );
  }

  // If NOT authenticated, show Auth Screen
  if (!session) {
      return <Auth />;
  }

  // If Authenticated, show Main App
  // ... (Filtering Logic for View) ...
  const filteredCourses = courses
    .filter(c => !selectedInstituteFilter || c.instituteId === selectedInstituteFilter)
    .filter(c => !selectedSubjectFilter || c.name === selectedSubjectFilter)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

  const displayCourses = viewMode === 'list' 
    ? filteredCourses 
    : filteredCourses.filter(c => c.date === selectedDate); 

  const changeMonth = (delta: number) => {
    let newM = viewMonth + delta;
    let newY = viewYear;
    if (newM > 11) { newM = 0; newY++; }
    if (newM < 0) { newM = 11; newY--; }
    setViewMonth(newM);
    setViewYear(newY);
  };

  return (
    <div className="min-h-screen pb-20 sm:pb-10 font-sans text-slate-200 selection:bg-purple-500/30">
      
      {/* BACKGROUND GRADIENTS */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-96 bg-purple-900/20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-full h-96 bg-blue-900/20 blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-white/5 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/20">
                <Briefcase className="text-white" size={20} />
             </div>
             <div>
               <h1 className="font-bold text-lg text-white leading-none">ProfPlanner</h1>
               <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{todayFormatted}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setIsImportOpen(true)}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition hidden sm:block"
              title="Importa da testo"
            >
              <Upload size={20} />
            </button>
            <button 
              onClick={() => setIsExportOpen(true)}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-blue-400 hover:bg-white/5 rounded-xl transition"
              title="Esporta Report"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => setIsPaymentsOpen(true)}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-xl transition"
              title="Gestione Pagamenti"
            >
              <Wallet size={20} />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition"
              title="Impostazioni"
            >
              <Settings size={20} />
            </button>
            <button 
               onClick={handleLogout}
               className="p-2 sm:p-2.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition"
               title="Disconnetti"
            >
               <LogOut size={20} />
            </button>
            <button 
              onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
              className="bg-indigo-600 text-white hover:bg-indigo-500 transition rounded-xl p-2 sm:px-4 sm:py-2.5 flex items-center gap-2 font-bold shadow-lg shadow-indigo-500/20 ml-1"
            >
               <Plus size={20} />
               <span className="hidden sm:inline">Nuova</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
        
        {/* STATS OVERVIEW */}
        <StatsOverview 
          courses={courses} 
          institutes={institutes} 
          viewMonth={viewMonth}
          viewYear={viewYear}
          selectedInstituteId={selectedInstituteFilter}
        />

        {/* VIEW CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
          
          {/* Calendar Navigation */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-4 px-2 w-full sm:w-auto justify-between sm:justify-start order-2 sm:order-1">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded-full text-slate-400"><ChevronLeft size={20}/></button>
              <h2 className="text-lg font-bold text-white capitalize min-w-[140px] text-center whitespace-nowrap">
                {new Date(viewYear, viewMonth).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded-full text-slate-400"><ChevronRight size={20}/></button>
            </div>
          )}

          {/* Filters & Toggle */}
          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
             <div className="flex-1 sm:flex-none relative">
                <select 
                  className="w-full appearance-none bg-slate-800 border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={selectedInstituteFilter}
                  onChange={e => setSelectedInstituteFilter(e.target.value)}
                >
                  <option value="">Tutte le scuole</option>
                  {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <Filter className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" size={14} />
             </div>
             
             <div className="flex-1 sm:flex-none relative">
                 <select 
                   className="w-full appearance-none bg-slate-800 border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-purple-500"
                   value={selectedSubjectFilter}
                   onChange={e => setSelectedSubjectFilter(e.target.value)}
                 >
                   <option value="">Tutte le materie</option>
                   {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <Filter className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" size={14} />
             </div>

             <div className="flex bg-slate-800 rounded-xl p-1 border border-white/10 shrink-0">
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  <CalendarDays size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  <List size={18} />
                </button>
             </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="animate-in fade-in duration-500">
           {viewMode === 'calendar' ? (
             <div className="space-y-6">
               <CalendarView 
                 courses={filteredCourses}
                 institutes={institutes}
                 year={viewYear}
                 month={viewMonth}
                 selectedDate={selectedDate}
                 onSelectDate={setSelectedDate}
               />
               
               {/* Selected Date Detail List */}
               <div ref={listRef} className="space-y-3">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-1">
                   {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                 </h3>
                 {displayCourses.length > 0 ? (
                    displayCourses.map(course => (
                      <CourseCard 
                        key={course.id} 
                        course={course} 
                        institute={institutes.find(i => i.id === course.instituteId)}
                        onEdit={(c) => { setEditingCourse(c); setIsFormOpen(true); }}
                        onDelete={handleDeleteCourse}
                        onUpdate={handleUpdateCourseStatus}
                      />
                    ))
                 ) : (
                    <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                        <p className="text-slate-500 text-sm">Nessuna lezione in questa data.</p>
                        <button 
                          onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
                          className="mt-2 text-purple-400 text-sm font-bold hover:underline"
                        >
                          Aggiungi lezione
                        </button>
                    </div>
                 )}
               </div>
             </div>
           ) : (
             <div className="space-y-3">
               {displayCourses.length > 0 ? (
                 // Group by date for List View logic could be added here
                 displayCourses.map((course, index) => {
                   const showHeader = index === 0 || displayCourses[index-1].date !== course.date;
                   return (
                     <React.Fragment key={course.id}>
                       {showHeader && (
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 pl-1 sticky top-16 bg-slate-900/95 backdrop-blur py-2 z-30">
                           {new Date(course.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' })}
                         </h3>
                       )}
                       <CourseCard 
                          course={course} 
                          institute={institutes.find(i => i.id === course.instituteId)}
                          onEdit={(c) => { setEditingCourse(c); setIsFormOpen(true); }}
                          onDelete={handleDeleteCourse}
                          onUpdate={handleUpdateCourseStatus}
                       />
                     </React.Fragment>
                   );
                 })
               ) : (
                 <div className="text-center py-20 text-slate-500">
                    <p>Nessuna lezione trovata con i filtri attuali.</p>
                 </div>
               )}
             </div>
           )}
        </div>
      </main>

      {/* MODALS */}
      <CourseForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSubmit={handleSaveCourses}
        initialData={editingCourse}
        institutes={institutes}
        onAddInstitute={handleAddInstitute}
        preselectedDate={viewMode === 'calendar' ? selectedDate : undefined}
      />

      <ImportModal 
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportCourses}
        institutes={institutes}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        institutes={institutes}
        onAddInstitute={handleAddInstitute}
        onUpdateInstitute={handleUpdateInstitute}
        onDeleteInstitute={handleDeleteInstitute}
        onResetAll={handleResetAll}
      />

      <PaymentsModal 
        isOpen={isPaymentsOpen}
        onClose={() => setIsPaymentsOpen(false)}
        courses={courses}
        institutes={institutes}
        onUpdateCourses={handleBatchUpdateCourses}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        courses={courses}
        institutes={institutes}
      />

      {showNotificationModal && (
        <NotificationModal 
          courses={notificationCourses} 
          onClose={() => setShowNotificationModal(false)} 
        />
      )}

      <ConflictModal 
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onConfirm={() => {}} // Not used in blocking mode
        conflicts={conflictMessages}
      />

    </div>
  );
};

export default App;
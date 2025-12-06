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
import { db } from './services/db'; 
import { Plus, Upload, Briefcase, ChevronLeft, ChevronRight, List, LayoutGrid, Settings, Filter, CalendarDays } from 'lucide-react';

const DEFAULT_COLOR = '#38bdf8';

const App: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
  
  // Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [conflictMessages, setConflictMessages] = useState<string[]>([]);
  const [pendingCoursesToSave, setPendingCoursesToSave] = useState<Course[]>([]);

  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [notificationCourses, setNotificationCourses] = useState<Course[]>([]);
  
  // Notification Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
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

  const checkTomorrowCourses = (currentCourses: Course[]) => {
     const tomorrow = new Date();
     tomorrow.setDate(tomorrow.getDate() + 1);
     const tomorrowStr = tomorrow.toISOString().split('T')[0];
     
     const upcoming = currentCourses.filter(c => c.date === tomorrowStr);
     if (upcoming.length > 0) {
         setNotificationCourses(upcoming);
         if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
             // Logic for browser notification can be added here
         }
     }
  };

  // Load initial data (Async from DB)
  useEffect(() => {
    const initData = async () => {
      try {
        const [loadedCourses, loadedInstitutes] = await Promise.all([
          db.courses.getAll(),
          db.institutes.getAll()
        ]);
        
        setCourses(loadedCourses);
        setInstitutes(loadedInstitutes);
        checkTomorrowCourses(loadedCourses);

        // Load notification preference
        const notifPref = localStorage.getItem('profplanner_notifications');
        if (notifPref === 'true') {
          // Check if Notification API exists and permission is granted
          if ('Notification' in window && Notification.permission === 'granted') {
            setNotificationsEnabled(true);
          }
        }

        // Set default view to today's month/year if we have courses today
        const today = new Date();
        if (loadedCourses.some(c => c.date === today.toISOString().split('T')[0])) {
            setSelectedDate(today.toISOString().split('T')[0]);
        }
      } catch (error) {
        console.error("Errore caricamento DB:", error);
      }
    };

    initData();
  }, []);

  // Save on change (Async to DB)
  useEffect(() => {
    // Only save if we have data or explicit empty state, handled by setters
    if (courses.length > 0) db.courses.saveAll(courses);
    // Note: If courses is empty array [], we might want to save it too (deletion), 
    // but the initial load might trigger this with [].
    // The handleResetAll function manually clears storage.
  }, [courses]);

  useEffect(() => {
    if (institutes.length > 0) db.institutes.saveAll(institutes);
  }, [institutes]);

  // --- HANDLERS ---

  const handleToggleNotifications = async () => {
     if (!notificationsEnabled) {
        if ('Notification' in window) {
           const permission = await Notification.requestPermission();
           if (permission === 'granted') {
               setNotificationsEnabled(true);
               localStorage.setItem('profplanner_notifications', 'true');
           }
        } else {
           alert("Il tuo browser non supporta le notifiche.");
        }
     } else {
        setNotificationsEnabled(false);
        localStorage.setItem('profplanner_notifications', 'false');
     }
  };

  const handleResetAllData = async () => {
      setCourses([]);
      setInstitutes([]);
      await db.courses.saveAll([]);
      await db.institutes.saveAll([]);
      setIsSettingsOpen(false);
      alert("Tutti i dati sono stati eliminati.");
  };

  const handleAddInstitute = (name: string, color: string, rate?: number, rateType?: 'HOURLY' | 'PER_LESSON') => {
     const newInst: Institute = {
         id: Date.now().toString(),
         name,
         color,
         defaultRate: rate,
         rateType: rateType
     };
     setInstitutes([...institutes, newInst]);
     return newInst; 
  };
  
  const onAddInstituteWrapper = (name: string) => handleAddInstitute(name, DEFAULT_COLOR);

  const handleUpdateInstitute = (inst: Institute) => {
     setInstitutes(institutes.map(i => i.id === inst.id ? inst : i));
  };

  const handleDeleteInstitute = (id: string) => {
    if (window.confirm("Eliminare questo istituto? Le lezioni associate perderanno il riferimento.")) {
        const newInstitutes = institutes.filter(i => i.id !== id);
        setInstitutes(newInstitutes);
        setCourses(courses.map(c => c.instituteId === id ? { ...c, instituteId: undefined } : c));
        db.institutes.saveAll(newInstitutes); // Force save immediately
    }
  };

  const checkConflicts = (newCourses: Course[], excludeId?: string): string[] => {
      const conflicts: string[] = [];
      const coursesToCheck = courses.filter(c => c.id !== excludeId);

      newCourses.forEach(nc => {
          const ncStart = parseInt(nc.startTime.replace(':', ''));
          const ncEnd = parseInt(nc.endTime.replace(':', ''));
          
          const sameDay = coursesToCheck.filter(c => c.date === nc.date);
          
          sameDay.forEach(ex => {
              const exStart = parseInt(ex.startTime.replace(':', ''));
              const exEnd = parseInt(ex.endTime.replace(':', ''));

              // Overlap logic: StartA < EndB && StartB < EndA
              if (ncStart < exEnd && exStart < ncEnd) {
                  conflicts.push(`CONFLITTO: ${nc.date} ${nc.startTime}-${nc.endTime} sovrappone "${ex.name}"`);
              }
          });
      });
      return conflicts;
  };

  const handleCourseSubmit = (newCourses: Course[]) => {
      // If editing, newCourses usually has 1 element (or multiple if user added sessions in edit mode, which logic supports)
      const conflicts = checkConflicts(newCourses, editingCourse?.id);

      if (conflicts.length > 0) {
          setConflictMessages(conflicts);
          setPendingCoursesToSave(newCourses);
          setIsConflictModalOpen(true);
      } else {
          processSave(newCourses);
      }
  };

  const processSave = (newCourses: Course[]) => {
      let updatedList;
      if (editingCourse) {
          const otherCourses = courses.filter(c => c.id !== editingCourse.id);
          updatedList = [...otherCourses, ...newCourses];
      } else {
          updatedList = [...courses, ...newCourses];
      }
      setCourses(updatedList);
      db.courses.saveAll(updatedList); // Force save
      setEditingCourse(null);
      setIsFormOpen(false);
  };

  const handleConflictConfirm = () => {
      processSave(pendingCoursesToSave);
      setIsConflictModalOpen(false);
      setPendingCoursesToSave([]);
  };

  const handleImport = (importedCourses: Course[]) => {
      const updatedList = [...courses, ...importedCourses];
      setCourses(updatedList);
      db.courses.saveAll(updatedList);
  };

  const handleDeleteCourse = (id: string) => {
      if (window.confirm("Eliminare questa lezione?")) {
          const updatedList = courses.filter(c => c.id !== id);
          setCourses(updatedList);
          db.courses.saveAll(updatedList);
      }
  };

  const handleUpdateCourse = (updated: Course) => {
      const updatedList = courses.map(c => c.id === updated.id ? updated : c);
      setCourses(updatedList);
      db.courses.saveAll(updatedList);
  };

  const handleEditCourse = (course: Course) => {
      setEditingCourse(course);
      setIsFormOpen(true);
  };

  // --- RENDERING HELPERS ---

  const getFilteredCourses = () => {
      let filtered = courses;
      // Filter by Institute
      if (selectedInstituteFilter) {
          filtered = filtered.filter(c => c.instituteId === selectedInstituteFilter);
      }
      // Filter by Subject (Course Name)
      if (selectedSubjectFilter) {
          filtered = filtered.filter(c => c.name === selectedSubjectFilter);
      }
      return filtered;
  };

  const renderContent = () => {
      const filtered = getFilteredCourses();

      if (viewMode === 'calendar') {
          return (
              <div className="space-y-4">
                  {/* Calendar Navigation */}
                  <div className="flex justify-between items-center bg-slate-800/80 p-3 rounded-xl border border-white/10">
                      <button onClick={() => {
                          if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
                          else { setViewMonth(viewMonth - 1); }
                      }} className="p-2 hover:bg-white/10 rounded-lg text-white">
                          <ChevronLeft />
                      </button>
                      <h2 className="text-lg font-bold text-white capitalize">
                          {new Date(viewYear, viewMonth).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                      </h2>
                      <button onClick={() => {
                          if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
                          else { setViewMonth(viewMonth + 1); }
                      }} className="p-2 hover:bg-white/10 rounded-lg text-white">
                          <ChevronRight />
                      </button>
                  </div>

                  <CalendarView 
                      courses={filtered}
                      institutes={institutes}
                      year={viewYear}
                      month={viewMonth}
                      selectedDate={selectedDate}
                      onSelectDate={setSelectedDate}
                  />

                  {/* Selected Date List */}
                  <div className="mt-4">
                      <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
                          {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h3>
                      {filtered.filter(c => c.date === selectedDate).length === 0 ? (
                          <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-white/10 text-slate-500">
                              Nessuna lezione in questa data
                          </div>
                      ) : (
                          filtered
                            .filter(c => c.date === selectedDate)
                            .sort((a,b) => a.startTime.localeCompare(b.startTime))
                            .map(course => (
                              <CourseCard 
                                  key={course.id} 
                                  course={course} 
                                  institute={institutes.find(i => i.id === course.instituteId)}
                                  onEdit={handleEditCourse}
                                  onDelete={handleDeleteCourse}
                                  onUpdate={handleUpdateCourse}
                              />
                            ))
                      )}
                  </div>
              </div>
          );
      }

      // LIST VIEW
      const sorted = [...filtered].sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
      });
      
      // Grouping
      const groups: { [key: string]: Course[] } = {};
      sorted.forEach(c => {
          if (!groups[c.date]) groups[c.date] = [];
          groups[c.date].push(c);
      });

      const dates = Object.keys(groups).sort();

      return (
          <div className="space-y-4 pb-20" ref={listRef}>
              {dates.length === 0 && (
                   <div className="text-center py-12 flex flex-col items-center opacity-50">
                       <Briefcase size={48} className="mb-4 text-slate-500" />
                       <p className="text-slate-400">Nessuna lezione trovata.</p>
                       <p className="text-slate-600 text-sm">Modifica i filtri o aggiungi un corso.</p>
                   </div>
              )}
              {dates.map(date => {
                  const isToday = date === new Date().toISOString().split('T')[0];
                  return (
                  <div key={date}>
                      {/* Highlighted Day Header */}
                      <div className={`sticky top-0 z-20 backdrop-blur-md py-3 px-3 mb-2 border-b border-l-4 flex items-center gap-3 shadow-md rounded-r-xl transition-colors ${
                          isToday 
                          ? 'bg-purple-800/90 border-b-purple-400/50 border-l-purple-400' 
                          : 'bg-slate-700/90 border-b-white/20 border-l-slate-300'
                      }`}>
                          <CalendarDays size={20} className={isToday ? 'text-white' : 'text-slate-200'} />
                          <h3 className={`text-lg font-bold capitalize tracking-wide text-white`}>
                              {new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </h3>
                      </div>
                      <div className="space-y-1">
                          {groups[date].map(course => (
                              <CourseCard 
                                  key={course.id} 
                                  course={course} 
                                  institute={institutes.find(i => i.id === course.instituteId)}
                                  onEdit={handleEditCourse}
                                  onDelete={handleDeleteCourse}
                                  onUpdate={handleUpdateCourse}
                              />
                          ))}
                      </div>
                  </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30 overflow-x-hidden">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center shadow-lg">
             <div>
                 <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                     ProfPlanner
                 </h1>
                 <p className="text-xs text-slate-500 font-medium capitalize">{todayFormatted}</p>
             </div>
             
             {/* MOVED: Action Buttons in Header */}
             <div className="flex gap-2">
                 <button
                   onClick={() => setIsImportOpen(true)}
                   className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-purple-400 hover:text-white transition border border-white/5"
                   title="Importa con AI"
                 >
                     <Upload size={20} />
                 </button>
                 <button
                   onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
                   className="p-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition border border-white/5 shadow-lg shadow-purple-900/20"
                   title="Nuova Lezione"
                 >
                     <Plus size={20} />
                 </button>
                 <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition border border-white/5"
                   title="Impostazioni"
                 >
                     <Settings size={20} />
                 </button>
             </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="max-w-3xl mx-auto p-4">
             
             {/* Stats & Filters */}
             <StatsOverview 
                courses={courses}
                institutes={institutes}
                viewMonth={viewMonth}
                viewYear={viewYear}
                selectedInstituteId={selectedInstituteFilter}
             />

             {/* CONTROLS ROW: View Toggle + Subject Filter */}
             <div className="flex flex-col sm:flex-row gap-3 mb-4">
                 
                 <div className="flex gap-2 w-full sm:w-auto">
                    {/* View Switch */}
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 shrink-0">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            <List size={20} />
                        </button>
                        <button 
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-lg transition ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>

                    {/* Subject Filter Dropdown */}
                    <div className="relative flex-1 sm:flex-none">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                            <Filter size={14} />
                        </div>
                        <select
                            value={selectedSubjectFilter}
                            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                            className="w-full sm:w-48 appearance-none bg-slate-900 border border-white/10 text-slate-200 text-sm rounded-xl py-2.5 pl-9 pr-8 focus:ring-1 focus:ring-purple-500 outline-none"
                        >
                            <option value="">Tutte le materie</option>
                            {uniqueSubjects.map(subj => (
                                <option key={subj} value={subj}>{subj}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                           <ChevronLeft size={12} className="-rotate-90" />
                        </div>
                    </div>
                 </div>

             </div>

             {/* Institute Chips (Scrollable) */}
             <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                  <button
                    onClick={() => setSelectedInstituteFilter('')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition border whitespace-nowrap ${
                        selectedInstituteFilter === '' 
                        ? 'bg-white text-slate-900 border-white' 
                        : 'bg-slate-900 text-slate-400 border-white/10 hover:border-white/30'
                    }`}
                  >
                      Tutte le scuole
                  </button>
                  {institutes.map(inst => (
                      <button
                        key={inst.id}
                        onClick={() => setSelectedInstituteFilter(inst.id === selectedInstituteFilter ? '' : inst.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition border whitespace-nowrap flex items-center gap-2`}
                        style={{ 
                            backgroundColor: selectedInstituteFilter === inst.id ? inst.color : 'transparent',
                            color: selectedInstituteFilter === inst.id ? '#0f172a' : inst.color,
                            borderColor: inst.color
                        }}
                      >
                         {inst.name}
                      </button>
                  ))}
             </div>

             {/* Content Area */}
             {renderContent()}

        </main>

        {/* MODALS */}
        <CourseForm
            isOpen={isFormOpen}
            onClose={() => { setIsFormOpen(false); setEditingCourse(null); }}
            onSubmit={handleCourseSubmit}
            initialData={editingCourse}
            institutes={institutes}
            onAddInstitute={onAddInstituteWrapper}
            preselectedDate={viewMode === 'calendar' ? selectedDate : undefined}
        />

        <ImportModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onImport={handleImport}
        />

        <NotificationModal
            courses={notificationCourses}
            onClose={() => setNotificationCourses([])}
        />

        <ConflictModal
            isOpen={isConflictModalOpen}
            onClose={() => setIsConflictModalOpen(false)}
            onConfirm={handleConflictConfirm}
            conflicts={conflictMessages}
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
            onResetAll={handleResetAllData}
        />

    </div>
  );
};

export default App;
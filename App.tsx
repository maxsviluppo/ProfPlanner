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
import { Plus, Calendar as CalendarIcon, Upload, Briefcase, ChevronLeft, ChevronRight, List, LayoutGrid, Settings, Filter } from 'lucide-react';

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
  const [notifiedCourseIds, setNotifiedCourseIds] = useState<Set<string>>(new Set());

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedInstituteFilter, setSelectedInstituteFilter] = useState<string>(''); // Empty = ALL

  // Filtering state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); 
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());

  const listRef = useRef<HTMLDivElement>(null);

  // Current Date for Header
  const todayFormatted = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  
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
    if (courses.length > 0 || institutes.length > 0) { 
         db.courses.saveAll(courses);
    }
  }, [courses]);

  useEffect(() => {
    // Always save institutes even if empty (to persist deletions)
    db.institutes.saveAll(institutes);
  }, [institutes]);

  // --- HANDLERS ---

  const handleToggleNotifications = async () => {
     if (!notificationsEnabled) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setNotificationsEnabled(true);
            localStorage.setItem('profplanner_notifications', 'true');
        }
     } else {
        setNotificationsEnabled(false);
        localStorage.setItem('profplanner_notifications', 'false');
     }
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
        setInstitutes(institutes.filter(i => i.id !== id));
        setCourses(courses.map(c => c.instituteId === id ? { ...c, instituteId: undefined } : c));
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
      if (editingCourse) {
          // Edit mode: Remove old version of the edited course, then add new ones
          // Note: If the form returned multiple sessions (dates), we treat them as separate courses
          // The edited course ID is reused if the form preserves it, but CourseForm generates new IDs for new sessions.
          // Usually in Edit mode for 1 course, we just update that course.
          
          const otherCourses = courses.filter(c => c.id !== editingCourse.id);
          setCourses([...otherCourses, ...newCourses]);
          setEditingCourse(null);
      } else {
          setCourses([...courses, ...newCourses]);
      }
      setIsFormOpen(false);
  };

  const handleConflictConfirm = () => {
      processSave(pendingCoursesToSave);
      setIsConflictModalOpen(false);
      setPendingCoursesToSave([]);
  };

  const handleImport = (importedCourses: Course[]) => {
      // Simple import without conflict check blocking (or we could add it)
      // For now, just append
      setCourses([...courses, ...importedCourses]);
  };

  const handleDeleteCourse = (id: string) => {
      if (window.confirm("Eliminare questa lezione?")) {
          setCourses(courses.filter(c => c.id !== id));
      }
  };

  const handleUpdateCourse = (updated: Course) => {
      setCourses(courses.map(c => c.id === updated.id ? updated : c));
  };

  const handleEditCourse = (course: Course) => {
      setEditingCourse(course);
      setIsFormOpen(true);
  };

  // --- RENDERING HELPERS ---

  const getFilteredCourses = () => {
      let filtered = courses;
      if (selectedInstituteFilter) {
          filtered = filtered.filter(c => c.instituteId === selectedInstituteFilter);
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
      // Group by date, sorted ascending (future first?) or all?
      // Let's sort by date descending or ascending. Usually upcoming first.
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
          <div className="space-y-6 pb-20" ref={listRef}>
              {dates.length === 0 && (
                   <div className="text-center py-12 flex flex-col items-center opacity-50">
                       <Briefcase size={48} className="mb-4 text-slate-500" />
                       <p className="text-slate-400">Nessuna lezione trovata.</p>
                       <p className="text-slate-600 text-sm">Aggiungi un corso o importa un calendario.</p>
                   </div>
              )}
              {dates.map(date => (
                  <div key={date}>
                      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur py-2 mb-2 border-b border-white/5 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${date === new Date().toISOString().split('T')[0] ? 'bg-purple-500' : 'bg-slate-600'}`} />
                          <h3 className={`text-sm font-bold uppercase tracking-wider ${date === new Date().toISOString().split('T')[0] ? 'text-purple-400' : 'text-slate-400'}`}>
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
              ))}
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-purple-500/30">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex justify-between items-center shadow-lg">
             <div>
                 <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                     ProfPlanner
                 </h1>
                 <p className="text-xs text-slate-500 font-medium capitalize">{todayFormatted}</p>
             </div>
             
             <div className="flex gap-2">
                 <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition border border-white/5"
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

             <div className="flex gap-3 mb-6 overflow-x-auto pb-2 no-scrollbar">
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

                  {/* Institute Filter Chips */}
                  <div className="flex gap-2 items-center">
                      <button
                        onClick={() => setSelectedInstituteFilter('')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition border whitespace-nowrap ${
                            selectedInstituteFilter === '' 
                            ? 'bg-white text-slate-900 border-white' 
                            : 'bg-slate-900 text-slate-400 border-white/10 hover:border-white/30'
                        }`}
                      >
                          Tutti
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
             </div>

             {/* Content Area */}
             {renderContent()}

        </main>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
             <button
               onClick={() => setIsImportOpen(true)}
               className="p-4 bg-slate-800 text-purple-400 rounded-2xl shadow-xl shadow-black/40 border border-white/10 hover:scale-105 transition hover:text-purple-300 hover:bg-slate-700"
               title="Importa con AI"
             >
                 <Upload size={24} />
             </button>
             <button
               onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
               className="p-4 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl shadow-xl shadow-purple-900/30 hover:scale-105 transition border border-white/10"
               title="Nuova Lezione"
             >
                 <Plus size={28} />
             </button>
        </div>

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
        />

    </div>
  );
};

export default App;
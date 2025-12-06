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
import { Plus, Calendar as CalendarIcon, Upload, Briefcase, ChevronLeft, ChevronRight, List, LayoutGrid, Settings } from 'lucide-react';

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

  const handleAddInstitute = (name: string, color: string) => {
     const newInst: Institute = {
         id: Date.now().toString(),
         name,
         color
     };
     setInstitutes([...institutes, newInst]);
     return newInst; 
  };
  
  const onAddInstituteWrapper = (name: string) => handleAddInstitute(name, DEFAULT_COLOR);

  const handleUpdateInstitute = (inst: Institute) => {
     setInstitutes(institutes.map(i => i.id === inst.id ? inst : i));
  };

  const handleDeleteInstitute = (id: string) => {
     setInstitutes(institutes.filter(i => i.id !== id));
  };

  const checkForConflicts = (newCourses: Course[]): string[] => {
      const conflicts: string[] = [];
      newCourses.forEach(newC => {
          const [newStartH, newStartM] = newC.startTime.split(':').map(Number);
          const [newEndH, newEndM] = newC.endTime.split(':').map(Number);
          const newStart = newStartH * 60 + newStartM;
          const newEnd = newEndH * 60 + newEndM;

          courses.forEach(existingC => {
              if (existingC.id === newC.id) return; 
              if (existingC.date !== newC.date) return;

              const [exStartH, exStartM] = existingC.startTime.split(':').map(Number);
              const [exEndH, exEndM] = existingC.endTime.split(':').map(Number);
              const exStart = exStartH * 60 + exStartM;
              const exEnd = exEndH * 60 + exEndM;

              if (newStart < exEnd && newEnd > exStart) {
                  conflicts.push(`CONFLITTO: ${newC.date} - ${newC.startTime}/${newC.endTime} sovrapposto a ${existingC.name} (${existingC.startTime}-${existingC.endTime})`);
              }
          });
      });
      return conflicts;
  };

  const handleSaveCourses = (newCourses: Course[]) => {
      const conflicts = checkForConflicts(newCourses);
      
      if (conflicts.length > 0) {
          setPendingCoursesToSave(newCourses);
          setConflictMessages(conflicts);
          setIsConflictModalOpen(true);
          return;
      }
      
      finalizeSave(newCourses);
  };

  const finalizeSave = (newCourses: Course[]) => {
      let updatedCourses = [...courses];
      
      newCourses.forEach(nc => {
          const index = updatedCourses.findIndex(c => c.id === nc.id);
          if (index >= 0) {
              updatedCourses[index] = nc;
          } else {
              updatedCourses.push(nc);
          }
      });
      
      setCourses(updatedCourses);
      setIsConflictModalOpen(false);
      setEditingCourse(null);
  };

  const handleImportCourses = (importedCourses: Course[]) => {
      const conflicts = checkForConflicts(importedCourses);
      if (conflicts.length > 0) {
          setPendingCoursesToSave(importedCourses);
          setConflictMessages(conflicts);
          setIsConflictModalOpen(true);
      } else {
          setCourses([...courses, ...importedCourses]);
      }
  };

  const handleDeleteCourse = (id: string) => {
      setCourses(courses.filter(c => c.id !== id));
  };
  
  const handleUpdateCourse = (course: Course) => {
      setCourses(courses.map(c => c.id === course.id ? course : c));
  };

  const filteredCourses = courses.filter(c => c.date === selectedDate).sort((a,b) => a.startTime.localeCompare(b.startTime));
  const coursesInMonth = courses.filter(c => {
      const d = new Date(c.date);
      return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const changeDate = (offset: number) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);
      const newDate = d.toISOString().split('T')[0];
      setSelectedDate(newDate);
      
      if (d.getMonth() !== viewMonth) setViewMonth(d.getMonth());
      if (d.getFullYear() !== viewYear) setViewYear(d.getFullYear());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-purple-500/30">
      
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/5 p-4 safe-top">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
              <Briefcase className="text-purple-400" size={24} />
              ProfPlanner
            </h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{todayFormatted}</p>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => setIsSettingsOpen(true)}
               className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition"
             >
                <Settings size={20} className="text-slate-400" />
             </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-3xl mx-auto pt-24 px-4 sm:px-6">
        
        {/* VIEW CONTROLS */}
        <div className="flex justify-between items-center mb-6">
             {viewMode === 'list' ? (
                 <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-xl border border-white/5">
                    <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white/10 rounded-lg"><ChevronLeft size={20} /></button>
                    <div className="flex flex-col items-center w-32 cursor-pointer group relative">
                        <input 
                          type="date" 
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <span className="text-sm font-bold text-white group-hover:text-purple-400 transition">
                            {new Date(selectedDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">
                            {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long' })}
                        </span>
                    </div>
                    <button onClick={() => changeDate(1)} className="p-1 hover:bg-white/10 rounded-lg"><ChevronRight size={20} /></button>
                 </div>
             ) : (
                 <div className="flex items-center gap-2">
                     <button onClick={() => {
                         const d = new Date(viewYear, viewMonth - 1);
                         setViewMonth(d.getMonth()); setViewYear(d.getFullYear());
                     }} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><ChevronLeft size={16}/></button>
                     <span className="text-lg font-bold w-32 text-center">
                         {new Date(viewYear, viewMonth).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                     </span>
                     <button onClick={() => {
                         const d = new Date(viewYear, viewMonth + 1);
                         setViewMonth(d.getMonth()); setViewYear(d.getFullYear());
                     }} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"><ChevronRight size={16}/></button>
                 </div>
             )}

             <div className="bg-slate-800/50 p-1 rounded-lg border border-white/5 flex">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                   <List size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-md transition ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                   <LayoutGrid size={18} />
                </button>
             </div>
        </div>

        <StatsOverview courses={coursesInMonth} monthName="" />

        {/* CONTENT AREA */}
        <div ref={listRef} className="min-h-[300px]">
           {viewMode === 'list' ? (
              <div className="space-y-3 pb-24">
                 {filteredCourses.length === 0 ? (
                    <div className="text-center py-12 opacity-50 flex flex-col items-center">
                       <CalendarIcon size={48} className="mb-4 text-slate-600" />
                       <p className="text-lg font-medium">Nessuna lezione in questa data</p>
                       <p className="text-sm text-slate-500">Goditi il tempo libero!</p>
                       <button onClick={() => setIsFormOpen(true)} className="mt-4 text-purple-400 text-sm hover:underline">
                          Oppure aggiungi una lezione
                       </button>
                    </div>
                 ) : (
                    filteredCourses.map(course => (
                       <CourseCard 
                         key={course.id} 
                         course={course} 
                         institute={institutes.find(i => i.id === course.instituteId)}
                         onEdit={(c) => { setEditingCourse(c); setIsFormOpen(true); }}
                         onDelete={handleDeleteCourse}
                         onUpdate={handleUpdateCourse}
                       />
                    ))
                 )}
              </div>
           ) : (
              <CalendarView 
                courses={courses} 
                institutes={institutes} 
                year={viewYear} 
                month={viewMonth}
                selectedDate={selectedDate}
                onSelectDate={(d) => { setSelectedDate(d); setViewMode('list'); }}
              />
           )}
        </div>

      </main>

      {/* FABs */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
        <button 
          onClick={() => setIsImportOpen(true)}
          className="w-12 h-12 bg-slate-800 border border-white/10 text-slate-300 rounded-full shadow-xl flex items-center justify-center hover:bg-slate-700 hover:text-white transition"
          title="Importa da testo"
        >
           <Upload size={20} />
        </button>
        <button 
          onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
          className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-blue-600 text-white rounded-2xl shadow-xl shadow-purple-900/30 flex items-center justify-center hover:scale-105 active:scale-95 transition"
          title="Nuova Lezione"
        >
           <Plus size={28} />
        </button>
      </div>

      {/* MODALS */}
      <CourseForm 
         isOpen={isFormOpen} 
         onClose={() => { setIsFormOpen(false); setEditingCourse(null); }} 
         onSubmit={handleSaveCourses}
         initialData={editingCourse}
         institutes={institutes}
         onAddInstitute={onAddInstituteWrapper}
         preselectedDate={selectedDate}
      />

      <ImportModal 
         isOpen={isImportOpen} 
         onClose={() => setIsImportOpen(false)} 
         onImport={handleImportCourses} 
      />

      <ConflictModal 
         isOpen={isConflictModalOpen} 
         onClose={() => { setIsConflictModalOpen(false); setPendingCoursesToSave([]); }} 
         onConfirm={() => finalizeSave(pendingCoursesToSave)}
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
      
      {notificationCourses.length > 0 && (
         <NotificationModal 
            courses={notificationCourses} 
            onClose={() => setNotificationCourses([])} 
         />
      )}

    </div>
  );
};

export default App;
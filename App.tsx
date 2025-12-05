import React, { useState, useEffect, useRef } from 'react';
import { Course, Institute } from './types';
import CourseCard from './components/CourseCard';
import CourseForm from './components/CourseForm';
import ImportModal from './components/ImportModal';
import NotificationModal from './components/NotificationModal';
import CalendarView from './components/CalendarView';
import { db } from './services/db'; // New Import
import { Plus, Calendar as CalendarIcon, Upload, Briefcase, ChevronLeft, ChevronRight, List, LayoutGrid } from 'lucide-react';

const INSTITUTE_COLORS = [
  '#38bdf8', // Sky Blue
  '#f472b6', // Pink
  '#a78bfa', // Purple
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f87171', // Red
  '#a3e635', // Lime
  '#22d3ee', // Cyan
];

const App: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [notificationCourses, setNotificationCourses] = useState<Course[]>([]);
  
  // View State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filtering state
  const [selectedDate, setSelectedDate] = useState<string>(''); // empty = no specific day selected
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());

  const listRef = useRef<HTMLDivElement>(null);

  // Current Date for Header
  const todayFormatted = new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  
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
    // We use a small timeout or just direct save. For this scale, direct save is fine.
    // In a real DB app, you might want to debounce this or only save on specific actions.
    if (courses.length > 0 || institutes.length > 0) { // Avoid overwriting with empty on first render if empty
         db.courses.saveAll(courses);
    }
  }, [courses]);

  useEffect(() => {
    if (institutes.length > 0) {
        db.institutes.saveAll(institutes);
    }
  }, [institutes]);

  // Check for next day notifications
  const checkTomorrowCourses = (currentCourses: Course[]) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const upcoming = currentCourses.filter(c => c.date === tomorrowStr);
    if (upcoming.length > 0) {
      setNotificationCourses(upcoming);
    }
  };

  // --- HELPER FUNCTIONS FOR CONFLICT DETECTION ---
  
  // Convert HH:mm to minutes from midnight
  const toMinutes = (time: string): number => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Check if two courses overlap
  const isOverlapping = (c1: Course, c2: Course): boolean => {
    if (c1.date !== c2.date) return false;
    
    const s1 = toMinutes(c1.startTime);
    const e1 = toMinutes(c1.endTime);
    const s2 = toMinutes(c2.startTime);
    const e2 = toMinutes(c2.endTime);

    // Overlap logic: Start1 < End2 AND End1 > Start2
    return (s1 < e2 && e1 > s2);
  };

  // --- UNIFIED SAVE LOGIC ---
  const validateAndSaveCourses = (newCoursesData: Course[]) => {
    const conflictMessages: string[] = [];

    // 1. Internal Check (Conflicts within the new batch itself)
    if (newCoursesData.length > 1) {
        for (let i = 0; i < newCoursesData.length; i++) {
            for (let j = i + 1; j < newCoursesData.length; j++) {
                if (isOverlapping(newCoursesData[i], newCoursesData[j])) {
                    const c1 = newCoursesData[i];
                    const c2 = newCoursesData[j];
                    conflictMessages.push(`INTERNO: ${c1.date} - ${c1.startTime} si sovrappone a ${c2.startTime}`);
                }
            }
        }
    }

    // 2. Database Check (Conflicts with existing saved courses)
    for (const newCourse of newCoursesData) {
        const overlaps = courses.filter(existing => {
            // Ignore self if editing
            if (editingCourse && existing.id === editingCourse.id) return false; 
            return isOverlapping(newCourse, existing);
        });

        if (overlaps.length > 0) {
            overlaps.forEach(ov => {
                // Format date for readability
                const d = new Date(newCourse.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
                conflictMessages.push(`CONFLITTO: ${d} ${newCourse.startTime}-${newCourse.endTime} vs "${ov.name}" (${ov.startTime})`);
            });
        }
    }

    // 3. Prompt user if ANY conflicts exist
    if (conflictMessages.length > 0) {
        const confirmMsg = `⚠️ ATTENZIONE: Rilevati ${conflictMessages.length} conflitti di orario!\n\n` +
                           conflictMessages.slice(0, 6).join('\n') + 
                           (conflictMessages.length > 6 ? `\n...e altri ${conflictMessages.length - 6}.` : '') +
                           `\n\nVuoi procedere comunque salvando le lezioni sovrapposte?`;
        
        if (!window.confirm(confirmMsg)) {
            return; // ABORT SAVE
        }
    }

    // 4. Save Logic
    if (editingCourse && newCoursesData.length === 1) {
       // Edit Mode
       setCourses(courses.map(c => c.id === newCoursesData[0].id ? newCoursesData[0] : c));
       setEditingCourse(null);
    } else {
       // Create / Import Mode
       setCourses(prev => [...prev, ...newCoursesData]);
    }
  };

  const handleAddCourses = (newCoursesData: Course[]) => {
    validateAndSaveCourses(newCoursesData);
  };
  
  const handleImport = (newCourses: Course[]) => {
    // Reuse the same validation logic for imports!
    validateAndSaveCourses(newCourses);
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    setCourses(courses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
  };

  const handleDelete = (id: string) => {
    if(window.confirm("Sei sicuro di voler eliminare DEFINITIVAMENTE questa lezione?")) {
        setCourses(courses.filter(c => c.id !== id));
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsFormOpen(true);
  };

  const handleAddInstitute = (name: string): Institute => {
    const newInst: Institute = {
      id: Date.now().toString() + Math.random(),
      name,
      color: INSTITUTE_COLORS[institutes.length % INSTITUTE_COLORS.length]
    };
    setInstitutes([...institutes, newInst]);
    return newInst;
  };

  const handleDateSelection = (date: string) => {
    if (date === selectedDate) {
      setSelectedDate('');
    } else {
      setSelectedDate(date);
      // Smooth scroll to list
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const getInstitute = (id?: string) => institutes.find(i => i.id === id);

  // --- Filtering Logic ---

  // Get dates that have courses within the selected Month/Year
  const getDaysInMonthWithCourses = () => {
    const dates = new Set<string>();
    courses.forEach(c => {
      const d = new Date(c.date);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        dates.add(c.date);
      }
    });
    return Array.from(dates).sort();
  };

  const filteredCourses = courses
    .filter(c => {
      const d = new Date(c.date);
      // Filter by Month/Year view
      if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) return false;
      // Filter by specific date if selected
      if (selectedDate && c.date !== selectedDate) return false;
      return true;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setViewMonth(m);
    setViewYear(y);
    setSelectedDate(''); 
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const displayDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${monthName}`;

  return (
    <div className="min-h-screen font-sans text-white">
      
      {/* FIXED Background Gradient Orbs - Will not move on scroll */}
      <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-900 z-[-1]">
         <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '8s'}} />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse" style={{animationDuration: '10s'}} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sticky top-0 bg-slate-900/80 backdrop-blur-xl p-4 -mx-3 sm:-mx-4 rounded-b-2xl border-b border-white/5 z-40 transition-all shadow-lg shadow-black/20">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 flex items-center gap-2">
              <Briefcase className="text-purple-400" /> ProfPlanner AI
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">Gestisci il tuo diario formativo</p>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-4 w-full md:w-auto mt-2 md:mt-0">
             {/* Today Date Badge */}
             <div className="flex flex-col items-start md:items-end text-left md:text-right border-l md:border-l-0 md:border-r border-white/10 pl-3 md:pl-0 md:pr-4 mr-auto md:mr-0">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Oggi</span>
                <span className="text-sm sm:text-lg font-bold text-white capitalize flex items-center gap-2 whitespace-nowrap">
                   {todayFormatted}
                </span>
             </div>

            <div className="flex gap-2">
                <button 
                  onClick={() => setIsImportOpen(true)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition flex items-center gap-2 text-sm font-medium backdrop-blur-md"
                >
                  <Upload size={18} className="text-blue-400" />
                  <span className="hidden sm:inline">Importa</span>
                </button>
                <button 
                  onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl transition flex items-center gap-2 text-sm font-medium shadow-lg shadow-purple-900/30 active:scale-95 whitespace-nowrap"
                >
                  <Plus size={18} />
                  Nuovo
                </button>
            </div>
          </div>
        </header>

        {/* Month Navigation Control */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-2 mb-4 backdrop-blur-sm">
           <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-white/10 rounded-xl transition">
             <ChevronLeft size={20}/>
           </button>
           
           <h2 className="text-lg sm:text-xl font-bold capitalize text-center">{monthName}</h2>
           
           <button onClick={() => changeMonth(1)} className="p-3 hover:bg-white/10 rounded-xl transition">
             <ChevronRight size={20} />
           </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 w-full sm:w-fit mx-auto border border-white/5">
           <button 
             onClick={() => setViewMode('list')}
             className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${
               viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
             }`}
           >
             <List size={16} /> Lista
           </button>
           <button 
             onClick={() => setViewMode('calendar')}
             className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${
               viewMode === 'calendar' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
             }`}
           >
             <LayoutGrid size={16} /> Calendario
           </button>
        </div>

        {/* --- VIEW: CALENDAR --- */}
        <div className={`transition-all duration-500 ${viewMode === 'calendar' ? 'opacity-100 max-h-[800px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
           <div className="mb-6">
             <CalendarView 
               courses={courses}
               institutes={institutes}
               year={viewYear}
               month={viewMonth}
               selectedDate={selectedDate}
               onSelectDate={handleDateSelection}
             />
           </div>
        </div>

        {/* --- VIEW: LIST (Horizontal Scroller) --- */}
        {viewMode === 'list' && (
          <div className="mb-6 overflow-x-auto pb-2 custom-scrollbar -mx-2 px-2">
            <div className="flex gap-2 min-w-max">
              <button
                 onClick={() => setSelectedDate('')}
                 className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm whitespace-nowrap transition border flex flex-col items-center justify-center min-w-[60px] sm:min-w-[70px] ${
                   selectedDate === '' 
                   ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40' 
                   : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-slate-800'
                 }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Tutto</span>
                <span className="font-bold text-lg leading-none mt-1">{monthName.slice(0,3)}</span>
              </button>

              {getDaysInMonthWithCourses().map(dateStr => {
                 const date = new Date(dateStr);
                 const isSelected = selectedDate === dateStr;
                 const dayName = date.toLocaleDateString('it-IT', { weekday: 'short' });
                 const dayNum = date.getDate();
                 
                 return (
                   <button
                     key={dateStr}
                     onClick={() => handleDateSelection(dateStr)}
                     className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-sm whitespace-nowrap transition border flex flex-col items-center justify-center min-w-[60px] sm:min-w-[70px] ${
                       isSelected
                       ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40 transform scale-105' 
                       : 'bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-800'
                     }`}
                   >
                     <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>{dayName}</span>
                     <span className="font-bold text-lg leading-none mt-1">{dayNum}</span>
                   </button>
                 );
              })}
            </div>
          </div>
        )}

        {/* --- COURSE LIST --- */}
        <div ref={listRef} className="space-y-4 min-h-[300px]">
          {filteredCourses.length > 0 ? (
            <>
              {selectedDate && (
                <div className="flex items-center gap-2 mb-2 px-1">
                   <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                   <h3 className="font-bold text-slate-200 capitalize">
                     {new Date(selectedDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                   </h3>
                </div>
              )}
              
              {filteredCourses.map(course => (
                <CourseCard 
                  key={course.id} 
                  course={course}
                  institute={getInstitute(course.instituteId)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUpdate={handleUpdateCourse}
                />
              ))}
            </>
          ) : (
             <div className="flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-slate-900/30">
                <CalendarIcon size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Nessuna lezione trovata</p>
                <p className="text-sm opacity-60">Seleziona un altro giorno o aggiungi un corso</p>
             </div>
          )}
        </div>

      </div>

      {/* Modals */}
      <CourseForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddCourses}
        initialData={editingCourse}
        institutes={institutes}
        onAddInstitute={handleAddInstitute}
        preselectedDate={selectedDate || undefined}
      />

      <ImportModal 
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
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
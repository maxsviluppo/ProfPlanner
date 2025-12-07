import React from 'react';
import { Course, Institute } from '../types';

interface CalendarViewProps {
  courses: Course[];
  institutes: Institute[];
  year: number;
  month: number; // 0-11
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  courses, institutes, year, month, onSelectDate, selectedDate 
}) => {
  
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    let day = new Date(y, m, 1).getDay(); 
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  
  const blanks = Array(startDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  const getCoursesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return courses.filter(c => c.date === dateStr);
  };

  const getSegmentColor = (dayCourses: Course[]) => {
    if (dayCourses.length === 0) return 'transparent';

    // Priority 1: If ANY course in this segment is completed, GREEN
    if (dayCourses.some(c => c.completed)) {
      return '#10b981'; // Emerald 500
    }

    // Priority 2: Institute Color of the first course
    const inst = institutes.find(i => i.id === dayCourses[0].instituteId);
    return inst ? inst.color : '#cbd5e1'; 
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-2 sm:p-4 border border-white/10 shadow-xl animate-in fade-in zoom-in-95">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-500 uppercase py-2 tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {totalSlots.map((day, index) => {
          if (!day) return <div key={`blank-${index}`} className="aspect-square" />;

          const dayCourses = getCoursesForDay(day);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = selectedDate === dateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          
          // Split courses by time
          const morningCourses = dayCourses.filter(c => parseInt(c.startTime.split(':')[0], 10) < 14);
          const afternoonCourses = dayCourses.filter(c => parseInt(c.startTime.split(':')[0], 10) >= 14);

          const morningColor = getSegmentColor(morningCourses);
          const afternoonColor = getSegmentColor(afternoonCourses);

          return (
            <div 
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square relative rounded-lg sm:rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border group shadow-sm ${
                isSelected 
                  ? 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)] z-20 scale-105 ring-1 ring-purple-400' 
                  : isToday
                    ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] bg-cyan-900/20 z-10 ring-1 ring-cyan-400' 
                    : 'border-white/10 hover:border-white/30'
              } bg-slate-900/40`}
            >
              {/* TOP HALF - MORNING */}
              <div 
                className="absolute top-0 left-0 right-0 h-[50%] transition-colors duration-300"
                style={{ backgroundColor: morningColor, opacity: morningColor === 'transparent' ? 0 : 0.6 }}
              />

              {/* BOTTOM HALF - AFTERNOON */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-[50%] transition-colors duration-300 border-t border-black/10"
                style={{ backgroundColor: afternoonColor, opacity: afternoonColor === 'transparent' ? 0 : 0.6 }}
              />

              {/* Day Number Overlay */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <span className={`text-base sm:text-lg font-bold drop-shadow-md ${
                  isSelected 
                    ? 'text-white scale-110' 
                    : isToday 
                        ? 'text-cyan-50' 
                        : 'text-slate-200 group-hover:text-white'
                }`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {day}
                </span>
              </div>

              {/* Add subtle hint for empty slots on hover - Desktop Only */}
              {dayCourses.length === 0 && (
                 <div className="hidden sm:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 z-10">
                    {/* Just a hover effect */}
                 </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-between text-[10px] text-slate-400 px-1 sm:px-2 border-t border-white/5 pt-2">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 border border-white/20 bg-slate-700/50 rounded-sm overflow-hidden relative">
            <div className="absolute top-0 w-full h-1/2 bg-purple-500/60"></div>
          </div>
          Mattina
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 bg-[#10b981] rounded-sm opacity-60"></div>
          Completata
        </span>
        <span className="flex items-center gap-1">
           Pomeriggio
           <div className="w-3 h-3 border border-white/20 bg-slate-700/50 rounded-sm overflow-hidden relative">
            <div className="absolute bottom-0 w-full h-1/2 bg-blue-500/60"></div>
          </div>
        </span>
      </div>
    </div>
  );
};

export default CalendarView;
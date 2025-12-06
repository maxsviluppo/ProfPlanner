import React, { useMemo } from 'react';
import { Course, Institute } from '../types';
import { BookOpen, Clock, Euro, TrendingUp, CalendarRange, Wallet } from 'lucide-react';

interface StatsOverviewProps {
  courses: Course[];         // All courses (for year stats)
  institutes: Institute[];
  viewMonth: number;
  viewYear: number;
  selectedInstituteId: string; // Filter
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ 
  courses, institutes, viewMonth, viewYear, selectedInstituteId 
}) => {
  
  const stats = useMemo(() => {
    // Helper to calculate cost for a single course
    const calculateEarnings = (course: Course) => {
      const inst = institutes.find(i => i.id === course.instituteId);
      if (!inst || !inst.defaultRate) return 0;

      if (inst.rateType === 'PER_LESSON') {
        return inst.defaultRate;
      } else {
        // HOURLY
        const [startH, startM] = course.startTime.split(':').map(Number);
        const [endH, endM] = course.endTime.split(':').map(Number);
        const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
        const durationHours = durationMinutes / 60;
        return durationHours * inst.defaultRate;
      }
    };

    // Filter logic
    const filterFn = (c: Course) => {
       if (selectedInstituteId && c.instituteId !== selectedInstituteId) return false;
       return true;
    };

    // 1. Current Month Stats
    const monthCourses = courses.filter(c => {
       const d = new Date(c.date);
       return d.getMonth() === viewMonth && d.getFullYear() === viewYear && filterFn(c);
    });

    let monthMinutes = 0;
    let monthEarnings = 0;

    monthCourses.forEach(c => {
       const [startH, startM] = c.startTime.split(':').map(Number);
       const [endH, endM] = c.endTime.split(':').map(Number);
       monthMinutes += ((endH * 60 + endM) - (startH * 60 + startM));
       monthEarnings += calculateEarnings(c);
    });

    // 2. Year Stats
    const yearCourses = courses.filter(c => {
       const d = new Date(c.date);
       return d.getFullYear() === viewYear && filterFn(c);
    });

    let yearEarnings = 0;
    yearCourses.forEach(c => {
       yearEarnings += calculateEarnings(c);
    });

    return {
      monthCount: monthCourses.length,
      monthHours: Math.floor(monthMinutes / 60),
      monthMinutesRest: monthMinutes % 60,
      monthEarnings,
      yearEarnings
    };
  }, [courses, institutes, viewMonth, viewYear, selectedInstituteId]);

  // Determine dynamic color based on selection
  const activeColor = selectedInstituteId 
    ? (institutes.find(i => i.id === selectedInstituteId)?.color || '#a855f7') 
    : '#a855f7'; // Default Purple

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-in slide-in-from-top-4 fade-in duration-500">
      
      {/* CARD 1: Riepilogo Mese (Ore & Lezioni) */}
      <div className="relative overflow-hidden bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between group shadow-lg">
        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity text-white">
            <Clock size={80} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20"></div>
        <div className="absolute bottom-0 left-0 h-1 transition-all duration-500" style={{ width: '40%', backgroundColor: activeColor }}></div>
        
        <div className="flex justify-between items-start z-10">
            <div>
               <div className="flex items-center gap-2 mb-1 opacity-80" style={{ color: activeColor }}>
                  <CalendarRange size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Questo Mese</span>
               </div>
               <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{stats.monthHours}</span>
                  <span className="text-sm text-slate-400">h</span>
                  {stats.monthMinutesRest > 0 && <span className="text-lg text-slate-300">{stats.monthMinutesRest}m</span>}
               </div>
            </div>
            <div className="text-right">
                <span className="block text-2xl font-bold text-white">{stats.monthCount}</span>
                <span className="text-[10px] text-slate-500 uppercase">Lezioni</span>
            </div>
        </div>
      </div>

      {/* CARD 2: Bilancio Mese */}
      <div className="relative overflow-hidden bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between group shadow-lg">
         <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-400">
            <Wallet size={80} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/30"></div>
        
        <div className="z-10">
           <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <div className="p-1 bg-emerald-500/20 rounded">
                  <TrendingUp size={14} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Stimato Mese</span>
           </div>
           
           <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white tracking-tight">€ {stats.monthEarnings.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
           </div>
        </div>
      </div>

      {/* CARD 3: Bilancio Anno */}
      <div className="relative overflow-hidden bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between group shadow-lg sm:col-span-1 col-span-1">
        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity text-blue-400">
            <Euro size={80} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/30"></div>

        <div className="z-10">
           <div className="flex items-center gap-2 mb-2 text-blue-400">
              <div className="p-1 bg-blue-500/20 rounded">
                  <BookOpen size={14} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Totale Anno {viewYear}</span>
           </div>
           
           <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white tracking-tight">€ {stats.yearEarnings.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
           </div>
        </div>
      </div>

    </div>
  );
};

export default StatsOverview;
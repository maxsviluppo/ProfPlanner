import React, { useMemo } from 'react';
import { Course } from '../types';
import { BookOpen, Clock, TrendingUp, Hourglass } from 'lucide-react';

interface StatsOverviewProps {
  courses: Course[];
  monthName: string;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ courses }) => {
  
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let lessonCount = courses.length;

    courses.forEach(course => {
      const [startH, startM] = course.startTime.split(':').map(Number);
      const [endH, endM] = course.endTime.split(':').map(Number);
      
      const startInMins = startH * 60 + startM;
      const endInMins = endH * 60 + endM;
      
      totalMinutes += (endInMins - startInMins);
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return { hours, minutes, count: lessonCount };
  }, [courses]);

  if (stats.count === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 animate-in slide-in-from-top-4 fade-in duration-500">
      
      {/* Card Lezioni */}
      <div className="relative overflow-hidden bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col justify-between group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen size={60} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50"></div>
        
        <div className="flex items-center gap-2 mb-2 text-blue-300">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <TrendingUp size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Lezioni</span>
        </div>
        
        <div className="flex items-baseline gap-1 relative z-10">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{stats.count}</span>
            <span className="text-xs text-slate-400 font-medium">nel mese</span>
        </div>
      </div>

      {/* Card Ore */}
      <div className="relative overflow-hidden bg-slate-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col justify-between group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={60} />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50"></div>

        <div className="flex items-center gap-2 mb-2 text-emerald-300">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <Hourglass size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Ore Totali</span>
        </div>

        <div className="flex items-baseline gap-1 relative z-10">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {stats.hours}<span className="text-lg sm:text-xl text-slate-500 font-normal">h</span>
                {stats.minutes > 0 && (
                    <span className="ml-1 text-2xl sm:text-3xl text-slate-300">
                        {stats.minutes}<span className="text-sm text-slate-500 font-normal">m</span>
                    </span>
                )}
            </span>
        </div>
      </div>

    </div>
  );
};

export default StatsOverview;
import React, { useState } from 'react';
import { Course, Institute } from '../types';
import { Clock, MapPin, Laptop, Edit2, Trash2, Hash, Building2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  institute?: Institute;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  onUpdate: (course: Course) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, institute, onEdit, onDelete, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const isDad = course.modality === 'DAD';
  const isCompleted = course.completed || false;
  
  const titleStyle = institute 
    ? { color: institute.color, textShadow: `0 0 15px ${institute.color}40` } 
    : { color: 'white' };

  const minSwipeDistance = 75;

  // --- Swipe Handlers ---
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    setIsSwiping(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStart(clientX);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping || touchStart === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - touchStart;
    
    // Limit drag distance for better feel
    if (diff > 150) setTranslateX(150 + (diff - 150) * 0.2);
    else if (diff < -150) setTranslateX(-150 + (diff + 150) * 0.2);
    else setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (touchStart === null) {
      setTranslateX(0);
      return;
    }

    // Determine action based on drag distance
    if (translateX > minSwipeDistance) {
      onEdit(course);
      setTranslateX(0); // Snap back after triggering
    } else if (translateX < -minSwipeDistance) {
      onDelete(course.id);
      setTranslateX(0); // Snap back after triggering
    } else {
      setTranslateX(0); // Reset if not far enough
    }
    
    setTouchStart(null);
  };

  const handleToggleComplete = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...course, completed: e.target.checked });
  };

  const handleTopicsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...course, topics: e.target.value });
  };

  let bgClass = "bg-white/5 border-white/10";
  if (isCompleted) bgClass = "bg-emerald-900/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]";

  // Visuals for swipe
  const opacity = Math.max(0.5, 1 - Math.abs(translateX) / 300);
  const scale = Math.max(0.95, 1 - Math.abs(translateX) / 1000);
  
  // Dynamic Background Color based on direction
  let swipeBgColor = 'bg-transparent';
  if (translateX > 10) swipeBgColor = 'bg-blue-600/80';
  else if (translateX < -10) swipeBgColor = 'bg-red-600/80';

  return (
    <div className="relative mb-3 select-none">
      
      {/* Background Actions Layer (Colored) */}
      <div className={`absolute inset-0 flex items-center justify-between rounded-xl overflow-hidden px-4 transition-colors duration-200 ${swipeBgColor}`}>
        <div className={`flex items-center gap-2 text-white transition-opacity duration-300 ${translateX > 30 ? 'opacity-100' : 'opacity-0'}`}>
           <Edit2 size={24} />
           <span className="font-bold uppercase tracking-wider text-sm">Modifica</span>
        </div>
        <div className={`flex items-center gap-2 text-white transition-opacity duration-300 ${translateX < -30 ? 'opacity-100' : 'opacity-0'}`}>
           <span className="font-bold uppercase tracking-wider text-sm">Elimina</span>
           <Trash2 size={24} />
        </div>
      </div>

      {/* Main Card Layer */}
      <div 
        className={`relative z-10 backdrop-blur-md border rounded-xl shadow-lg ${bgClass} overflow-hidden`}
        style={{ 
          transform: `translateX(${translateX}px) scale(${scale})`,
          opacity: opacity,
          transition: isSwiping ? 'none' : 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.2s', // Smoother release
          cursor: isSwiping ? 'grabbing' : 'grab'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onDoubleClick={() => setIsExpanded(!isExpanded)}
      >
        
        {/* Visual Indicator Strip */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCompleted ? 'bg-emerald-400' : (isDad ? 'bg-blue-500' : 'bg-emerald-500')}`} />

        <div className="p-3 sm:p-4 pl-4 sm:pl-5">
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-2">
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border-none text-white ${
                 isCompleted
                 ? 'bg-emerald-600'
                 : isDad 
                   ? 'bg-blue-600' 
                   : 'bg-emerald-600'
               }`}>
                 {isCompleted ? 'COMPLETATA' : (isDad ? 'ONLINE' : 'PRESENZA')}
               </span>
               {course.code && (
                 <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5">
                   <Hash size={10} /> {course.code}
                 </span>
               )}
             </div>
             
             <button 
               onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
               className="text-slate-500 hover:text-white transition p-1"
             >
               {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
             </button>
          </div>

          <div className="mb-2">
            <h3 className="text-base sm:text-lg font-bold leading-tight" style={titleStyle}>
              {course.name}
            </h3>
            
            {institute && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <Building2 size={12} className="opacity-70" style={{ color: institute.color }}/>
                <span className="uppercase tracking-wide opacity-80">{institute.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className={isCompleted ? "text-emerald-400" : "text-purple-400"} />
              <span className="font-mono">{course.startTime} - {course.endTime}</span>
            </div>
            {isDad ? (
              <div className="flex items-center gap-1.5 text-blue-300/80">
                 <Laptop size={14} />
                 <span>Remoto</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-300/80">
                 <MapPin size={14} />
                 <span>Aula</span>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-white/5 bg-black/20 p-3 sm:p-4 animate-in slide-in-from-top-2">
            
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                        <input 
                        type="checkbox" 
                        id={`check-${course.id}`}
                        className="peer appearance-none h-6 w-6 border-2 border-white/20 rounded-md checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                        checked={isCompleted}
                        onChange={handleToggleComplete}
                        />
                        <CheckCircle2 size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                    <label htmlFor={`check-${course.id}`} className="text-sm font-medium text-white cursor-pointer select-none">
                        Lezione Fatta
                    </label>
                </div>

                <button 
                  onClick={() => onDelete(course.id)}
                  className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                  title="Elimina lezione"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Argomenti Fatti</label>
              <textarea
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                rows={3}
                placeholder="Inserisci gli argomenti trattati..."
                value={course.topics || ''}
                onChange={handleTopicsChange}
                onMouseDown={(e) => e.stopPropagation()} 
                onTouchStart={(e) => e.stopPropagation()} // Important to stop card drag when in textarea
              />
            </div>
            
            <div className="flex justify-end mt-2 pt-2 gap-4 text-xs text-slate-500">
               <span>Doppio click per chiudere</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CourseCard;
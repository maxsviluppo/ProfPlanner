import React, { useState } from 'react';
import { Course, Institute } from '../types';
import { Clock, MapPin, Laptop, Edit2, Trash2, Hash, Building2, CheckCircle2, ChevronDown, ChevronUp, BookOpen, StickyNote } from 'lucide-react';

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
  const hasTopics = course.topics && course.topics.trim().length > 0;
  
  const titleStyle = institute 
    ? { color: institute.color, textShadow: `0 0 15px ${institute.color}40` } 
    : { color: 'white' };

  const swipeThreshold = 85; // Distance to trigger action

  // --- Swipe Handlers ---
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Prevent swipe on inputs/textareas
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    setIsSwiping(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStart(clientX);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping || touchStart === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - touchStart;
    
    const dampedDiff = diff / (1 + Math.abs(diff) / 300);
    setTranslateX(dampedDiff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (touchStart === null) {
      setTranslateX(0);
      return;
    }

    const absX = Math.abs(translateX);

    if (absX > swipeThreshold) {
      if (translateX > 0) {
        setTranslateX(0); 
        onEdit(course);
      } else {
        setTranslateX(0); 
        setTimeout(() => onDelete(course.id), 100); 
      }
    } else {
      setTranslateX(0);
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

  const progress = Math.min(Math.abs(translateX) / swipeThreshold, 1.2); 
  const opacity = Math.max(0.6, 1 - progress * 0.4); 
  const scale = Math.max(0.98, 1 - progress * 0.02); 
  const iconScale = Math.min(0.8 + progress * 0.4, 1.2); 
  const iconOpacity = Math.min(progress, 1);

  return (
    <div className="relative mb-3 select-none group">
      
      {/* Background Actions Layer */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <div 
            className="absolute inset-y-0 left-0 w-1/2 bg-blue-600 flex items-center pl-6 transition-opacity duration-200"
            style={{ opacity: translateX > 0 ? 1 : 0 }}
        >
           <div style={{ transform: `scale(${iconScale})`, opacity: iconOpacity }} className="flex items-center gap-2 text-white font-bold transition-transform duration-100 will-change-transform">
               <Edit2 size={24} />
               <span className="text-sm tracking-wider">MODIFICA</span>
           </div>
        </div>

        <div 
            className="absolute inset-y-0 right-0 w-1/2 bg-red-600 flex items-center justify-end pr-6 transition-opacity duration-200"
            style={{ opacity: translateX < 0 ? 1 : 0 }}
        >
           <div style={{ transform: `scale(${iconScale})`, opacity: iconOpacity }} className="flex items-center gap-2 text-white font-bold transition-transform duration-100 will-change-transform">
               <span className="text-sm tracking-wider">ELIMINA</span>
               <Trash2 size={24} />
           </div>
        </div>
      </div>

      {/* Main Card Layer */}
      <div 
        className={`relative z-10 backdrop-blur-md border rounded-xl shadow-lg ${bgClass} overflow-hidden will-change-transform`}
        style={{ 
          transform: `translateX(${translateX}px) scale(${scale})`,
          opacity: opacity,
          transition: isSwiping ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s', 
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
             
             <div className="flex items-center gap-2">
                {/* Topic Indicator (Visible when collapsed) */}
                {hasTopics && !isExpanded && (
                    <div className="text-purple-400 animate-in fade-in" title="Argomenti presenti">
                        <BookOpen size={16} />
                    </div>
                )}
                <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="text-slate-500 hover:text-white transition p-1"
                >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
             </div>
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
          <div className="border-t border-white/5 bg-black/20 p-3 sm:p-4 animate-in slide-in-from-top-2 space-y-4">
            
            {/* Action Row */}
            <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-3 pl-1">
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
                        Segna come fatta
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

            {/* Argomenti Section - Always Visible in Expanded Mode */}
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-purple-300 mb-1 pl-1">
                  <StickyNote size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Argomenti del giorno</span>
               </div>
               
               <div className="relative group">
                  <textarea
                    className="w-full bg-slate-900/80 border border-white/10 group-hover:border-purple-500/30 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all shadow-inner"
                    rows={4}
                    placeholder="Scrivi qui gli argomenti trattati in lezione..."
                    value={course.topics || ''}
                    onChange={handleTopicsChange}
                    onMouseDown={(e) => e.stopPropagation()} 
                    onTouchStart={(e) => e.stopPropagation()} 
                  />
                  {/* Subtle decorative corner */}
                  <div className="absolute bottom-2 right-2 pointer-events-none opacity-50">
                     <Edit2 size={12} className="text-slate-600" />
                  </div>
               </div>
            </div>
            
            <div className="flex justify-center pt-1">
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                 className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
               >
                 <ChevronUp size={12} /> Chiudi dettagli
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CourseCard;
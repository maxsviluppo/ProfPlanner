import React, { useState } from 'react';
import { Course, Institute } from '../types';
import { Clock, MapPin, Laptop, Edit2, Trash2, Building2, CheckCircle2, ChevronDown, ChevronUp, StickyNote, ExternalLink, Save, Sun, Moon } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  institute?: Institute;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  onUpdate: (course: Course) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, institute, onEdit, onDelete, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  
  // Animation state for the "bounce" effect and completion
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const isDad = course.modality === 'DAD';
  const isCompleted = course.completed || false;
  // FORCE BOOLEAN to avoid TS2322
  const hasTopics = !!(course.topics && course.topics.trim().length > 0);
  
  const instituteColor = institute?.color || '#94a3b8'; // Default slate-400

  // Time of Day Logic
  const startHour = parseInt(course.startTime.split(':')[0], 10);
  const isMorning = startHour < 14;
  const timeOfDayLabel = isMorning ? 'MATTINA' : 'POMERIGGIO';

  const swipeThreshold = 85;

  // --- Linkify Helper ---
  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => 
      urlRegex.test(part) ? (
        <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:text-blue-300 underline break-all inline-flex items-center gap-0.5 align-middle"
            onClick={(e) => e.stopPropagation()}
        >
          {part} <ExternalLink size={10} className="inline" />
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // --- Swipe Handlers ---
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Prevent swipe on inputs
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    setIsSwiping(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStart(clientX);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping || touchStart === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - touchStart;
    
    // Add resistance (damping) as you swipe further
    const dampedDiff = diff / (1 + Math.abs(diff) / 400);
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
        // Edit action
        setTranslateX(0); 
        onEdit(course);
      } else {
        // Delete action
        setTranslateX(-500); // Swipe away effect
        setTimeout(() => onDelete(course.id), 200); 
      }
    } else {
      // Snap back
      setTranslateX(0);
    }
    
    setTouchStart(null);
  };

  const handleToggleComplete = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    
    // Trigger animation
    setIsAnimating(true);
    
    // Perform update
    onUpdate({ ...course, completed: isChecked });

    // Stop animation after a short delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  const handleTopicsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...course, topics: e.target.value });
  };

  let bgClass = "bg-slate-900/60 border-white/10";
  if (isCompleted) bgClass = "bg-emerald-950/40 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]";

  const progress = Math.min(Math.abs(translateX) / swipeThreshold, 1); 
  const scale = Math.max(0.98, 1 - progress * 0.02); 
  const iconScale = Math.min(0.8 + progress * 0.4, 1.2); 
  const iconOpacity = Math.min(progress, 1);

  return (
    <div className={`relative mb-4 select-none group transition-transform duration-300 ${isAnimating ? 'scale-[1.02]' : 'scale-100'}`}>
      
      {/* Background Actions Layer */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div 
            className="absolute inset-y-0 left-0 w-full bg-blue-600/90 flex items-center pl-8 transition-opacity duration-200"
            style={{ opacity: translateX > 0 ? 1 : 0 }}
        >
           <div style={{ transform: `scale(${iconScale})`, opacity: iconOpacity }} className="flex items-center gap-3 text-white font-bold transition-transform duration-100 will-change-transform">
               <Edit2 size={28} />
               <span className="text-lg tracking-wider">MODIFICA</span>
           </div>
        </div>

        <div 
            className="absolute inset-y-0 right-0 w-full bg-red-600/90 flex items-center justify-end pr-8 transition-opacity duration-200"
            style={{ opacity: translateX < 0 ? 1 : 0 }}
        >
           <div style={{ transform: `scale(${iconScale})`, opacity: iconOpacity }} className="flex items-center gap-3 text-white font-bold transition-transform duration-100 will-change-transform">
               <span className="text-lg tracking-wider">ELIMINA</span>
               <Trash2 size={28} />
           </div>
        </div>
      </div>

      {/* Main Card Layer */}
      <div 
        className={`relative z-10 backdrop-blur-md border rounded-2xl shadow-lg ${bgClass} overflow-hidden touch-pan-y`}
        style={{ 
          transform: `translateX(${translateX}px) scale(${scale})`,
          // Snappier elastic return logic
          transition: isSwiping ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.3s, border-color 0.3s', 
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
        
        {/* Left Color Strip */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1.5 z-20" 
          style={{ backgroundColor: isCompleted ? '#10b981' : instituteColor }} 
        />

        <div className="p-5 pl-6">
          
          {/* TOP ROW: Modality (Left) | Time of Day (Right) */}
          <div className="flex justify-between items-start mb-2">
             {/* Top Left: Aula/Dad */}
             <div className="flex flex-col items-start gap-1">
                {isDad ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-extrabold text-blue-300 uppercase tracking-widest shadow-sm">
                     <Laptop size={10} /> Online
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest shadow-sm">
                     <MapPin size={10} /> Aula
                  </div>
                )}
             </div>

             {/* Top Right: Mattina/Pomeriggio */}
             <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-extrabold uppercase tracking-widest shadow-sm ${
                isMorning 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
             }`}>
                {isMorning ? <Sun size={10} /> : <Moon size={10} />}
                {timeOfDayLabel}
             </div>
          </div>

          {/* MIDDLE ROW: Name (Big Left) | Time (Right) */}
          <div className="flex items-end justify-between gap-4 mb-4">
             <div className="flex-1 min-w-0">
                <h3 className={`text-2xl sm:text-3xl font-black leading-tight tracking-tight truncate pr-2 ${
                    isCompleted 
                    ? 'text-slate-500 line-through decoration-emerald-500/50 decoration-2' 
                    : 'bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent'
                }`}>
                  {course.name}
                </h3>
                
                {/* Institute / Code Subtitle */}
                <div className="flex items-center gap-2 mt-1">
                    {institute && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Building2 size={12} style={{ color: instituteColor }}/>
                            <span className="uppercase tracking-wide opacity-80">{institute.name}</span>
                        </div>
                    )}
                    {course.code && (
                        <span className="text-[10px] font-mono text-slate-600 border border-slate-700 px-1 rounded">
                            {course.code}
                        </span>
                    )}
                </div>
             </div>

             <div className={`text-right shrink-0 flex flex-col items-end ${isCompleted ? 'opacity-50' : 'opacity-100'}`}>
                <div className="flex items-center gap-1.5 text-lg font-bold font-mono text-slate-200">
                   {course.startTime} 
                </div>
                <div className="text-xs text-slate-500 font-medium">
                   {course.endTime}
                </div>
             </div>
          </div>

          {/* BOTTOM ROW: Topics Preview */}
          <div className="flex items-end justify-between">
             <div className="flex-1">
                {hasTopics && !isExpanded && (
                    <div className="mt-1 relative pl-3 border-l-2 border-slate-700/50">
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            <span className="text-slate-500 font-bold mr-1 uppercase text-[10px] tracking-wide">Argomenti fatti:</span>
                            {course.topics}
                        </p>
                    </div>
                )}
             </div>

             {/* Expand Arrow */}
             <div className="pl-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="text-slate-600 hover:text-white transition p-1.5 rounded-full hover:bg-white/5"
                >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
             </div>
          </div>

        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-white/5 bg-black/20 p-4 animate-in slide-in-from-top-2 space-y-4">
            
            {/* Action Row */}
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                        <input 
                        type="checkbox" 
                        id={`check-${course.id}`}
                        className="peer appearance-none h-6 w-6 border-2 border-white/20 rounded-md checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                        checked={isCompleted}
                        onChange={handleToggleComplete}
                        />
                        <CheckCircle2 size={16} className={`absolute text-white pointer-events-none transition-all duration-300 ${isCompleted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
                    </div>
                    <label htmlFor={`check-${course.id}`} className={`text-sm font-bold cursor-pointer select-none transition-colors ${isCompleted ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {isCompleted ? 'Lezione Completata' : 'Segna come fatta'}
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

            {/* Argomenti Section - View/Edit Mode */}
            <div className="space-y-2">
               <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-slate-300">
                      <StickyNote size={16} className="text-purple-400"/>
                      <span className="text-xs font-bold uppercase tracking-wider">Argomenti fatti</span>
                  </div>
                  {hasTopics && !isEditingTopics && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsEditingTopics(true); }}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5 transition"
                      >
                         <Edit2 size={12} /> Modifica
                      </button>
                  )}
               </div>
               
               {isEditingTopics || !hasTopics ? (
                 <div className="relative group animate-in fade-in">
                    <textarea
                      autoFocus={hasTopics}
                      className="w-full bg-slate-900/80 border border-white/10 group-hover:border-purple-500/30 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all shadow-inner custom-scrollbar"
                      rows={4}
                      placeholder="Cosa hai spiegato oggi? (Inserisci URL per creare link)"
                      value={course.topics || ''}
                      onChange={handleTopicsChange}
                      onMouseDown={(e) => e.stopPropagation()} 
                      onTouchStart={(e) => e.stopPropagation()} 
                    />
                    {hasTopics && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditingTopics(false); }}
                            className="absolute bottom-3 right-3 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1 transition"
                        >
                            <Save size={12} /> Fine
                        </button>
                    )}
                 </div>
               ) : (
                 <div 
                   onClick={(e) => { e.stopPropagation(); setIsEditingTopics(true); }}
                   className="w-full bg-slate-900/40 border border-white/5 rounded-xl p-4 text-sm text-slate-300 whitespace-pre-wrap break-words min-h-[80px] cursor-pointer hover:bg-slate-900/60 hover:border-white/10 transition-all shadow-sm"
                   title="Clicca per modificare"
                 >
                    {renderTextWithLinks(course.topics || '')}
                 </div>
               )}
            </div>
            
            <div className="flex justify-center pt-2">
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                 className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition px-4 py-2 hover:bg-white/5 rounded-lg"
               >
                 <ChevronUp size={14} /> Chiudi dettagli
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CourseCard;
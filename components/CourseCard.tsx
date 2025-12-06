import React, { useState, useEffect, useRef } from 'react';
import { Course, Institute } from '../types';
import { MapPin, Laptop, Edit2, Trash2, Building2, CheckCircle2, ChevronDown, ChevronUp, StickyNote, ExternalLink, Save, Sun, Moon, Mic, MicOff } from 'lucide-react';

interface CourseCardProps {
  course: Course;
  institute?: Institute;
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
  onUpdate: (course: Course) => void;
}

// Type definition for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const CourseCard: React.FC<CourseCardProps> = ({ course, institute, onEdit, onDelete, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  
  // Local state for topics to prevent keyboard closing on every keystroke
  const [localTopics, setLocalTopics] = useState(course.topics || '');
  
  // Voice Dictation State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const isDad = course.modality === 'DAD';
  const isCompleted = course.completed || false;
  // FORCE BOOLEAN
  const hasTopics = !!(course.topics && course.topics.trim().length > 0);
  
  const instituteColor = institute?.color || '#94a3b8'; // Default slate-400

  // Time of Day Logic
  const startHour = parseInt(course.startTime.split(':')[0], 10);
  const isMorning = startHour < 14;
  const timeOfDayLabel = isMorning ? 'MATTINA' : 'POMERIGGIO';

  const swipeThreshold = 80;

  // Sync local state when course updates from outside (unless we are editing)
  useEffect(() => {
    if (!isEditingTopics) {
      setLocalTopics(course.topics || '');
    }
  }, [course.topics, isEditingTopics]);

  // --- Voice Dictation Logic ---
  const toggleListening = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Il tuo browser non supporta la dettatura vocale.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLocalTopics((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Errore riconoscimento vocale:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };


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
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    setIsSwiping(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setTouchStart(clientX);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSwiping || touchStart === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - touchStart;
    const dampedDiff = diff / (1 + Math.abs(diff) / 600);
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
        setTimeout(() => onDelete(course.id), 50); 
      }
    } else {
      setTranslateX(0);
    }
    setTouchStart(null);
  };

  const handleToggleComplete = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsAnimating(true);
    onUpdate({ ...course, completed: isChecked });
    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  // Save changes from local state to global state
  const saveTopics = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdate({ ...course, topics: localTopics });
    setIsEditingTopics(false);
  };

  let bgClass = "bg-slate-900/60 border-white/10";
  if (isCompleted) bgClass = "bg-emerald-950/40 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]";

  const progress = Math.min(Math.abs(translateX) / swipeThreshold, 1); 
  const scale = Math.max(0.98, 1 - progress * 0.02); 
  const iconScale = Math.min(0.8 + progress * 0.4, 1.2); 
  const iconOpacity = Math.min(progress, 1);

  return (
    <div className={`relative mb-2 select-none group transition-transform duration-300 ${isAnimating ? 'scale-[1.02]' : 'scale-100'}`}>
      
      {/* Background Actions Layer */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div 
            className="absolute inset-y-0 left-0 w-full bg-blue-600/90 flex items-center pl-8 transition-opacity duration-200"
            style={{ opacity: translateX > 0 ? iconOpacity : 0 }}
        >
           <div style={{ transform: `scale(${iconScale})` }} className="flex items-center gap-3 text-white font-bold transition-transform duration-100 will-change-transform">
               <Edit2 size={28} />
               <span className="text-lg tracking-wider">MODIFICA</span>
           </div>
        </div>

        <div 
            className="absolute inset-y-0 right-0 w-full bg-red-600/90 flex items-center justify-end pr-8 transition-opacity duration-200"
            style={{ opacity: translateX < 0 ? iconOpacity : 0 }}
        >
           <div style={{ transform: `scale(${iconScale})` }} className="flex items-center gap-3 text-white font-bold transition-transform duration-100 will-change-transform">
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

        {/* Compact Padding */}
        <div className="p-3 pl-5">
          
          {/* TOP ROW: Modality (Left) | Time of Day (Right) */}
          <div className="flex justify-between items-start mb-1">
             <div className="flex items-center gap-2">
                 {isDad ? (
                  <span className="text-[10px] font-extrabold text-blue-300 uppercase tracking-widest flex items-center gap-1">
                     <Laptop size={10} /> DAD
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest flex items-center gap-1">
                     <MapPin size={10} /> PRESENZA
                  </span>
                )}
                
                {institute && (
                    <div className="flex items-center gap-1">
                        <span className="text-slate-600">|</span>
                        <Building2 size={10} style={{ color: instituteColor }}/>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{institute.name}</span>
                    </div>
                )}
             </div>

             {/* UPDATED: Morning = Yellow/Amber, Afternoon = Violet/Purple */}
             <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 px-1.5 py-0.5 rounded ${
                 isMorning 
                    ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20' 
                    : 'text-violet-300 bg-violet-500/10 border border-violet-500/20'
             }`}>
                {isMorning ? <Sun size={10} /> : <Moon size={10} />}
                {timeOfDayLabel}
             </div>
          </div>

          {/* MIDDLE ROW: Name (Big Left) | Time (Right) */}
          <div className="flex items-center justify-between gap-3">
             <div className="flex-1 min-w-0">
                <h3 className={`text-3xl sm:text-4xl font-black leading-none tracking-tight truncate pr-1 -ml-0.5 ${
                    isCompleted 
                    ? 'text-slate-500 line-through decoration-emerald-500/50 decoration-2' 
                    : 'bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent'
                }`}>
                  {course.name}
                </h3>
             </div>

             <div className={`text-right shrink-0 leading-none ${isCompleted ? 'opacity-50' : 'opacity-100'}`}>
                <div className="text-lg font-bold font-mono text-slate-200">
                   {course.startTime} 
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                   {course.endTime}
                </div>
             </div>
          </div>

          {/* BOTTOM ROW: Topics Preview or Code */}
          <div className="flex items-center justify-between mt-1">
             <div className="flex-1 overflow-hidden h-4">
                {hasTopics ? (
                     <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                         <StickyNote size={10} className="text-purple-400"/>
                         {course.topics}
                     </p>
                ) : (
                    course.code ? (
                         <span className="text-[10px] font-mono text-slate-600 border border-slate-700 px-1 rounded inline-block">
                            {course.code}
                         </span>
                    ) : null
                )}
             </div>

             {/* Expand Arrow */}
             <div className="pl-2 -mt-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="text-slate-600 hover:text-white transition p-1 rounded-full hover:bg-white/5"
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                    <div className="relative">
                        <textarea
                          autoFocus={hasTopics}
                          className="w-full bg-slate-900/80 border border-white/10 group-hover:border-purple-500/30 rounded-xl p-3 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all shadow-inner custom-scrollbar"
                          rows={4}
                          placeholder="Cosa hai spiegato oggi? Scrivilo qui o usa il microfono."
                          value={localTopics}
                          onChange={(e) => setLocalTopics(e.target.value)}
                          onMouseDown={(e) => e.stopPropagation()} 
                          onTouchStart={(e) => e.stopPropagation()} 
                        />
                        
                        {/* Mic Button */}
                        <button 
                            onClick={toggleListening}
                            className={`absolute top-2 right-2 p-2 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
                            title="Dettatura vocale"
                        >
                            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                    </div>

                    <div className="flex justify-end mt-2">
                        <button 
                            onClick={saveTopics}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1 transition"
                        >
                            <Save size={12} /> Salva Note
                        </button>
                    </div>
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
import React from 'react';
import { Course } from '../types';
import { Bell, X, CalendarCheck } from 'lucide-react';

interface NotificationModalProps {
  courses: Course[];
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ courses, onClose }) => {
  if (courses.length === 0) return null;

  // Format the date from the first course
  const tomorrowDate = new Date(courses[0].date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-br from-slate-900 to-purple-900/50 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
        
        <div className="p-5 flex items-start gap-4">
          <div className="bg-purple-500/20 p-3 rounded-full shrink-0">
             <Bell className="text-purple-300" size={24} />
          </div>
          <div className="flex-1">
             <h3 className="text-lg font-bold text-white mb-1">Promemoria Lezioni</h3>
             <p className="text-slate-300 text-sm mb-4">
               Domani, <span className="text-purple-300 font-medium capitalize">{tomorrowDate}</span>, hai {courses.length} corsi in programma:
             </p>
             
             <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
               {courses.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(course => (
                 <div key={course.id} className="bg-white/10 rounded-lg p-3 border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white text-sm">{course.name}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="font-mono bg-slate-800 px-1 rounded">{course.startTime}</span>
                        {course.modality === 'DAD' ? 'Online' : 'In Sede'}
                      </p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-200 transition"
          >
            Ho capito, grazie
          </button>
        </div>

      </div>
    </div>
  );
};

export default NotificationModal;

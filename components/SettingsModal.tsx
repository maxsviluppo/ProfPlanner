import React, { useState } from 'react';
import { Institute } from '../types';
import { X, Bell, BellOff, Building2, Plus, Trash2, Settings, Check, Palette, Euro, Clock, BookOpen } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  institutes: Institute[];
  onAddInstitute: (name: string, color: string, rate?: number, rateType?: 'HOURLY' | 'PER_LESSON') => void;
  onUpdateInstitute: (institute: Institute) => void;
  onDeleteInstitute: (id: string) => void;
}

const PRESET_COLORS = [
  '#38bdf8', // Sky Blue
  '#f472b6', // Pink
  '#a78bfa', // Purple
  '#34d399', // Emerald
  '#fbbf24', // Amber
  '#f87171', // Red
  '#a3e635', // Lime
  '#22d3ee', // Cyan
  '#ffffff', // White
];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  notificationsEnabled,
  onToggleNotifications,
  institutes,
  onAddInstitute,
  onUpdateInstitute,
  onDeleteInstitute
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'institutes'>('general');
  
  // Institute Form State
  const [newInstName, setNewInstName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [rate, setRate] = useState<string>('');
  const [rateType, setRateType] = useState<'HOURLY' | 'PER_LESSON'>('HOURLY');
  
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveInstitute = () => {
    if (!newInstName.trim()) return;

    const numRate = rate ? parseFloat(rate) : 0;

    if (editingId) {
      // Update existing
      const inst = institutes.find(i => i.id === editingId);
      if (inst) {
        onUpdateInstitute({ 
          ...inst, 
          name: newInstName, 
          color: selectedColor,
          defaultRate: numRate,
          rateType: rateType
        });
      }
      resetForm();
    } else {
      // Create new
      onAddInstitute(newInstName, selectedColor, numRate, rateType);
      resetForm();
    }
  };

  const startEdit = (inst: Institute) => {
    setEditingId(inst.id);
    setNewInstName(inst.name);
    setSelectedColor(inst.color);
    setRate(inst.defaultRate ? inst.defaultRate.toString() : '');
    setRateType(inst.rateType || 'HOURLY');
  };

  const resetForm = () => {
    setEditingId(null);
    setNewInstName('');
    setSelectedColor(PRESET_COLORS[0]);
    setRate('');
    setRateType('HOURLY');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="text-slate-400" size={20} />
            Impostazioni
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'general' 
                ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            Generale
          </button>
          <button
            onClick={() => setActiveTab('institutes')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              activeTab === 'institutes' 
                ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            Istituti & Tariffe
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-900">
          
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${notificationsEnabled ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700/50 text-slate-400'}`}>
                      {notificationsEnabled ? <Bell size={24} /> : <BellOff size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Notifiche Lezioni</h3>
                      <p className="text-xs text-slate-400">Ricevi un avviso 15 minuti prima dell'inizio.</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={onToggleNotifications}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      notificationsEnabled ? 'bg-purple-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500 italic">
                  Nota: Le notifiche funzionano solo se il browser è aperto (anche in background).
                </p>
              </div>
              
              <div className="text-center text-xs text-slate-600 mt-8">
                Versione App: 1.2.0 • ProfPlanner AI
              </div>
            </div>
          )}

          {/* TAB: INSTITUTES */}
          {activeTab === 'institutes' && (
            <div className="space-y-6">
              
              {/* Add/Edit Form */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-4">
                 <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                   {editingId ? <Settings size={16} /> : <Plus size={16} />}
                   {editingId ? 'Modifica Istituto' : 'Configura Nuovo Istituto'}
                 </h3>
                 
                 {/* Nome e Colore */}
                 <div className="space-y-3">
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                      placeholder="Nome Istituto (es. Enaip, IAL...)"
                      value={newInstName}
                      onChange={(e) => setNewInstName(e.target.value)}
                    />
                    
                    <div>
                      <label className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                        <Palette size={12} /> Colore Neon
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedColor === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                 </div>

                 {/* Dati Finanziari */}
                 <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div className="space-y-1">
                       <label className="text-[10px] text-slate-400 uppercase">Tariffa (€)</label>
                       <div className="relative">
                          <input
                             type="number"
                             className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-2 py-2 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                             placeholder="0.00"
                             value={rate}
                             onChange={(e) => setRate(e.target.value)}
                          />
                          <Euro size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] text-slate-400 uppercase">Tipo calcolo</label>
                       <div className="flex bg-slate-900 rounded-lg p-1 border border-white/10">
                          <button 
                             type="button"
                             onClick={() => setRateType('HOURLY')}
                             className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition ${rateType === 'HOURLY' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                             title="Tariffa Oraria"
                          >
                             <Clock size={14} />
                          </button>
                          <button 
                             type="button"
                             onClick={() => setRateType('PER_LESSON')}
                             className={`flex-1 flex items-center justify-center py-1 rounded text-xs transition ${rateType === 'PER_LESSON' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                             title="A Lezione"
                          >
                             <BookOpen size={14} />
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-2 mt-2">
                      {editingId && (
                         <button 
                           onClick={resetForm}
                           className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold rounded-lg transition"
                         >
                           Annulla
                         </button>
                      )}
                      <button 
                        onClick={handleSaveInstitute}
                        disabled={!newInstName.trim()}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-900/20"
                      >
                        {editingId ? 'Aggiorna' : 'Salva'}
                      </button>
                  </div>
              </div>

              {/* List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Istituti Configurati ({institutes.length})</h3>
                
                {institutes.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">Nessun istituto configurato.</p>
                )}

                {institutes.map(inst => (
                  <div 
                    key={inst.id}
                    className="relative group bg-slate-900 border rounded-xl p-3 flex justify-between items-center transition-all hover:bg-slate-900/80"
                    style={{ 
                      borderColor: inst.color,
                      boxShadow: `0 0 5px ${inst.color}10`,
                    }}
                  >
                     <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-10 rounded-full shadow-[0_0_8px_currentColor]" 
                          style={{ backgroundColor: inst.color, color: inst.color }}
                        />
                        <div>
                           <span 
                              className="font-bold text-base block"
                              style={{ color: inst.color }}
                           >
                              {inst.name}
                           </span>
                           {inst.defaultRate && inst.defaultRate > 0 && (
                              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                                 € {inst.defaultRate} <span className="text-slate-500">/ {inst.rateType === 'HOURLY' ? 'ora' : 'lez'}</span>
                              </span>
                           )}
                        </div>
                     </div>
                     
                     <div className="flex gap-2">
                       <button 
                         onClick={() => startEdit(inst)}
                         className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                       >
                         <Settings size={16} />
                       </button>
                       <button 
                         onClick={() => onDeleteInstitute(inst.id)}
                         className="p-2 text-red-400 hover:text-white bg-slate-800 hover:bg-red-500/80 rounded-lg transition"
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
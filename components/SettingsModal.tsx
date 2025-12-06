import React, { useState } from 'react';
import { Institute } from '../types';
import { X, Bell, BellOff, Building2, Plus, Trash2, Settings, Check, Palette } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  institutes: Institute[];
  onAddInstitute: (name: string, color: string) => void;
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
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveInstitute = () => {
    if (!newInstName.trim()) return;

    if (editingId) {
      // Update existing
      const inst = institutes.find(i => i.id === editingId);
      if (inst) {
        onUpdateInstitute({ ...inst, name: newInstName, color: selectedColor });
      }
      setEditingId(null);
    } else {
      // Create new
      onAddInstitute(newInstName, selectedColor);
    }
    setNewInstName('');
    setSelectedColor(PRESET_COLORS[0]);
  };

  const startEdit = (inst: Institute) => {
    setEditingId(inst.id);
    setNewInstName(inst.name);
    setSelectedColor(inst.color);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewInstName('');
    setSelectedColor(PRESET_COLORS[0]);
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
            Istituti & Scuole
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
                Versione App: 1.1.0 • ProfPlanner AI
              </div>
            </div>
          )}

          {/* TAB: INSTITUTES */}
          {activeTab === 'institutes' && (
            <div className="space-y-6">
              
              {/* Add/Edit Form */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-3">
                 <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                   {editingId ? <Settings size={16} /> : <Plus size={16} />}
                   {editingId ? 'Modifica Istituto' : 'Aggiungi Nuovo Istituto'}
                 </h3>
                 
                 <div className="flex flex-col gap-3">
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

                    <div className="flex gap-2 mt-1">
                      {editingId && (
                         <button 
                           onClick={cancelEdit}
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
                        {editingId ? 'Aggiorna' : 'Aggiungi'}
                      </button>
                    </div>
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
                      boxShadow: `0 0 8px ${inst.color}20`, // Subtle neon glow by default
                    }}
                  >
                     <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-8 rounded-full shadow-[0_0_8px_currentColor]" 
                          style={{ backgroundColor: inst.color, color: inst.color }}
                        />
                        <span 
                          className="font-bold text-lg tracking-wide"
                          style={{ 
                            color: inst.color,
                            textShadow: `0 0 15px ${inst.color}60` // Text neon effect
                          }}
                        >
                          {inst.name}
                        </span>
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
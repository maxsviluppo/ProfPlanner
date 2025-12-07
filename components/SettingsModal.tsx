import React, { useState } from 'react';
import { Institute } from '../types';
import { X, Bell, BellOff, Plus, Trash2, Settings, Euro, Clock, Edit2, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  institutes: Institute[];
  onAddInstitute: (name: string, color: string, rate?: number, rateType?: 'HOURLY' | 'PER_LESSON') => void;
  onUpdateInstitute: (institute: Institute) => void;
  onDeleteInstitute: (id: string) => void;
  onResetAll: (keepInstitutes?: boolean) => void; 
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
  onDeleteInstitute,
  onResetAll
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

  const confirmReset = () => {
      // Step 1: Explicitly confirm deleting LESSONS (Base action)
      if (!window.confirm("SEI SICURO?\n\nStai per eliminare tutte le lezioni dal diario.\nQuesta operazione è irreversibile.\n\nPremi OK per procedere.")) {
        return; // User cancelled, do nothing.
      }

      // Step 2: Check for institutes
      if (institutes.length > 0) {
          const deleteInstitutes = window.confirm(
              `Hai ${institutes.length} scuole salvate.\n\n` +
              "Vuoi eliminare anche le SCUOLE?\n\n" +
              "OK = Elimina Scuole e Lezioni (Reset Totale)\n" +
              "ANNULLA = Mantieni Scuole (elimina solo lezioni)"
          );
          
          // deleteInstitutes = true (OK) -> Reset All (keep=false)
          // deleteInstitutes = false (Cancel) -> Keep Institutes (keep=true)
          onResetAll(!deleteInstitutes); 
      } else {
          // Standard reset (no institutes to worry about)
          onResetAll(false);
      }
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
            className={`flex-1 py-3 text-sm font-medium transition relative ${activeTab === 'general' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Generali
            {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500" />}
          </button>
          <button 
            onClick={() => setActiveTab('institutes')}
            className={`flex-1 py-3 text-sm font-medium transition relative ${activeTab === 'institutes' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Istituti & Tariffe
            {activeTab === 'institutes' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar pb-10">
          
          {activeTab === 'general' ? (
             <div className="space-y-6">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                   <div className="flex gap-3 items-center">
                      <div className={`p-3 rounded-full ${notificationsEnabled ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700/50 text-slate-500'}`}>
                         {notificationsEnabled ? <Bell size={24} /> : <BellOff size={24} />}
                      </div>
                      <div>
                         <h3 className="font-bold text-white">Notifiche Browser</h3>
                         <p className="text-xs text-slate-400">Ricevi un avviso per le lezioni del giorno dopo.</p>
                      </div>
                   </div>
                   <button 
                     onClick={onToggleNotifications}
                     className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}
                   >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
                   </button>
                </div>
                
                {/* Danger Zone */}
                <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-red-400 mb-1">
                        <AlertTriangle size={18} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Zona Pericolo</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                        Elimina permanentemente le lezioni e i dati salvati.
                    </p>
                    <button 
                        type="button"
                        onClick={confirmReset}
                        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Trash2 size={16} />
                        Elimina tutto e Resetta
                    </button>
                </div>

                <div className="text-center p-4">
                  <p className="text-xs text-slate-500">Versione 1.0.1 • ProfPlanner</p>
                </div>
             </div>
          ) : (
             <div className="space-y-6">
                
                {/* Form */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-4">
                   <h3 className="text-sm font-bold text-white flex items-center gap-2">
                     {editingId ? <Edit2 size={16} className="text-purple-400" /> : <Plus size={16} className="text-emerald-400" />}
                     {editingId ? 'Modifica Istituto' : 'Nuovo Istituto'}
                   </h3>
                   
                   <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Nome Istituto</label>
                        <input 
                           type="text" 
                           className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                           placeholder="Es. Liceo Rossi, Università..."
                           value={newInstName}
                           onChange={e => setNewInstName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block">Colore Etichetta</label>
                        <div className="flex flex-wrap gap-2">
                           {PRESET_COLORS.map(c => (
                             <button
                               key={c}
                               onClick={() => setSelectedColor(c)}
                               className={`w-6 h-6 rounded-full border-2 transition ${selectedColor === c ? 'border-white scale-110' : 'border-transparent hover:border-white/50'}`}
                               style={{ backgroundColor: c }}
                             />
                           ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block flex items-center gap-1"><Euro size={10} /> Tariffa (€)</label>
                            <input 
                               type="number" 
                               className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                               placeholder="0.00"
                               value={rate}
                               onChange={e => setRate(e.target.value)}
                            />
                         </div>
                         <div>
                            <label className="text-[10px] uppercase text-slate-500 font-bold mb-1 block flex items-center gap-1"><Clock size={10} /> Tipo</label>
                            <select 
                               className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                               value={rateType}
                               onChange={(e) => setRateType(e.target.value as any)}
                            >
                               <option value="HOURLY">Oraria (€/h)</option>
                               <option value="PER_LESSON">A Lezione (€/lez)</option>
                            </select>
                         </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                         {editingId && (
                           <button 
                             onClick={resetForm}
                             className="flex-1 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition text-sm"
                           >
                             Annulla
                           </button>
                         )}
                         <button 
                           onClick={handleSaveInstitute}
                           disabled={!newInstName.trim()}
                           className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-sm hover:from-purple-500 hover:to-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {editingId ? 'Salva Modifiche' : 'Aggiungi Istituto'}
                         </button>
                      </div>
                   </div>
                </div>

                {/* List */}
                <div className="space-y-2">
                   <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Istituti Salvati</h3>
                   {institutes.length === 0 ? (
                     <p className="text-center text-slate-600 py-4 text-sm">Nessun istituto salvato.</p>
                   ) : (
                     <div className="space-y-2">
                        {institutes.map(inst => (
                          <div key={inst.id} className="bg-slate-800/30 border border-white/5 p-3 rounded-lg flex items-center justify-between group">
                             <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: inst.color }} />
                                <div>
                                   <p className="text-sm font-bold text-white">{inst.name}</p>
                                   <p className="text-xs text-slate-500">
                                     {inst.defaultRate ? `€${inst.defaultRate} ${inst.rateType === 'HOURLY' ? '/ ora' : '/ lez.'}` : 'Nessuna tariffa'}
                                   </p>
                                </div>
                             </div>
                             <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => startEdit(inst)}
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                                >
                                   <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => onDeleteInstitute(inst.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                >
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                   )}
                </div>

             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition text-sm"
           >
             Chiudi
           </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
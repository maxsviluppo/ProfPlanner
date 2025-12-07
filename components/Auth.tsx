import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, LogIn, UserPlus, Key, Eye, EyeOff, Send, ArrowLeft, Loader2, Briefcase } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Errore durante il login" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: "Registrazione avvenuta! Controlla la tua email per confermare." });
      setView('LOGIN');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Errore durante la registrazione" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage({ type: 'success', text: "Link di ripristino inviato alla tua email." });
      setView('LOGIN');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || "Errore durante il reset" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a]">
        
        {/* BACKGROUND GRADIENTS */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-96 bg-purple-900/20 blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-full h-96 bg-blue-900/20 blur-[100px]" />
        </div>

        <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">
            
            {/* Header Brand */}
            <div className="p-8 text-center border-b border-white/5 bg-white/5">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/30 mx-auto mb-4">
                   <Briefcase className="text-white" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">ProfPlanner AI</h1>
                <p className="text-slate-400 text-sm">Il diario digitale intelligente per docenti.</p>
            </div>

            <div className="p-8">
                {/* Title Switcher */}
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    {view === 'LOGIN' && <><LogIn className="text-purple-400" size={20}/> Accedi al tuo account</>}
                    {view === 'REGISTER' && <><UserPlus className="text-emerald-400" size={20}/> Crea un nuovo account</>}
                    {view === 'RESET' && <><Key className="text-amber-400" size={20}/> Recupera Password</>}
                </h2>

                <form onSubmit={view === 'LOGIN' ? handleLogin : view === 'REGISTER' ? handleRegister : handleResetPassword} className="space-y-4">
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                            <input 
                                type="email" 
                                required
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                placeholder="nome@esempio.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {view !== 'RESET' && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-500 hover:text-white transition"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {view === 'LOGIN' && (
                                <div className="flex justify-end pt-1">
                                    <button 
                                        type="button" 
                                        onClick={() => setView('RESET')}
                                        className="text-xs text-purple-400 hover:text-purple-300 hover:underline"
                                    >
                                        Password dimenticata?
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {message && (
                        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                            message.type === 'error' ? 'bg-red-500/10 text-red-200 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                        }`}>
                           {message.text}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                {view === 'LOGIN' && "Entra"}
                                {view === 'REGISTER' && "Registrati"}
                                {view === 'RESET' && "Invia Link Reset"}
                            </>
                        )}
                    </button>
                </form>

                {/* Footer Switcher */}
                <div className="mt-6 pt-6 border-t border-white/5 text-center">
                    {view === 'LOGIN' ? (
                        <p className="text-slate-400 text-sm">
                            Non hai un account?{' '}
                            <button onClick={() => setView('REGISTER')} className="text-white font-bold hover:underline">
                                Registrati ora
                            </button>
                        </p>
                    ) : view === 'REGISTER' ? (
                        <p className="text-slate-400 text-sm">
                            Hai già un account?{' '}
                            <button onClick={() => setView('LOGIN')} className="text-white font-bold hover:underline">
                                Accedi
                            </button>
                        </p>
                    ) : (
                        <button onClick={() => setView('LOGIN')} className="text-slate-400 hover:text-white text-sm flex items-center justify-center gap-1 mx-auto hover:underline">
                            <ArrowLeft size={14} /> Torna al Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
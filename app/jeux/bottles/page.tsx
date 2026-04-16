"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BottlesPage() {
  const [message, setMessage] = useState("");
  const [myTitles, setMyTitles] = useState<any[]>([]); 
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function getMyTitles() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('titre')
          .select('id, nom_artiste, nom_titre')
          .eq('user_id', user.id);
        setMyTitles(data || []);
      }
    }
    getMyTitles();
  }, []);

  const lancerLaBouteille = async () => {
    if (!selectedTitleId || !message) return alert("Le message est vide ou aucun titre choisi.");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return alert("Tu dois être connecté pour lancer une bouteille.");
    }

    const { error } = await supabase.from('bottles').insert([
      {
        user_id: user.id,
        titre_id: selectedTitleId,
        message: message.trim(),
        target_user_id: null,
        is_caught: false,
      }
    ]);

    if (error) {
      alert("Impossible d'envoyer ta bouteille pour le moment.");
    } else {
      alert("Bouteille enregistrée. Elle partira avec le prochain courant.");
      setMessage("");
      setSelectedTitleId("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050b14] p-4 font-sans relative overflow-hidden">
      
      {/* Effet de lumière diffuse en fond (Océan) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-emerald-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.1)] relative z-10">
        
        <div className="text-center mb-10">
          <span className="text-emerald-400 text-4xl mb-4 block">🍾</span>
          <h1 className="text-3xl font-light tracking-widest text-emerald-50 text-center uppercase">
            Signal <span className="text-emerald-400 font-bold">Abyssal</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 italic">Envoyez une pensée à un autre plongeur au hasard.</p>
        </div>

        <div className="space-y-6">
          {/* Sélection du titre */}
          <div>
            <label className="text-emerald-200/60 text-xs uppercase tracking-widest mb-2 block ml-1">Choix de la pépite</label>
            <select 
              className="w-full bg-slate-800/50 border border-slate-700 text-emerald-50 p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
              onChange={(e) => setSelectedTitleId(e.target.value)}
              value={selectedTitleId}
            >
              <option value="" className="bg-slate-900 text-slate-400">-- Sélectionner un son --</option>
              {myTitles.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900">{t.nom_artiste} - {t.nom_titre}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="text-emerald-200/60 text-xs uppercase tracking-widest mb-2 block ml-1">Message de la mer</label>
            <textarea 
              className="w-full bg-slate-800/50 border border-slate-700 text-emerald-50 p-4 h-32 rounded-xl focus:outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600 resize-none"
              placeholder="Écrivez quelque chose de mystérieux..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={140}
            />
            <div className="text-right text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
              {message.length} / 140 caractères
            </div>
          </div>

          {/* Bouton d'envoi */}
          <button 
            onClick={lancerLaBouteille}
            disabled={loading}
            className="w-full group relative overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 disabled:opacity-50"
          >
            <span className="relative z-10 uppercase tracking-widest">
              {loading ? "Immersion en cours..." : "Lancer le Signal"}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-8 uppercase tracking-[0.2em]">
          Sonar Protocol v1.0 — La Rochelle
        </p>
      </div>
    </div>
  );
}
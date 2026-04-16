'use client';

import { useEffect, useState, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getCoffreActif, tenterCode, laisserMot, getIndices } from '@/lib/coffrefort';
import { supabase } from '@/lib/supabase';

interface CoffreData {
  id: string;
  recompense_titre: string;
  recompense_description: string | null;
  recompense_points: number;
  status: string;
  essais_max: number;
  essais_restants: number;
  pourcentage_vie: number;
  created_at: string;
  expires_at: string | null;
  first_opener_username: string | null;
  first_opened_at: string | null;
  first_opener_message: string | null;
  second_opened_at: string | null;
  total_tentatives: number;
  nb_participants: number;
}

interface Indice {
  id: string;
  indice_text: string;
  page_location: string | null;
  hint_type: string;
  ordre: number;
}

interface TentativeResult {
  success?: boolean;
  error?: string;
  status?: string;
  message?: string;
  essais_restants?: number;
  essais_max?: number;
  pourcentage_vie?: number;
  recompense_titre?: string;
  recompense_description?: string;
  recompense_url?: string;
  points_gagnes?: number;
  mot_du_premier?: string;
  cooldown?: boolean;
}

export default function CoffreFortPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const userId = session?.user?.id;

  const [coffre, setCoffre] = useState<CoffreData | null>(null);
  const [indices, setIndices] = useState<Indice[]>([]);
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [resultat, setResultat] = useState<TentativeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showIndices, setShowIndices] = useState(false);
  const [motMessage, setMotMessage] = useState('');
  const [motEnvoye, setMotEnvoye] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        console.error('Erreur session:', error.message);
      }
      setSession(data.session ?? null);
      setAuthLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    loadCoffre();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadCoffre() {
    setLoading(true);
    const { data } = await getCoffreActif();
    setCoffre(data);
    if (data?.id) {
      const { data: indicesData } = await getIndices(data.id);
      setIndices(indicesData || []);
    }
    setLoading(false);
  }

  function handleCodeChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  }

  async function handleSubmit() {
    if (!userId || !coffre) return;
    if (coffre.status === 'opened_second' || coffre.status === 'dead' || coffre.status === 'destroyed') {
      setResultat({
        success: false,
        status: coffre.status,
        message: 'Ce coffre n\'accepte plus de tentative.',
      });
      return;
    }

    const codeStr = code.join('');
    if (codeStr.length !== 6) return;

    setSubmitting(true);
    setResultat(null);

    const { data } = await tenterCode(coffre.id, userId, codeStr);
    setResultat(data);
    await loadCoffre();

    if (!data?.success) {
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setSubmitting(false);
  }

  async function handleLaisserMot() {
    if (!userId || !coffre || !motMessage.trim()) return;
    const { data } = await laisserMot(coffre.id, userId, motMessage);
    if (data?.success) {
      setMotEnvoye(true);
    }
  }

  // Barre de vie inline
  function renderBarreDeVie() {
    if (!coffre) return null;
    const pourcentage = Math.round((coffre.essais_restants / coffre.essais_max) * 100);
    const couleur =
      pourcentage > 60 ? 'bg-green-500' :
      pourcentage > 25 ? 'bg-orange-500' :
                         'bg-red-500';

    return (
      <div className="w-full">
        <div className="flex justify-between text-sm mb-1">
          <span>❤️ Vie du coffre</span>
          <span>{coffre.essais_restants}/{coffre.essais_max}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4">
          <div
            className={`${couleur} h-4 rounded-full transition-all duration-500`}
            style={{ width: `${pourcentage}%` }}
          />
        </div>
        {pourcentage <= 10 && pourcentage > 0 && (
          <p className="text-red-400 text-xs mt-1 animate-pulse">
            ⚠️ Le coffre est sur le point d'exploser !
          </p>
        )}
        {pourcentage === 0 && (
          <p className="text-red-600 text-sm mt-2 font-bold">💥 COFFRE DÉTRUIT</p>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDU
  // ============================================================

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4" />
          <p className="text-gray-400">Chargement du coffre...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center p-8 bg-gray-900 rounded-2xl border border-gray-800 max-w-md">
          <p className="text-6xl mb-4">🔐</p>
          <h1 className="text-2xl font-bold text-white mb-2">Coffre-Fort</h1>
          <p className="text-gray-400">Connecte-toi pour tenter d'ouvrir le coffre.</p>
        </div>
      </div>
    );
  }

  if (!coffre) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center p-8 bg-gray-900 rounded-2xl border border-gray-800 max-w-md">
          <p className="text-6xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold text-white mb-2">Aucun coffre actif</h1>
          <p className="text-gray-400">Reviens bientôt, un nouveau coffre sera disponible !</p>
        </div>
      </div>
    );
  }

  if (coffre.status === 'destroyed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center p-8 bg-gray-900 rounded-2xl border border-red-900 max-w-md">
          <p className="text-6xl mb-4">💥</p>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Coffre Détruit</h1>
          <p className="text-gray-400">Trop de tentatives échouées... Le coffre a explosé.</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>👥 {coffre.nb_participants} diggers ont essayé</p>
            <p>🔢 {coffre.total_tentatives} tentatives au total</p>
          </div>
        </div>
      </div>
    );
  }

  if (coffre.status === 'opened_second' || coffre.status === 'dead') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center p-8 bg-gray-900 rounded-2xl border border-gray-800 max-w-xl w-full">
          <p className="text-6xl mb-4">🪙</p>
          <h1 className="text-2xl font-bold text-white mb-2">Coffre vide</h1>
          <p className="text-gray-400">
            {coffre.first_opener_message?.trim()
              ? 'Le premier digger a laissé un mot dans le coffre :'
              : 'Un autre digger a trouvé le coffre avant toi.'}
          </p>

          <div className="mt-4 bg-gray-800 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">📜 Message dans le coffre</p>
            <p className="text-white italic">
              {coffre.first_opener_message?.trim() || 'Une autre digger a trouvé avant toi.'}
            </p>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>👥 {coffre.nb_participants} diggers ont essayé</p>
            <p>🔢 {coffre.total_tentatives} tentatives au total</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-6xl mb-4">🔐</p>
          <h1 className="text-3xl font-bold text-white mb-2">Coffre-Fort</h1>
          <p className="text-gray-400">Trouve le code à 6 chiffres pour débloquer la récompense</p>
        </div>

        {/* Barre de vie */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          {renderBarreDeVie()}
        </div>

        {/* Récompense */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="text-sm text-gray-400 mb-1">🏆 Récompense</h2>
          <p className="text-white font-bold text-lg">{coffre.recompense_titre}</p>
          {coffre.recompense_description && (
            <p className="text-gray-400 text-sm mt-1">{coffre.recompense_description}</p>
          )}
          <p className="text-yellow-400 text-sm mt-2">💎 +{coffre.recompense_points} perles</p>
        </div>

        {/* Zone de saisie du code */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="text-sm text-gray-400 mb-4 text-center">Entre le code à 6 chiffres</h2>

          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold bg-gray-800 border-2 border-gray-700 
                           rounded-lg text-white focus:border-yellow-500 focus:outline-none 
                           transition-colors duration-200"
              />
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || code.join('').length !== 6}
            className="w-full py-3 px-6 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 
                       disabled:text-gray-500 text-white font-bold rounded-xl transition-colors 
                       duration-200 text-lg"
          >
            {submitting ? '⏳ Vérification...' : '🔓 Ouvrir le Coffre'}
          </button>
        </div>

        {/* Résultat de la tentative */}
        {resultat && (
          <div className={`rounded-2xl border p-6 mb-6 ${
            resultat.success
              ? 'bg-green-950 border-green-800'
              : resultat.status === 'destroyed'
                ? 'bg-red-950 border-red-800'
                : resultat.cooldown
                  ? 'bg-orange-950 border-orange-800'
                  : 'bg-gray-900 border-gray-800'
          }`}>
            <p className="text-lg font-bold text-white mb-2">{resultat.message}</p>

            {resultat.status === 'first_opener' && (
              <div className="mt-4 space-y-3">
                <div className="bg-green-900/50 rounded-xl p-4">
                  <p className="text-green-300 font-bold">🎵 {resultat.recompense_titre}</p>
                  {resultat.recompense_description && (
                    <p className="text-green-400 text-sm mt-1">{resultat.recompense_description}</p>
                  )}
                  {resultat.recompense_url && (
                    <a
                      href={resultat.recompense_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-yellow-400 underline text-sm"
                    >
                      🎧 Accéder à la récompense →
                    </a>
                  )}
                  <p className="text-yellow-400 text-sm mt-2">
                    💎 +{resultat.points_gagnes} perles | 🏅 Badge "Cracker de Coffre"
                  </p>
                </div>

                {!motEnvoye && (
                  <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-sm text-gray-300 mb-2">
                      ✍️ Laisse un mot pour le prochain digger qui ouvrira le coffre :
                    </p>
                    <textarea
                      value={motMessage}
                      onChange={(e) => setMotMessage(e.target.value)}
                      maxLength={500}
                      rows={3}
                      placeholder="Bien joué si tu trouves aussi..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 
                                 text-white text-sm resize-none focus:border-yellow-500 
                                 focus:outline-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{motMessage.length}/500</span>
                      <button
                        onClick={handleLaisserMot}
                        disabled={!motMessage.trim()}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 
                                   text-white text-sm font-bold rounded-lg transition-colors"
                      >
                        🔐 Refermer le coffre avec ce mot
                      </button>
                    </div>
                  </div>
                )}
                {motEnvoye && (
                  <p className="text-green-400 text-sm">✅ Ton message a été placé dans le coffre !</p>
                )}
              </div>
            )}

            {resultat.status === 'second_opener' && resultat.mot_du_premier && (
              <div className="mt-4 bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">📜 Message du premier digger :</p>
                <p className="text-white italic">"{resultat.mot_du_premier}"</p>
              </div>
            )}

            {resultat.essais_restants !== undefined && !resultat.success && (
              <p className="text-sm text-gray-400 mt-3">
                ❤️ Essais restants : {resultat.essais_restants}/{resultat.essais_max}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{coffre.nb_participants}</p>
              <p className="text-xs text-gray-400">👥 Participants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{coffre.total_tentatives}</p>
              <p className="text-xs text-gray-400">🔢 Tentatives</p>
            </div>
          </div>
        </div>

        {/* Indices */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <button
            onClick={() => setShowIndices(!showIndices)}
            className="w-full flex justify-between items-center text-white font-bold"
          >
            <span>💡 Indices ({indices.length})</span>
            <span className="text-gray-400">{showIndices ? '▲' : '▼'}</span>
          </button>

          {showIndices && (
            <div className="mt-4 space-y-3">
              {indices.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun indice disponible pour le moment...</p>
              ) : (
                indices.map((indice, i) => (
                  <div key={indice.id} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 font-bold text-sm">#{i + 1}</span>
                      <div>
                        <p className="text-white text-sm">{indice.indice_text}</p>
                        {indice.page_location && (
                          <p className="text-gray-500 text-xs mt-1">
                            📍 Caché sur : {indice.page_location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
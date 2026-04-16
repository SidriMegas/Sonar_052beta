'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getCoffreActif,
  creerCoffre,
  ajouterIndice,
  getTableauEssais,
  getIndices,
} from '@/lib/coffrefort';
import { useAdminAccess } from '@/lib/hooks/useAdminAccess';

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
  total_tentatives: number;
  nb_participants: number;
}

interface Joueur {
  coffre_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  nb_tentatives: number;
  nb_reussites: number;
  nb_echecs: number;
  premiere_tentative: string;
  derniere_tentative: string;
  duree_totale: string;
  a_trouve: boolean;
  rang: number;
}

interface Indice {
  id: string;
  indice_text: string;
  page_location: string | null;
  hint_type: string;
  ordre: number;
}

export default function AdminCoffreFortPage() {
  const { checkingAccess, isAdmin, user } = useAdminAccess();
  const userId = user?.id;

  const [coffre, setCoffre] = useState<CoffreData | null>(null);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [indicesList, setIndicesList] = useState<Indice[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [formCode, setFormCode] = useState('');
  const [formTitre, setFormTitre] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPoints, setFormPoints] = useState(100);
  const [formEssais, setFormEssais] = useState(100);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formResult, setFormResult] = useState<string | null>(null);

  const [showIndiceForm, setShowIndiceForm] = useState(false);
  const [indiceText, setIndiceText] = useState('');
  const [indicePage, setIndicePage] = useState('');
  const [indiceType, setIndiceType] = useState('text');
  const [indiceOrdre, setIndiceOrdre] = useState(0);
  const [indiceSubmitting, setIndiceSubmitting] = useState(false);
  const [indiceResult, setIndiceResult] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'tableau' | 'indices'>('overview');

  useEffect(() => {
    if (checkingAccess || !isAdmin) return;
    loadAll();
  }, [checkingAccess, isAdmin]);

  async function loadAll() {
    setLoading(true);
    const { data } = await getCoffreActif();
    setCoffre(data);
    if (data?.id) {
      const { data: joueursData } = await getTableauEssais(data.id);
      setJoueurs(joueursData || []);
      const { data: indicesData } = await getIndices(data.id);
      setIndicesList(indicesData || []);
    } else {
      setJoueurs([])
      setIndicesList([])
    }
    setLoading(false);
  }

  async function handleCreerCoffre() {
    if (!userId) return;
    setFormSubmitting(true);
    setFormResult(null);

    const { data } = await creerCoffre(
      userId, formCode, formTitre,
      formDescription || undefined,
      formUrl || undefined,
      formPoints, formEssais
    );

    if (data?.error) {
      setFormResult('❌ ' + data.error);
    } else if (data?.success) {
      setFormResult('✅ ' + data.message);
      setShowForm(false);
      setFormCode('');
      setFormTitre('');
      setFormDescription('');
      setFormUrl('');
      setFormPoints(100);
      setFormEssais(100);
      await loadAll();
    }
    setFormSubmitting(false);
  }

  async function handleAjouterIndice() {
    if (!userId || !coffre) return;
    setIndiceSubmitting(true);
    setIndiceResult(null);

    const { data } = await ajouterIndice(
      userId, coffre.id, indiceText,
      indicePage || undefined,
      indiceType, indiceOrdre
    );

    if (data?.error) {
      setIndiceResult('❌ ' + data.error);
    } else if (data?.success) {
      setIndiceResult('✅ ' + data.message);
      setIndiceText('');
      setIndicePage('');
      setIndiceOrdre(0);
      setShowIndiceForm(false);
      await loadAll();
    }
    setIndiceSubmitting(false);
  }

  function renderBarreDeVie() {
    if (!coffre) return null;
    const pourcentage = Math.round((coffre.essais_restants / coffre.essais_max) * 100);
    const couleur =
      pourcentage > 60 ? 'bg-green-500' :
      pourcentage > 25 ? 'bg-orange-500' :
      'bg-red-500';

    return (
      <div className="w-full">
        <div className="mb-1 flex justify-between text-sm">
          <span>❤️ Vie du coffre</span>
          <span>{coffre.essais_restants}/{coffre.essais_max}</span>
        </div>
        <div className="h-4 w-full rounded-full bg-gray-700">
          <div className={`${couleur} h-4 rounded-full transition-all duration-500`} style={{ width: `${pourcentage}%` }} />
        </div>
        {pourcentage <= 10 && pourcentage > 0 && (
          <p className="mt-1 animate-pulse text-xs text-red-400">⚠️ Le coffre est sur le point d'exploser !</p>
        )}
        {pourcentage === 0 && (
          <p className="mt-2 text-sm font-bold text-red-600">💥 COFFRE DÉTRUIT</p>
        )}
      </div>
    );
  }

  if (checkingAccess || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 pt-28">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-yellow-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 pt-32 text-white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <h1 className="text-3xl font-black">🔒 Accès refusé</h1>
          <Link href="/admin" className="mt-5 inline-flex rounded-full border border-white/12 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] hover:bg-white/6">
            Retour dashboard admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 pt-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300/60">Console admin</p>
            <h1 className="text-3xl font-bold text-white">🔐 Admin Coffre-Fort</h1>
            <p className="text-sm text-gray-400">Gérer les coffres, indices et statistiques d'essais</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-gray-200 hover:bg-white/6">Dashboard</Link>
            <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-yellow-600 px-4 py-2 font-bold text-white transition-colors hover:bg-yellow-500">
              {showForm ? '✕ Annuler' : '+ Nouveau Coffre'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">🆕 Créer un coffre</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Code secret (6 chiffres) *</label>
                <input type="text" maxLength={6} value={formCode} onChange={(e) => setFormCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-center font-mono text-2xl tracking-widest text-white focus:border-yellow-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Titre récompense *</label>
                <input type="text" value={formTitre} onChange={(e) => setFormTitre(e.target.value)} placeholder="Écoute exclusive de..." className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-yellow-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">Description</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Description de la récompense..." rows={2} className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-yellow-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">URL récompense</label>
                <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-yellow-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Perles</label>
                  <input type="number" value={formPoints} onChange={(e) => setFormPoints(Number(e.target.value))} min={1} className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Essais max</label>
                  <input type="number" value={formEssais} onChange={(e) => setFormEssais(Number(e.target.value))} min={1} className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white focus:border-yellow-500 focus:outline-none" />
                </div>
              </div>
            </div>
            {formResult && <p className={`mt-4 text-sm ${formResult.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{formResult}</p>}
            <button onClick={handleCreerCoffre} disabled={formSubmitting || formCode.length !== 6 || !formTitre} className="mt-4 w-full rounded-xl bg-green-600 py-3 font-bold text-white transition-colors hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500">
              {formSubmitting ? '⏳ Création...' : '🔐 Créer le coffre'}
            </button>
          </div>
        )}

        {coffre ? (
          <>
            <div className="mb-6 flex gap-2">
              {(['overview', 'tableau', 'indices'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${tab === t ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {t === 'overview' && '📊 Vue d\'ensemble'}
                  {t === 'tableau' && `👥 Joueurs (${joueurs.length})`}
                  {t === 'indices' && `💡 Indices (${indicesList.length})`}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                  <div className="mb-4 flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-white">{coffre.recompense_titre}</h2>
                      <p className="text-sm text-gray-400">Créé le {new Date(coffre.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${coffre.status === 'locked' ? 'bg-yellow-900 text-yellow-300' : coffre.status === 'opened_first' ? 'bg-green-900 text-green-300' : coffre.status === 'destroyed' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
                      {coffre.status === 'locked' && '🔒 Verrouillé'}
                      {coffre.status === 'opened_first' && '🔓 Ouvert (1er)'}
                      {coffre.status === 'destroyed' && '💥 Détruit'}
                      {coffre.status === 'dead' && '☠️ Terminé'}
                    </span>
                  </div>
                  {renderBarreDeVie()}
                  <div className="mt-6 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                    <div className="rounded-xl bg-gray-800 p-3"><p className="text-2xl font-bold text-white">{coffre.nb_participants}</p><p className="text-xs text-gray-400">Participants</p></div>
                    <div className="rounded-xl bg-gray-800 p-3"><p className="text-2xl font-bold text-white">{coffre.total_tentatives}</p><p className="text-xs text-gray-400">Tentatives</p></div>
                    <div className="rounded-xl bg-gray-800 p-3"><p className="text-2xl font-bold text-white">{coffre.essais_restants}</p><p className="text-xs text-gray-400">Essais restants</p></div>
                    <div className="rounded-xl bg-gray-800 p-3"><p className="text-2xl font-bold text-white">{coffre.recompense_points}</p><p className="text-xs text-gray-400">Perles</p></div>
                  </div>
                  {coffre.first_opener_username && (
                    <div className="mt-4 rounded-xl border border-green-800 bg-green-900/30 p-4">
                      <p className="text-sm text-green-300">🏆 Ouvert par <strong>{coffre.first_opener_username}</strong> le {new Date(coffre.first_opened_at!).toLocaleString('fr-FR')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'tableau' && (
              <div className="table-shell rounded-2xl border border-gray-800 bg-transparent p-6">
                <h2 className="mb-4 text-xl font-bold text-white">📊 Qui a fait combien d'essais</h2>
                {joueurs.length === 0 ? (
                  <p className="text-gray-500">Aucune tentative pour le moment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-800 text-gray-300">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Joueur</th>
                          <th className="px-4 py-3 text-center">Tentatives</th>
                          <th className="px-4 py-3 text-center">Échecs</th>
                          <th className="px-4 py-3 text-center">Statut</th>
                          <th className="px-4 py-3">1ère tentative</th>
                          <th className="px-4 py-3">Dernière</th>
                          <th className="px-4 py-3">Durée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {joueurs.map((j) => (
                          <tr key={j.user_id} className={`border-b border-gray-700 hover:bg-gray-800 ${j.a_trouve ? 'bg-green-900/20' : ''}`}>
                            <td className="px-4 py-3 font-bold text-gray-400">{j.rang}</td>
                            <td className="px-4 py-3"><div className="flex items-center gap-2">{j.avatar_url && <img src={j.avatar_url} alt={j.username} className="h-7 w-7 rounded-full" />}<span className="font-medium text-white">{j.username}</span></div></td>
                            <td className="px-4 py-3 text-center font-mono text-white">{j.nb_tentatives}</td>
                            <td className="px-4 py-3 text-center font-mono text-red-400">{j.nb_echecs}</td>
                            <td className="px-4 py-3 text-center">{j.a_trouve ? <span className="font-bold text-green-400">🏆 Trouvé</span> : <span className="text-gray-400">🔒 Cherche</span>}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(j.premiere_tentative).toLocaleString('fr-FR')}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{new Date(j.derniere_tentative).toLocaleString('fr-FR')}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{j.duree_totale || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'indices' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">💡 Indices</h2>
                    <button onClick={() => setShowIndiceForm(!showIndiceForm)} className="rounded-lg bg-yellow-600 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-yellow-500">
                      {showIndiceForm ? '✕ Annuler' : '+ Ajouter'}
                    </button>
                  </div>
                  {showIndiceForm && (
                    <div className="mb-4 rounded-xl bg-gray-800 p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-sm text-gray-400">Texte de l'indice *</label>
                          <textarea value={indiceText} onChange={(e) => setIndiceText(e.target.value)} placeholder="Le 3ème chiffre est un 7..." rows={2} className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700 p-3 text-sm text-white focus:border-yellow-500 focus:outline-none" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-1 block text-sm text-gray-400">Page</label>
                            <input type="text" value={indicePage} onChange={(e) => setIndicePage(e.target.value)} placeholder="/profil" className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white focus:border-yellow-500 focus:outline-none" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm text-gray-400">Type</label>
                            <select value={indiceType} onChange={(e) => setIndiceType(e.target.value)} className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white focus:border-yellow-500 focus:outline-none">
                              <option value="text">Texte</option>
                              <option value="image">Image</option>
                              <option value="audio">Audio</option>
                              <option value="easter_egg">Easter Egg</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm text-gray-400">Ordre</label>
                            <input type="number" value={indiceOrdre} onChange={(e) => setIndiceOrdre(Number(e.target.value))} min={0} className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-sm text-white focus:border-yellow-500 focus:outline-none" />
                          </div>
                        </div>
                        {indiceResult && <p className={`text-sm ${indiceResult.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{indiceResult}</p>}
                        <button onClick={handleAjouterIndice} disabled={indiceSubmitting || !indiceText.trim()} className="w-full rounded-lg bg-green-600 py-2 text-sm font-bold text-white transition-colors hover:bg-green-500 disabled:bg-gray-700">
                          {indiceSubmitting ? '⏳...' : '💡 Ajouter l\'indice'}
                        </button>
                      </div>
                    </div>
                  )}
                  {indicesList.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun indice ajouté.</p>
                  ) : (
                    <div className="space-y-2">
                      {indicesList.map((indice, i) => (
                        <div key={indice.id} className="flex items-start gap-3 rounded-lg bg-gray-800 p-3">
                          <span className="mt-0.5 text-sm font-bold text-yellow-400">#{i + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm text-white">{indice.indice_text}</p>
                            <div className="mt-1 flex gap-3">
                              {indice.page_location && <span className="text-xs text-gray-500">📍 {indice.page_location}</span>}
                              <span className="text-xs text-gray-500">🏷️ {indice.hint_type}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="mb-4 text-4xl">🔒</p>
            <p className="mb-4 text-gray-400">Aucun coffre actif. Crée-en un !</p>
            <button onClick={() => setShowForm(true)} className="rounded-xl bg-yellow-600 px-6 py-3 font-bold text-white transition-colors hover:bg-yellow-500">
              + Créer un coffre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
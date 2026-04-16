"use client"

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'

type FeedbackTab = 'tracks' | 'prods'

type FeedbackTarget = {
  id: string
  nom_titre: string
  nom_artiste: string
  pays: string | null
  genre: string | null
  sous_genre: string | null
  vues_actuelles: number | null
  digger?: {
    username?: string | null
    equipped_badge_1?: string | null
    equipped_badge_2?: string | null
  } | null
}

function FeedbackPageContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [tracks, setTracks] = useState<FeedbackTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FeedbackTab>('tracks')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<FeedbackTarget | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab === 'prods') {
      setActiveTab('prods')
    }
  }, [searchParams])

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
      } catch {
        setUser(null)
      }
    }

    loadAuth()
  }, [])

  useEffect(() => {
    const loadTracks = async () => {
      setLoading(true)

      try {
        const query = activeTab === 'prods'
          ? supabase
              .from('prod')
              .select('id, nom_titre, nom_artiste, pays, genre, sous_genre, vues_actuelles, digger:user_id(username, equipped_badge_1, equipped_badge_2)')
          : supabase
              .from('titre')
              .select('id, nom_titre, nom_artiste, pays, genre, sous_genre, vues_actuelles, digger:user_id(username, equipped_badge_1, equipped_badge_2)')
              .not('type_partage', 'eq', 'production')

        const { data, error } = await query
          .eq('feedback_enabled', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        setTracks((data || []) as FeedbackTarget[])
      } catch (err) {
        console.error('Erreur chargement feedback:', err)
        setTracks([])
      } finally {
        setLoading(false)
      }
    }

    loadTracks()
  }, [activeTab])

  const handleOpenFeedback = (track: FeedbackTarget) => {
    if (!user) {
      alert('Tu dois être connecté pour donner un feedback !')
      return
    }

    setSelectedTrack(track)
    setFeedbackText('')
    setMessage('')
    setIsModalOpen(true)
  }

  const handleSubmitFeedback = async () => {
    if (!selectedTrack) return

    if (!feedbackText.trim()) {
      setMessage('❌ Le feedback ne peut pas être vide !')
      return
    }

    if (feedbackText.length < 10) {
      setMessage('❌ Le feedback doit faire au moins 10 caractères !')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('feedback')
        .insert([{
          contenu: feedbackText,
          titre_id: activeTab === 'tracks' ? selectedTrack.id : null,
          prod_id: activeTab === 'prods' ? selectedTrack.id : null,
          digger_id: user.id,
          note: null,
        }])

      if (error) throw error

      setMessage(activeTab === 'prods' ? '✅ Feedback prod envoyé avec succès !' : '✅ Feedback envoyé avec succès ! Merci ! 🎵')
      window.setTimeout(() => {
        setIsModalOpen(false)
        setFeedbackText('')
        setSelectedTrack(null)
      }, 1200)
    } catch (err: any) {
      setMessage(`❌ Erreur : ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const emptyLabel = activeTab === 'prods'
    ? "Les beatmakers n'ont pas encore activé le feedback sur leurs prods."
    : "Les artistes n'ont pas encore activé le feedback sur leurs musiques."

  return (
    <div className="min-h-screen bg-black pt-[120px] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12">
          <h1 className="mb-4 text-center text-7xl font-black uppercase tracking-tighter md:text-8xl">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              FEEDBACK
            </span>
          </h1>
          <p className="text-center text-lg font-bold uppercase tracking-widest text-gray-400">
            Un flux pour les morceaux, un flux pour les prods
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('tracks')}
              className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.22em] transition ${activeTab === 'tracks' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Musiques
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('prods')}
              className={`rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.22em] transition ${activeTab === 'prods' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Prods
            </button>
          </div>

          {!user ? (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-900/20 px-5 py-4 text-sm text-gray-300">
              <span>Tu dois être connecté pour laisser un feedback.</span>
              <Link href="/auth" className="ml-3 font-black uppercase text-purple-300 hover:text-white">
                Se connecter
              </Link>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-xl font-black text-gray-400">
            Chargement des {activeTab === 'prods' ? 'prods' : 'morceaux'}...
          </div>
        ) : tracks.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="mb-4 text-2xl font-black text-gray-500">{activeTab === 'prods' ? '🎛 AUCUNE PROD DISPONIBLE' : '🎵 AUCUN MORCEAU DISPONIBLE'}</p>
            <p className="text-gray-400">{emptyLabel}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`rounded-2xl border p-6 transition-all ${activeTab === 'prods' ? 'border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-sky-900/20 hover:border-cyan-400/40' : 'border-purple-500/20 bg-gradient-to-r from-purple-900/20 to-pink-900/20 hover:border-purple-500/50'}`}
              >
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex-1">
                    <Link href={activeTab === 'prods' ? `/prod/${track.id}` : `/track/${track.id}`} className="block">
                      <h3 className={`truncate text-2xl font-black uppercase transition-colors ${activeTab === 'prods' ? 'hover:text-cyan-300' : 'hover:text-purple-400'}`}>
                        {track.nom_titre}
                      </h3>
                    </Link>
                    <p className={`mb-2 mt-2 text-sm font-bold ${activeTab === 'prods' ? 'text-cyan-300' : 'text-purple-400'}`}>
                      {track.nom_artiste}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs font-bold uppercase text-gray-500">
                      <span>📍 {track.pays || 'Global'}</span>
                      <span>🎵 {track.genre || 'Non défini'}</span>
                      {track.sous_genre ? <span>🎧 {track.sous_genre}</span> : null}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <span>Par</span>
                      <span className={`font-bold ${activeTab === 'prods' ? 'text-cyan-300' : 'text-pink-400'}`}>@{track.digger?.username || 'Anonyme'}</span>
                      <EquippedBadgesInline badgeIds={[track.digger?.equipped_badge_1, track.digger?.equipped_badge_2]} size="xs" />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-2xl font-black ${activeTab === 'prods' ? 'text-cyan-300' : 'text-purple-400'}`}>
                        {track.vues_actuelles || 0}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Vues</p>
                    </div>

                    <button
                      onClick={() => handleOpenFeedback(track)}
                      disabled={!user}
                      className={`rounded-full px-6 py-3 text-sm font-black uppercase transition-all ${user ? activeTab === 'prods' ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'cursor-not-allowed bg-gray-600 text-gray-400 opacity-50'}`}
                    >
                      💬 Feedback
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && selectedTrack ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 pt-[120px] backdrop-blur-xl">
          <div className={`w-full max-w-2xl rounded-3xl border-2 p-8 shadow-[0_0_40px_rgba(168,85,247,0.3)] ${activeTab === 'prods' ? 'border-cyan-500 bg-[#061017]' : 'border-purple-500 bg-[#0a0a0a]'}`}>
            <div className="mb-6">
              <button onClick={() => setIsModalOpen(false)} className="mb-4 text-2xl text-gray-500 hover:text-white">
                ✕
              </button>
              <h2 className="mb-2 text-3xl font-black uppercase">
                {activeTab === 'prods' ? 'FEEDBACK PROD POUR' : 'FEEDBACK POUR'}
              </h2>
              <p className={`text-lg font-bold ${activeTab === 'prods' ? 'text-cyan-300' : 'text-purple-400'}`}>
                {selectedTrack.nom_titre}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>par</span>
                <span className={`font-bold ${activeTab === 'prods' ? 'text-cyan-300' : 'text-pink-400'}`}>@{selectedTrack.digger?.username || 'Anonyme'}</span>
                <EquippedBadgesInline badgeIds={[selectedTrack.digger?.equipped_badge_1, selectedTrack.digger?.equipped_badge_2]} size="xs" />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-500">
                📝 TON FEEDBACK (minimum 10 caractères)
              </label>
              <textarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder={activeTab === 'prods' ? 'Décris la texture, le mix, l’ambiance ou ce qui peut être amélioré.' : 'Partage ton avis constructif... Qu’est-ce qui peut être amélioré ?'}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-white outline-none focus:border-cyan-400/40"
                rows={6}
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="mt-2 text-xs text-gray-500">{feedbackText.length}/500 caractères</p>
            </div>

            {message ? (
              <div className={`mb-6 rounded-2xl p-4 text-center text-sm font-bold ${message.includes('✅') ? 'border border-green-500/30 bg-green-900/30 text-green-400' : 'border border-red-500/30 bg-red-900/30 text-red-400'}`}>
                {message}
              </div>
            ) : null}

            <div className="flex gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-full border border-white/20 px-6 py-3 font-black uppercase text-white transition-all hover:bg-white/5 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={isSubmitting || feedbackText.length < 10}
                className={`flex-1 rounded-full px-6 py-3 font-black uppercase transition-all ${feedbackText.length >= 10 ? activeTab === 'prods' ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-black hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]' : 'cursor-not-allowed bg-gray-600 text-gray-400 opacity-50'}`}
              >
                {isSubmitting ? '⏳ ENVOI...' : '✅ ENVOYER'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black pt-[120px] text-white flex items-center justify-center">Chargement du feedback...</div>}>
      <FeedbackPageContent />
    </Suspense>
  )
}

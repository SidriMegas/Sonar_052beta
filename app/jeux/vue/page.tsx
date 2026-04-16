"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { checkAndUnlockBadge } from '@/lib/achievements'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'

interface Track {
  id: string
  nom_titre: string
  nom_artiste: string
  vues_actuelles: number
  youtube_id: string
  digger?: {
    id: string
    username: string
    avatar_url?: string
    equipped_badge_1?: string | null
    equipped_badge_2?: string | null
  }
}

type VueScoreRow = {
  id: string
  best_score: number
  times_played: number | null
  exact_guess_count?: number | null
}

export default function JeuDesVues() {
  const [gamePhase, setGamePhase] = useState<'loading' | 'guess' | 'playing' | 'gameover'>('loading')
  const [gameResult, setGameResult] = useState<'lost' | 'won' | null>(null)
  const [user, setUser] = useState<any>(null)
  const [allTracks, setAllTracks] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [previousTrack, setPreviousTrack] = useState<Track | null>(null)
  const [guess, setGuess] = useState('')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [message, setMessage] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [usedTrackIds, setUsedTrackIds] = useState<string[]>([])
  const [topScores, setTopScores] = useState<Array<{ user_id: string; username: string; best_score: number; equipped_badge_1?: string | null; equipped_badge_2?: string | null }>>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)

  // 🔐 RÉCUPÉRER L'UTILISATEUR (Indispensable pour les badges)
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 🎵 CHARGER TOUTES LES MUSIQUES AVEC DIGGERS
  useEffect(() => {
    const fetchTracks = async () => {
      const { data, error } = await supabase
        .from('titre')
        .select('id, nom_titre, nom_artiste, vues_actuelles, youtube_id, user_id')
        .gt('vues_actuelles', 0)
        .neq('type_partage', 'production')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur:', error)
        setGamePhase('gameover')
        return
      }

      if (data && data.length > 0) {
        const diggerIds = [...new Set(data.map((t: any) => t.user_id))].filter(Boolean)
        const { data: diggers } = await supabase
          .from('digger')
          .select('id, username, avatar_url, equipped_badge_1, equipped_badge_2')
          .in('id', diggerIds)

        const diggerMap = new Map(diggers?.map((d: any) => [d.id, d]) || [])
        const tracksWithDiggers = data.map((track: any) => ({
          ...track,
          digger: diggerMap.get(track.user_id)
        }))

        setAllTracks(tracksWithDiggers)
        loadFirstTrack(tracksWithDiggers)
      }
    }
    fetchTracks()
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [user?.id])

  const loadFirstTrack = (tracks: Track[]) => {
    if (tracks.length === 0) return
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
    setCurrentTrack(randomTrack)
    setUsedTrackIds([randomTrack.id])
    setGamePhase('guess')
    setGameResult(null)
    setMessage('')
    setShowAnswer(false)
  }

  // 🎯 PHASE 1 : DEVINER LE NOMBRE EXACT (Badge Devin Exact ici)
  const handleGuess = async () => {
    if (!guess || !currentTrack) return

    const guessNum = parseInt(guess)
    const actualViews = currentTrack.vues_actuelles

    if (guessNum === actualViews) {
      setMessage(`🏆 PARFAIT ! Tu as trouvé exactement ${actualViews.toLocaleString('fr-FR')} vues !`)
      setShowAnswer(true)

      // 🎖️ DÉBLOCAGE BADGE DEVIN EXACT
      if (user) {
        await recordExactGuess(user.id)
        const newBadge = await checkAndUnlockBadge(user.id, 'devin_exact')
        if (newBadge) {
          alert(`🎉 NOUVEAU BADGE DÉBLOQUÉ : ${newBadge.name}\n${newBadge.description}`)
        }
      }

      setTimeout(() => startGamePhase(), 2000)
    } else {
      setMessage(`❌ Pas exact. La réponse était ${actualViews.toLocaleString('fr-FR')} vues.`)
      setShowAnswer(true)
      setTimeout(() => startGamePhase(), 2000)
    }
  }

  const startGamePhase = () => {
    if (!currentTrack) return
    setPreviousTrack(currentTrack)
    loadNextTrack()
    setGamePhase('playing')
    setGuess('')
    setMessage('')
    setShowAnswer(false)
  }

  const loadNextTrack = (currentScore = score) => {
    const availableTracks = allTracks.filter(t => !usedTrackIds.includes(t.id))
    if (availableTracks.length === 0) {
      finishGame(false, currentScore)
      return
    }
    const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
    setCurrentTrack(randomTrack)
    setUsedTrackIds(prev => [...prev, randomTrack.id])
  }

  // ✅ RÉPONDRE PLUS / MOINS (Badge Score 2 ici)
  const handleAnswer = async (answer: 'plus' | 'moins') => {
    if (!currentTrack || !previousTrack) return

    const isCorrect =
      (answer === 'plus' && currentTrack.vues_actuelles > previousTrack.vues_actuelles) ||
      (answer === 'moins' && currentTrack.vues_actuelles < previousTrack.vues_actuelles)

    if (isCorrect) {
      const newScore = score + 1
      setScore(newScore)
      setStreak(streak + 1)
      setMessage(`✅ Correct ! ${currentTrack.vues_actuelles.toLocaleString('fr-FR')} vues`)
      setShowAnswer(true)

      // 🎖️ TEST BADGE SCORE 2
      if (user && newScore === 2) {
        console.log("Tentative déblocage badge score_2...");
        const badge = await checkAndUnlockBadge(user.id, 'score_2')
        if (badge) {
          alert(`⭐ NOUVEAU BADGE : ${badge.name}\n${badge.description}`)
        }
      }

      setTimeout(() => {
        setPreviousTrack(currentTrack)
        loadNextTrack(newScore)
        setMessage('')
        setShowAnswer(false)
      }, 1500)
    } else {
      finishGame(true, score)
    }
  }

  const finishGame = async (wrong = false, finalScore = score) => {
    if (wrong) {
      setGameResult('lost')
      setMessage(`❌ Faux ! ${currentTrack?.nom_titre} avait ${currentTrack?.vues_actuelles.toLocaleString('fr-FR')} vues`)
      setShowAnswer(true)
    } else {
      setGameResult('won')
      setMessage('🏆 Tu as termine toutes les musiques disponibles. Tu as gagne cette partie.')
      setShowAnswer(false)
    }
    setGamePhase('gameover')
    if (user) await saveScore(finalScore)
    await fetchLeaderboard()
  }

  const saveScore = async (finalScore: number) => {
    if (!user) return
    try {
      const { data: profile } = await supabase.from('digger').select('username').eq('id', user.id).single()
      const { data: existingScore, error: fetchError } = await supabase.from('vue_score').select('id, best_score, times_played').eq('user_id', user.id).maybeSingle()
      if (fetchError) throw fetchError
      const finalUsername = profile?.username || 'Anonyme'

      if (existingScore) {
        await supabase.from('vue_score').update({ 
          best_score: Math.max(existingScore.best_score, finalScore), 
          times_played: (existingScore.times_played || 0) + 1,
          username: finalUsername,
          updated_at: new Date().toISOString()
        }).eq('user_id', user.id)
      } else {
        await supabase.from('vue_score').insert([{ user_id: user.id, username: finalUsername, best_score: finalScore, times_played: 1 }])
      }
    } catch (err) { console.error('Erreur sauvegarde score:', err) }
  }

  const recordExactGuess = async (userId: string) => {
    try {
      const { data: existingScore, error: fetchError } = await supabase
        .from('vue_score')
        .select('id, best_score, times_played, exact_guess_count')
        .eq('user_id', userId)
        .maybeSingle<VueScoreRow>()

      if (fetchError) throw fetchError

      if (existingScore) {
        await supabase
          .from('vue_score')
          .update({
            exact_guess_count: Number(existingScore.exact_guess_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      } else {
        const { data: profile } = await supabase.from('digger').select('username').eq('id', userId).single()
        await supabase.from('vue_score').insert([{
          user_id: userId,
          username: profile?.username || 'Anonyme',
          best_score: 0,
          times_played: 0,
          exact_guess_count: 1,
        }])
      }
    } catch (err) {
      console.error('Erreur sauvegarde echauffement:', err)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('vue_score')
        .select('user_id, username, best_score')
        .order('best_score', { ascending: false })
      if (error) throw error
      if (data) {
        const topRows = data.slice(0, 5)
        const topUserIds = Array.from(new Set(topRows.map((row) => row.user_id).filter(Boolean)))
        const { data: topUsers } = topUserIds.length
          ? await supabase.from('digger').select('id, equipped_badge_1, equipped_badge_2').in('id', topUserIds)
          : { data: [] as Array<{ id: string; equipped_badge_1?: string | null; equipped_badge_2?: string | null }> }
        const topUserMap = new Map((topUsers || []).map((row) => [row.id, row]))

        setTopScores(topRows.map((row) => ({
          user_id: row.user_id,
          username: row.username || 'Anonyme',
          best_score: row.best_score || 0,
          equipped_badge_1: topUserMap.get(row.user_id)?.equipped_badge_1 || null,
          equipped_badge_2: topUserMap.get(row.user_id)?.equipped_badge_2 || null,
        })))
        setTotalPlayers(data.length)

        if (user?.id) {
          const index = data.findIndex((row) => row.user_id === user.id)
          setMyRank(index >= 0 ? index + 1 : null)
        } else {
          setMyRank(null)
        }
      }
    } catch (err) { console.error('Erreur classement:', err) }
  }

  const handleRestart = () => {
    setScore(0); setStreak(0); setGamePhase('loading'); setGameResult(null); setUsedTrackIds([]); setMessage(''); setShowAnswer(false); setGuess('')
    if (allTracks.length > 0) loadFirstTrack(allTracks)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white px-4 pb-10 pt-[76px] md:pt-[84px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(72,255,163,0.16)_0%,rgba(0,0,0,0)_36%),radial-gradient(circle_at_bottom,rgba(0,255,157,0.08)_0%,rgba(0,0,0,0)_42%)]" />
        <div className="absolute inset-x-[-6%] top-[22%] h-[56%] opacity-90">
          <svg viewBox="0 0 1200 420" className="h-full w-full" fill="none" preserveAspectRatio="none">
            <path d="M0 342 L110 342 L180 250 L270 314 L365 154 L450 230 L560 92 L650 182 L760 44 L860 132 L970 24 L1060 86 L1200 12" stroke="rgba(120,255,170,0.16)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M0 342 L110 342 L180 250 L270 314 L365 154 L450 230 L560 92 L650 182 L760 44 L860 132 L970 24 L1060 86 L1200 12" stroke="rgba(120,255,170,0.88)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
            <path d="M1110 26 L1200 12 L1148 98" stroke="rgba(120,255,170,0.88)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
            <defs>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>
        <div className="absolute inset-y-0 left-0 w-40 bg-[linear-gradient(90deg,rgba(120,255,170,0.06),rgba(0,0,0,0))]" />
        <div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(270deg,rgba(120,255,170,0.06),rgba(0,0,0,0))]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-2xl">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="mb-1 text-4xl font-black uppercase tracking-tight md:text-5xl">Jeu des Vues</h1>
          <p className="text-xs uppercase tracking-[0.24em] text-lime-200/62">Devine les vues puis enchaine sur le plus ou moins.</p>
          <div className="mt-4 inline-flex flex-col sm:flex-row gap-2 items-center text-[11px]">
            <span className="rounded-full border border-lime-400/16 bg-lime-400/8 px-3 py-1 text-lime-50/76 backdrop-blur-sm">
              Joueurs classes: <strong className="text-lime-300">{totalPlayers}</strong>
            </span>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100/88 backdrop-blur-sm">
              Ta position: <strong>{myRank ? `#${myRank}` : 'Non classe'}</strong>
            </span>
          </div>
        </div>

        {/* PHASE LOADING */}
        {gamePhase === 'loading' && (
          <div className="text-center py-16">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-t-4 border-lime-400"></div>
            <p className="text-sm italic text-lime-100/48">Préparation du jeu en cours...</p>
          </div>
        )}

        {/* PHASE 1 : DEVINER LE NOMBRE */}
        {gamePhase === 'guess' && currentTrack && (
          <div className="rounded-[28px] border border-lime-400/14 bg-[linear-gradient(180deg,rgba(5,10,8,0.96),rgba(2,4,4,0.98))] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-[22px] border border-lime-400/10 bg-black">
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${currentTrack.youtube_id}?autoplay=0`} frameBorder="0" allowFullScreen title={currentTrack.nom_titre}></iframe>
            </div>

            <h2 className="mb-1 text-xl font-black uppercase md:text-2xl">{currentTrack.nom_titre}</h2>
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-lime-100/52">par {currentTrack.nom_artiste}</p>

            {currentTrack.digger && (
              <Link href={`/profil/${currentTrack.digger.id}`}>
                <div className="mb-6 cursor-pointer rounded-[20px] border border-lime-400/14 bg-black/40 p-3 transition-all hover:border-lime-300/40">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-lime-400/30 bg-lime-400/12 text-sm">
                      {currentTrack.digger.avatar_url ? (
                        <img src={currentTrack.digger.avatar_url} alt={currentTrack.digger.username} className="w-full h-full object-cover" />
                      ) : (
                        currentTrack.digger.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-lime-100/38">Decouvert par</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-black text-lime-300">@{currentTrack.digger.username}</p>
                        <EquippedBadgesInline badgeIds={[currentTrack.digger.equipped_badge_1, currentTrack.digger.equipped_badge_2]} size="xs" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            <div className="mb-6">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-lime-100/46">Combien de vues ?</label>
              <input type="number" value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Ex: 50000" className="w-full rounded-[18px] border border-lime-400/20 bg-black/50 px-4 py-3 text-center text-lg font-black text-white outline-none transition-all focus:border-lime-300" onKeyPress={(e) => e.key === 'Enter' && handleGuess()} />
            </div>

            {showAnswer && message && (
              <div className={`mb-6 rounded-[18px] p-3 text-center text-sm font-bold ${message.includes('PARFAIT') ? 'border border-lime-400/25 bg-lime-400/12 text-lime-300' : 'border border-rose-500/25 bg-rose-500/12 text-rose-300'}`}>{message}</div>
            )}

            <button onClick={handleGuess} disabled={!guess || showAnswer} className="w-full rounded-[18px] border border-lime-400 bg-lime-400 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition-all hover:bg-lime-300 disabled:opacity-50">Verifier</button>
          </div>
        )}

        {/* PHASE 2 : LE JEU (PLUS / MOINS) */}
        {gamePhase === 'playing' && currentTrack && previousTrack && (
          <div className="rounded-[28px] border border-lime-400/14 bg-[linear-gradient(180deg,rgba(5,10,8,0.96),rgba(2,4,4,0.98))] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-lime-100/38">Score</p>
                <p className="text-3xl font-black text-lime-300">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-lime-100/38">Serie</p>
                <p className="text-3xl font-black text-emerald-300">{streak}</p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 xl:grid-cols-2">
              <article className="rounded-[24px] border border-lime-400/12 bg-black/36 p-4">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-lime-300/62">Reference actuelle</p>
                <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-[20px] border border-lime-400/10 bg-black">
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${previousTrack.youtube_id}?autoplay=0`} frameBorder="0" allowFullScreen title={previousTrack.nom_titre}></iframe>
                </div>
                <h2 className="mb-1 text-lg font-black uppercase md:text-xl">{previousTrack.nom_titre}</h2>
                <p className="mb-4 text-xs uppercase tracking-[0.2em] text-lime-100/52">par {previousTrack.nom_artiste}</p>

                {previousTrack.digger && (
                  <Link href={`/profil/${previousTrack.digger.id}`}>
                    <div className="mb-4 cursor-pointer rounded-[18px] border border-lime-400/12 bg-lime-400/6 p-3 transition hover:border-lime-300/36 hover:bg-lime-400/10">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-lime-100/36">Decouvert par</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm font-black text-lime-300">@{previousTrack.digger.username}</p>
                        <EquippedBadgesInline badgeIds={[previousTrack.digger.equipped_badge_1, previousTrack.digger.equipped_badge_2]} size="xs" />
                      </div>
                    </div>
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-lime-400/10 bg-black/40 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-lime-100/34">Vues</p>
                    <p className="mt-1 text-lg font-black text-lime-300">{previousTrack.vues_actuelles.toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="rounded-[18px] border border-lime-400/10 bg-black/40 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-lime-100/34">Statut</p>
                    <p className="mt-1 text-lg font-black text-white">Visible</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[24px] border border-lime-400/12 bg-black/36 p-4">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-lime-300/62">Nouveau morceau</p>
                <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-[20px] border border-lime-400/10 bg-black">
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${currentTrack.youtube_id}?autoplay=0`} frameBorder="0" allowFullScreen title={currentTrack.nom_titre}></iframe>
                </div>
                <h2 className="mb-1 text-lg font-black uppercase md:text-xl">{currentTrack.nom_titre}</h2>
                <p className="mb-4 text-xs uppercase tracking-[0.2em] text-lime-100/52">par {currentTrack.nom_artiste}</p>

                {currentTrack.digger && (
                  <Link href={`/profil/${currentTrack.digger.id}`}>
                    <div className="mb-4 cursor-pointer rounded-[18px] border border-lime-400/12 bg-lime-400/6 p-3 transition hover:border-lime-300/36 hover:bg-lime-400/10">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-lime-100/36">Decouvert par</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm font-black text-lime-300">@{currentTrack.digger.username}</p>
                        <EquippedBadgesInline badgeIds={[currentTrack.digger.equipped_badge_1, currentTrack.digger.equipped_badge_2]} size="xs" />
                      </div>
                    </div>
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[18px] border border-lime-400/10 bg-black/40 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-lime-100/34">Vues</p>
                    <p className="mt-1 text-lg font-black text-lime-300">{showAnswer ? currentTrack.vues_actuelles.toLocaleString('fr-FR') : '?????'}</p>
                  </div>
                  <div className="rounded-[18px] border border-lime-400/10 bg-black/40 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-lime-100/34">Statut</p>
                    <p className="mt-1 text-lg font-black text-white">{showAnswer ? 'Revele' : 'Cache'}</p>
                  </div>
                </div>
              </article>
            </div>

            {showAnswer && message && (
              <div className={`mb-6 rounded-[18px] p-3 text-center text-xs font-bold ${message.includes('Correct') ? 'border border-lime-400/25 bg-lime-400/12 text-lime-300' : 'border border-rose-500/25 bg-rose-500/12 text-rose-300'}`}>{message}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => handleAnswer('moins')} disabled={showAnswer} className="flex-1 rounded-[18px] border border-rose-500/70 bg-black px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-rose-300 transition-all hover:bg-rose-500/10 disabled:opacity-50">↓ Moins</button>
              <button onClick={() => handleAnswer('plus')} disabled={showAnswer} className="flex-1 rounded-[18px] border border-lime-400/80 bg-black px-4 py-4 text-xs font-black uppercase tracking-[0.18em] text-lime-300 transition-all hover:bg-lime-400/10 disabled:opacity-50">↑ Plus</button>
            </div>
          </div>
        )}

        {/* PHASE GAMEOVER */}
        {gamePhase === 'gameover' && (
          <div className="rounded-[28px] border border-lime-400/14 bg-[linear-gradient(180deg,rgba(5,10,8,0.96),rgba(2,4,4,0.98))] p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <h2 className="mb-3 text-3xl font-black uppercase md:text-4xl">{gameResult === 'won' ? 'Victoire totale' : 'Game Over'}</h2>
            {message && (
              <div className={`mb-6 rounded-[18px] p-3 text-center text-sm font-bold ${gameResult === 'won' ? 'border border-lime-400/25 bg-lime-400/12 text-lime-300' : 'border border-rose-500/25 bg-rose-500/12 text-rose-300'}`}>
                {message}
              </div>
            )}
            <div className="mb-6 rounded-[22px] border border-lime-400/12 bg-black/40 p-6">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-lime-100/38">Score final</p>
              <p className="mb-2 text-5xl font-black text-lime-300">{score}</p>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-lime-400/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-lime-100/38">Ta place</p>
                <p className="mt-2 text-3xl font-black text-lime-300">{myRank ? `#${myRank}` : 'Non classe'}</p>
              </div>
              <div className="rounded-[22px] border border-lime-400/10 bg-black/30 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-lime-100/38">Joueurs classes</p>
                <p className="mt-2 text-3xl font-black text-lime-300">{totalPlayers}</p>
              </div>
            </div>

            {topScores.length > 0 && (
              <div className="mb-6 rounded-[22px] border border-lime-400/10 bg-black/30 p-5 text-left">
                <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.3em] text-lime-300">Top 5 diggers</p>
                <div className="flex flex-col gap-2">
                  {topScores.map((ts, index) => (
                    <div key={`${ts.user_id}-${index}`} className="flex items-center justify-between rounded-[16px] border border-lime-400/8 bg-white/[0.03] px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black ${index === 0 ? 'text-lime-300' : 'text-lime-100/40'}`}>#{index + 1}</span>
                        <span className="inline-flex items-center gap-2 font-bold text-sm">@{ts.username}<EquippedBadgesInline badgeIds={[ts.equipped_badge_1, ts.equipped_badge_2]} size="xs" /></span>
                      </div>
                      <span className="font-black text-lime-300">{ts.best_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleRestart} className="flex-1 rounded-[18px] border border-lime-400 bg-lime-400 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition-all hover:bg-lime-300">Rejouer</button>
              <Link href="/" className="flex flex-1 items-center justify-center rounded-[18px] border border-white/12 bg-white/8 py-3 text-center text-xs font-black uppercase tracking-[0.18em] transition-all hover:bg-white/16">Accueil</Link>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
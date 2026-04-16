"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserBalance } from '@/lib/points'
import Link from 'next/link'
import Image from 'next/image'
import PointsPearl from '@/app/components/PointsPearl'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'

type ParisMise = {
  choix: 'OUI' | 'NON'
  montant: number | null
}

type ParisQuestion = {
  id: string
  question: string
  description?: string | null
  status: string | null
  resultat?: 'OUI' | 'NON' | null
  deadline_at?: string | null
  created_at?: string | null
  paris_mises: ParisMise[]
}

type ParisSortMode = 'newest' | 'stake' | 'bettors'

const SUGGESTION_PREFIX = 'Suggéré par '
const SORT_OPTIONS: Array<{ value: ParisSortMode; label: string }> = [
  { value: 'newest', label: 'Nouveaute' },
  { value: 'stake', label: 'Perles pariees' },
  { value: 'bettors', label: 'Nombre de parieurs' },
]

export default function ParisPage() {
  const [questions, setQuestions] = useState<ParisQuestion[]>([])
  const [balance, setBalance] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [authReady, setAuthReady] = useState(false)
  const [misesInput, setMisesInput] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(true)
  const [suggestion, setSuggestion] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [topParieurs, setTopParieurs] = useState<Array<{ userId: string; username: string; totalWon: number; equipped_badge_1?: string | null; equipped_badge_2?: string | null }>>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [totalParieurs, setTotalParieurs] = useState(0)
  const [sortMode, setSortMode] = useState<ParisSortMode>('newest')

  const formatDeadline = (deadlineAt?: string | null) => {
    if (!deadlineAt) return null
    return new Date(deadlineAt).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = (deadlineAt?: string | null) => {
    if (!deadlineAt) return false
    return new Date(deadlineAt).getTime() <= Date.now()
  }

  const getPariCreator = (question: ParisQuestion) => {
    const rawDescription = question.description?.trim() || ''
    if (rawDescription.startsWith(SUGGESTION_PREFIX)) {
      return rawDescription.slice(SUGGESTION_PREFIX.length).trim() || 'Anonyme'
    }
    return 'Capitaine Sonar'
  }

  const getPariDescription = (question: ParisQuestion) => {
    const rawDescription = question.description?.trim() || ''
    if (!rawDescription || rawDescription.startsWith(SUGGESTION_PREFIX)) {
      return null
    }
    return rawDescription
  }

  const formatCreationDate = (createdAt?: string | null) => {
    if (!createdAt) return null
    return new Date(createdAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
    })
  }

  const getTotalStake = (question: ParisQuestion) => question.paris_mises.reduce((sum, mise) => sum + Number(mise.montant || 0), 0)

  const getBettorCount = (question: ParisQuestion) => question.paris_mises.filter((mise) => Number(mise.montant || 0) > 0).length

  const sortedQuestions = [...questions].sort((left, right) => {
    if (sortMode === 'stake') {
      return getTotalStake(right) - getTotalStake(left)
    }

    if (sortMode === 'bettors') {
      const bettorsDelta = getBettorCount(right) - getBettorCount(left)
      if (bettorsDelta !== 0) return bettorsDelta
    }

    const rightTs = new Date(right.created_at || 0).getTime()
    const leftTs = new Date(left.created_at || 0).getTime()
    return rightTs - leftTs
  })
  
  useEffect(() => {
    let alive = true

    init(alive)

    // 2. ÉCOUTEUR DE SESSION (C'est ça qui répare le "Connecte-toi")
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return
      if (session?.user) {
        setUser(session.user)
        const b = await getUserBalance(session.user.id)
        setBalance(Number(b) || 0)
      } else {
        setUser(null)
        setBalance(0)
      }
      setAuthReady(true)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  async function init(alive = true) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!alive) return
      if (session?.user) {
        setUser(session.user)
        const b = await getUserBalance(session.user.id)
        setBalance(Number(b) || 0)
      }
      await fetchParis()
      await fetchParisLeaderboard(session?.user?.id || null)
    } catch (err) {
      console.error("Erreur d'initialisation:", err)
    } finally {
      if (alive) {
        setLoading(false)
        setAuthReady(true)
      }
    }
  }

  async function fetchParis() {
    const { data, error } = await supabase
      .from('paris_questions')
      .select('*, paris_mises (choix, montant)')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })

    if (data) setQuestions((data as ParisQuestion[]) || [])
  }

  async function fetchParisLeaderboard(currentUserId?: string | null) {
    const { data, error } = await supabase
      .from('points_history')
      .select('user_id, amount')
      .eq('type', 'bet')
      .gt('amount', 0)
      .limit(5000)

    if (error || !data) {
      console.error('Erreur classement paris:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      })
      return
    }

    const userIds = Array.from(new Set(data.map((row) => row.user_id).filter(Boolean)))
    const { data: diggers } = userIds.length
      ? await supabase
          .from('digger')
          .select('id, username, equipped_badge_1, equipped_badge_2')
          .in('id', userIds)
      : { data: [] as Array<{ id: string; username: string | null; equipped_badge_1?: string | null; equipped_badge_2?: string | null }> }

    const diggerMap = new Map((diggers || []).map((d) => [d.id, d]))

    const totals = new Map<string, { userId: string; username: string; totalWon: number; equipped_badge_1?: string | null; equipped_badge_2?: string | null }>()
    for (const row of data) {
      const userId = row.user_id as string
      const digger = diggerMap.get(userId)
      const current = totals.get(userId) || {
        userId,
        username: digger?.username || 'Anonyme',
        totalWon: 0,
        equipped_badge_1: digger?.equipped_badge_1 || null,
        equipped_badge_2: digger?.equipped_badge_2 || null,
      }
      current.totalWon += Number(row.amount || 0)
      totals.set(userId, current)
    }

    const ranking = Array.from(totals.values()).sort((a, b) => b.totalWon - a.totalWon)
    setTopParieurs(ranking.slice(0, 5))
    setTotalParieurs(ranking.length)

    const uid = currentUserId || user?.id || null
    if (!uid) {
      setMyRank(null)
      return
    }

    const index = ranking.findIndex((item) => item.userId === uid)
    setMyRank(index >= 0 ? index + 1 : null)
  }

  async function suggererPari() {
    if (!suggestion.trim()) return;
    if (!user) return alert("Connecte-toi pour proposer un pari !");

    try {
      const { data: profile } = await supabase
        .from('digger')
        .select('username')
        .eq('id', user.id)
        .single()

      const { error } = await supabase.from('paris_questions').insert([
        {
          question: suggestion,
          status: 'pending',
          description: `Suggéré par ${profile?.username || user.email}`
        }
      ]);

      if (!error) {
        alert("⚓ Ta proposition a été envoyée au capitaine !");
        setSuggestion("");
      } else {
        alert("Erreur lors de l'envoi.");
      }
    } catch (err) {
      console.error(err)
    }
  }

  const calculerCote = (mises: any[], choixVoulu: 'OUI' | 'NON') => {
    if (!mises || mises.length === 0) return "2.00"
    const totalGlobal = mises.reduce((acc, m) => acc + (Number(m.montant) || 0), 0)
    const totalChoix = mises.filter(m => m.choix === choixVoulu).reduce((acc, m) => acc + (Number(m.montant) || 0), 0)
    if (totalChoix === 0) return "2.00"
    const cote = totalGlobal / totalChoix
    return Math.max(1.1, cote).toFixed(2)
  }

  const handleParier = async (pariId: string, choix: 'OUI' | 'NON') => {
    if (isProcessing) return;
    if (!authReady) {
      return alert("Connexion en cours, réessaie une seconde...")
    }
    
    // Vérification de sécurité avec log
    if (!user) {
      console.log("Tentative de pari sans user détecté");
      return alert("Connecte-toi pour parier !");
    }

    const montant = Math.floor(Number(misesInput[pariId])); 

    if (isNaN(montant) || montant <= 0) {
      return alert("Mise un montant valide !");
    }

    setIsProcessing(true);

    try {
      const pari = questions.find((question) => question.id === pariId)
      if (!pari) {
        alert('Pari introuvable.')
        setIsProcessing(false)
        return
      }

      if (pari.status !== 'open' || isExpired(pari.deadline_at)) {
        alert('Ce pari est ferme. Recharge la page pour voir son etat.')
        await fetchParis()
        setIsProcessing(false)
        return
      }

      const currentBalance = await getUserBalance(user.id);
      
      if (montant > currentBalance) {
        alert(`💰 Pas assez de perles ! Solde: ${currentBalance}`);
        setIsProcessing(false);
        return;
      }

      // INSERTION : Le Trigger SQL s'occupe de points_history et digger.points
      const { error: miseError } = await supabase.from('paris_mises').insert([
        { pari_id: pariId, user_id: user.id, choix, montant }
      ]);

      if (miseError) {
        console.error("Erreur sur insertion pari:", miseError)
        alert(`Erreur pari: ${miseError.message} (${miseError.details || miseError.code})`)
        setIsProcessing(false)
        return
      }

      alert("🎰 Mise enregistrée !");
      
      // On récupère le nouveau solde mis à jour par le robot SQL
      const newBalance = await getUserBalance(user.id);
      setBalance(newBalance);
      
      setMisesInput(prev => ({ ...prev, [pariId]: "" }));
      await fetchParis();
      await fetchParisLeaderboard(user.id)
    } catch (err: any) {
      console.error("Erreur critique:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,194,88,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(30,198,166,0.12),_transparent_24%),linear-gradient(180deg,#04111f_0%,#02070d_52%,#000000_100%)] text-white pt-[150px] px-4 pb-20">
      <div className="max-w-[1480px] mx-auto">
        <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-[138px] self-start">
            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.04))] shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,196,86,0.22),rgba(24,163,141,0.18))] px-7 py-8">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-amber-100/70">Cabine des mises</p>
                <div className="mt-4 flex flex-col items-start gap-5">
                  <div className="relative h-28 w-28 overflow-hidden rounded-[28px] border border-amber-200/25 bg-white p-3 shadow-[0_24px_60px_rgba(240,185,77,0.24)] ring-1 ring-white/8 md:h-32 md:w-32">
                    <Image
                      src="/Badge Quetes/PMU des abysses/Proposé un paris (logo pmu)/1.svg"
                      alt="Badge PMU"
                      fill
                      className="object-contain p-3"
                    />
                  </div>
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-[-0.05em] text-white md:text-5xl">
                      Paris Diggers
                    </h1>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-amber-100/60">
                      Embleme officiel du PMU des abysses
                    </p>
                  </div>
                </div>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
                  Mise sur l'actu rap et multiplie tes perles.
                </p>
              </div>

              <div className="space-y-5 px-7 py-7">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Parieurs classes</p>
                    <p className="mt-2 text-3xl font-black text-amber-200">{totalParieurs}</p>
                  </div>
                  <div className="rounded-[24px] border border-emerald-300/14 bg-emerald-400/8 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/55">Ta position</p>
                    <p className="mt-2 text-3xl font-black text-emerald-200">{myRank ? `#${myRank}` : 'Non classe'}</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-black/25 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Ton Portefeuille</p>
                  <div className="mt-4 flex items-center gap-3 text-[2.4rem] font-black leading-none text-white">
                    <PointsPearl className="scale-[1.35] text-amber-200" size="lg" />
                    <span>{balance.toLocaleString('fr-FR')}</span>
                  </div>
                </div>

                <div className="rounded-[28px] border border-dashed border-white/18 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Une idee d'expedition ?</p>
                      <p className="mt-2 text-sm text-white/70">Propose le prochain pari a ouvrir dans la cale.</p>
                    </div>
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/80">
                      Suggestion
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={suggestion}
                      onChange={(e) => setSuggestion(e.target.value)}
                      placeholder="Ex: Jul va-t-il sortir un album demain ?"
                      className="min-h-[124px] w-full resize-none rounded-[22px] border border-white/10 bg-black/35 px-4 py-4 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-amber-300/50"
                    />
                    <button
                      onClick={suggererPari}
                      className="w-full rounded-[18px] bg-[linear-gradient(135deg,#f0b94d,#e88a1f)] px-6 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-[#1d1103] transition-transform hover:scale-[1.01]"
                    >
                      Proposer un pari
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Top gains</p>
                  <div className="mt-3 space-y-2">
                    {topParieurs.length === 0 ? (
                      <p className="text-sm text-white/45">Aucun gain enregistre pour l'instant.</p>
                    ) : (
                      topParieurs.slice(0, 3).map((p, index) => (
                        <div key={p.userId} className="flex items-center justify-between rounded-2xl border border-white/7 bg-black/20 px-3 py-3 text-sm">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/45">#{index + 1}</p>
                            <Link href={`/profil/${p.userId}`} className="inline-flex items-center gap-2 font-bold text-white/88 transition-colors hover:text-amber-200">
                              <span>@{p.username}</span>
                              <EquippedBadgesInline badgeIds={[p.equipped_badge_1, p.equipped_badge_2]} size="xs" />
                            </Link>
                          </div>
                          <p className="font-black text-amber-200">{p.totalWon.toLocaleString('fr-FR')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-[26px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-sm xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-100/55">Table des paris</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white md:text-[2rem]">Les mises ouvertes et resolues du moment</h2>
              </div>
              <p className="max-w-2xl text-sm leading-5 text-white/58 xl:text-right">
                A droite, chaque fiche affiche le createur du pari, les cotes en direct, l'intitule, la description quand elle existe et l'espace pour miser.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-100/55">Filtres</p>
                <p className="mt-1 text-sm text-white/55">Trie les paris par nouveaute, engagement en perles ou affluence.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => {
                  const isActive = sortMode === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSortMode(option.value)}
                      className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors ${
                        isActive
                          ? 'border-amber-300/30 bg-amber-300/12 text-amber-100'
                          : 'border-white/10 bg-black/20 text-white/55 hover:border-white/18 hover:text-white/85'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-white/12 bg-white/[0.03] px-8 py-14 text-center text-white/50">
                Aucun pari n'est disponible pour le moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sortedQuestions.map((q) => {
                  const coteOui = calculerCote(q.paris_mises, 'OUI')
                  const coteNon = calculerCote(q.paris_mises, 'NON')
                  const deadlinePassed = isExpired(q.deadline_at)
                  const isResolved = q.status !== 'open' || deadlinePassed
                  const creatorName = getPariCreator(q)
                  const description = getPariDescription(q)
                  const totalStake = getTotalStake(q)
                  const yesStake = q.paris_mises.filter((mise) => mise.choix === 'OUI').reduce((sum, mise) => sum + Number(mise.montant || 0), 0)
                  const noStake = q.paris_mises.filter((mise) => mise.choix === 'NON').reduce((sum, mise) => sum + Number(mise.montant || 0), 0)
                  const bettorCount = getBettorCount(q)

                  return (
                    <article
                      key={q.id}
                      className={`overflow-hidden rounded-[28px] border p-5 transition-all md:p-5 ${
                        isResolved
                          ? 'border-white/8 bg-black/25 opacity-75'
                          : 'border-amber-300/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] shadow-[0_20px_60px_rgba(0,0,0,0.28)]'
                      }`}
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/58">
                              Cree par {creatorName}
                            </span>
                            {formatCreationDate(q.created_at) && (
                              <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                                {formatCreationDate(q.created_at)}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 max-w-4xl text-xl font-black leading-tight text-white md:text-[1.55rem]">{q.question}</h3>
                          {description && <p className="mt-2 max-w-4xl text-sm leading-6 text-white/68">{description}</p>}
                        </div>

                        <div className="flex flex-wrap gap-2 xl:max-w-[260px] xl:justify-end">
                          <span className="rounded-full border border-white/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                            {q.status !== 'open' ? `Resolu: ${q.resultat}` : deadlinePassed ? 'Expire' : 'Ouvert'}
                          </span>
                          {q.deadline_at && (
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${deadlinePassed ? 'border-amber-300/18 bg-amber-300/8 text-amber-100/85' : 'border-emerald-300/18 bg-emerald-300/8 text-emerald-100/85'}`}>
                              Date limite {formatDeadline(q.deadline_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">Cote OUI</p>
                          <div className="mt-1 flex items-end justify-between gap-3">
                            <p className="text-2xl font-black text-emerald-200">x{coteOui}</p>
                            <p className="text-xs text-white/45">{yesStake.toLocaleString('fr-FR')} perles</p>
                          </div>
                        </div>
                        <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">Cote NON</p>
                          <div className="mt-1 flex items-end justify-between gap-3">
                            <p className="text-2xl font-black text-rose-200">x{coteNon}</p>
                            <p className="text-xs text-white/45">{noStake.toLocaleString('fr-FR')} perles</p>
                          </div>
                        </div>
                        <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">Pot actuel</p>
                          <div className="mt-1 flex items-center justify-between gap-3 text-2xl font-black text-amber-200">
                            <PointsPearl size="sm" className="text-amber-200" />
                            <span>{totalStake.toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-white/45">
                        <span>{bettorCount} parieur{bettorCount > 1 ? 's' : ''}</span>
                        <span>{q.paris_mises.length} mise{q.paris_mises.length > 1 ? 's' : ''} enregistree{q.paris_mises.length > 1 ? 's' : ''}</span>
                      </div>

                      {!isResolved ? (
                        <div className="mt-4 grid gap-3 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
                          <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-white/42">Ta Mise</label>
                            <input
                              type="number"
                              min="1"
                              value={misesInput[q.id] || ''}
                              onChange={(e) => setMisesInput({ ...misesInput, [q.id]: e.target.value })}
                              className="w-full rounded-[18px] border border-white/12 bg-black/45 px-4 py-3 text-xl font-black outline-none transition-colors focus:border-amber-300/50"
                            />
                          </div>
                          <button
                            onClick={() => handleParier(q.id, 'OUI')}
                            disabled={isProcessing || !authReady || !user}
                            className="rounded-[18px] border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(39,208,163,0.95),rgba(24,128,109,0.92))] px-5 py-4 text-left font-black text-[#04110e] transition-all hover:-translate-y-0.5 disabled:opacity-50"
                          >
                            <span className="block text-[11px] uppercase tracking-[0.22em] text-[#0a2a21]/70">Parier</span>
                            <span className="mt-1 block text-2xl">OUI x{coteOui}</span>
                          </button>
                          <button
                            onClick={() => handleParier(q.id, 'NON')}
                            disabled={isProcessing || !authReady || !user}
                            className="rounded-[18px] border border-rose-300/16 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(168,35,74,0.3))] px-5 py-4 text-left font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                          >
                            <span className="block text-[11px] uppercase tracking-[0.22em] text-white/55">Parier</span>
                            <span className="mt-1 block text-2xl">NON x{coteNon}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-[18px] border border-white/8 bg-black/18 px-4 py-3 text-center text-sm italic text-white/50">
                          Ce pari est termine.
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
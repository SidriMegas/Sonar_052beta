"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import EquippedBadgesInline from './components/EquippedBadgesInline'
import MusiqueRankingTable from './components/MusiqueRankingTable'
import PointsPearl from './components/PointsPearl'

type HomeTopDigger = {
  id: string
  username: string | null
  equipped_badge_1?: string | null
  equipped_badge_2?: string | null
  points: number | null
}

const formatSupabaseError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { code?: unknown; details?: unknown; hint?: unknown; message?: unknown }
    return {
      message: typeof candidate.message === 'string' ? candidate.message : '',
      code: typeof candidate.code === 'string' ? candidate.code : '',
      details: typeof candidate.details === 'string' ? candidate.details : '',
      hint: typeof candidate.hint === 'string' ? candidate.hint : '',
    }
  }
  return { message: String(error) }
}

const isMissingBadgeColumnError = (error: unknown) => {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string' ? (error as { message: string }).message : ''
  const normalized = message.toLowerCase()
  return normalized.includes('equipped_badge_1') || normalized.includes('equipped_badge_2')
}

export default function Home() {
  const [showRules, setShowRules] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [topDiggers, setTopDiggers] = useState<HomeTopDigger[]>([])

  // 🔄 INITIALISATION
  useEffect(() => {
    const init = async () => {
      fetchHomeTopLists()

      if (typeof window !== 'undefined' && !sessionStorage.getItem('scanner:warmed')) {
        sessionStorage.setItem('scanner:warmed', '1')
        const warmScanner = () => {
          fetch('/api/scanner').catch(() => console.log("Le robot dort encore..."))
        }

        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(warmScanner, { timeout: 2500 })
        } else {
          globalThis.setTimeout(warmScanner, 1200)
        }
      }

      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)
      } catch (e) {}
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchHomeTopLists = async () => {
    try {
      const runTopDiggersQuery = (selectFields: string) => supabase
        .from('digger')
        .select(selectFields)
        .order('points', { ascending: false })
        .limit(5)
        .returns<HomeTopDigger[]>()

      let { data, error } = await runTopDiggersQuery('id, username, points, equipped_badge_1, equipped_badge_2')

      if (error && isMissingBadgeColumnError(error)) {
        console.warn('Colonnes badges non disponibles sur public.digger, fallback home sans badges equipes.')
        const fallbackResult = await runTopDiggersQuery('id, username, points')
        data = fallbackResult.data
        error = fallbackResult.error
      }

      if (!error) {
        setTopDiggers(data || [])
      }
    } catch (err) {
      console.error('Erreur chargement home:', formatSupabaseError(err))
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#001524] via-[#000814] to-black text-white font-sans">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-4%] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-[26rem] w-[26rem] rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute left-[12%] top-[16%] h-6 w-6 rounded-full border border-cyan-100/20 bg-cyan-100/10" />
        <div className="absolute left-[18%] top-[34%] h-3 w-3 rounded-full border border-white/10 bg-white/8" />
        <div className="absolute right-[14%] top-[24%] h-5 w-5 rounded-full border border-lime-200/20 bg-lime-200/10" />
        <div className="absolute right-[20%] top-[46%] h-3.5 w-3.5 rounded-full border border-white/10 bg-white/8" />
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_65%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[34rem] bg-[linear-gradient(to_top,rgba(0,0,0,0.95),rgba(0,8,20,0.72),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1820px] px-2 pb-12 pt-4 sm:px-4 lg:px-5 xl:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-4 xl:gap-6">
        
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* COLONNE GAUCHE - CONCEPT SONAR */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex flex-col gap-6 opacity-90 lg:mt-6 lg:w-[26%] xl:w-[24%] lg:-ml-8 xl:-ml-12">
          {showRules ? (
            <div className="sticky top-10 overflow-hidden rounded-[30px] border border-lime-400/18 bg-[linear-gradient(180deg,rgba(2,14,8,0.72),rgba(2,8,8,0.86))] p-6 shadow-[0_0_24px_rgba(163,230,53,0.08)]">
              <div className="absolute right-[-10%] top-[-8%] h-32 w-32 rounded-full bg-lime-400/10 blur-3xl" />
              <button onClick={() => setShowRules(false)} className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-lime-200">fermer les regles</button>
              <div className="relative z-10 space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-lime-200/55">Regles Sonar</p>
                  <h2 className="mt-3 font-black text-lime-300 uppercase italic text-2xl">Concept Sonar</h2>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-lime-100/74">On plonge chercher les pepites du fond, on suit les bulles, puis on laisse remonter le signal.</p>
                <div className="space-y-3">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-200/52">Sonar</p>
                    <p className="mt-2 text-[11px] font-bold uppercase text-white/78">Les morceaux qui cumulent le plus de perles passent en premiere lecture.</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-200/52">Bulles</p>
                    <p className="mt-2 text-[11px] font-bold uppercase text-white/78">L interface reste fluide, lisible et plus unifiee.</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.26em] text-cyan-200/52">Baleine</p>
                    <p className="mt-2 text-[11px] font-bold uppercase text-white/78">Le fond guide la page sans prendre la place du tableau.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowRules(true)} className="rounded-[24px] border border-lime-400/22 bg-black/20 px-5 py-3 text-[10px] text-lime-200/72 uppercase font-black tracking-[0.24em] text-left hover:bg-lime-400/10 transition-colors">
              activer le sonar
            </button>
          )}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* COLONNE CENTRE - TABLEAU DES PÉPITES */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="mb-20 h-fit lg:w-[48%] xl:w-[52%]">
          <div className="bg-transparent px-2 py-5 sm:px-3 lg:px-2">
            <div className="mb-0 flex flex-wrap items-end justify-between gap-4 rounded-t-[28px] border border-b-0 border-lime-400/20 bg-black px-4 py-4 sm:px-5 shadow-[0_0_24px_rgba(0,0,0,0.28)]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.38em] text-cyan-200/45">Radar principal</p>
                <h2 className="mt-2 text-2xl font-black uppercase italic text-white">📡 TOP RADAR</h2>
              </div>
            </div>
            <MusiqueRankingTable variant="home" />
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* COLONNE DROITE - TOP 5 DYNAMIQUE */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex flex-col gap-6 opacity-90 lg:mt-6 lg:w-[26%] xl:w-[24%] lg:-mr-8 xl:-mr-12">
          <div className="sticky top-10 overflow-hidden rounded-[30px] border border-lime-400/30 bg-black/92 p-6 shadow-[0_0_24px_rgba(163,230,53,0.1)]">
            <div className="absolute left-[-10%] bottom-[-10%] h-32 w-32 rounded-full bg-lime-400/10 blur-3xl" />
            <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-bold text-[10px] uppercase text-lime-200/80 tracking-[0.3em]">
                Top Digger
              </h3>
              <Link
                href="/classement/prod"
                className="rounded-full border border-lime-400/55 bg-lime-400/12 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-lime-200 transition-all hover:bg-lime-400 hover:text-black"
              >
                Voir les prods
              </Link>
            </div>
            
            <div className="flex flex-col gap-3">
              {topDiggers.map((item, index) => (
                <div key={item.id} className="group flex items-center justify-between gap-3 rounded-[24px] border border-lime-400/25 bg-black/70 p-3 transition-all hover:border-lime-300/50">
                  <div className="flex min-w-0 items-center gap-3 truncate">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lime-400/30 bg-lime-400/10 text-[11px] font-black text-lime-100">
                      {index === 0 ? '01' : index === 1 ? '02' : index === 2 ? '03' : `0${index + 1}`.slice(-2)}
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      <Link
                        href={`/profil/${item.id}`}
                        className="truncate text-[10px] font-bold uppercase tracking-[0.16em] group-hover:text-lime-200"
                      >
                        @{item.username || 'Anonyme'}
                      </Link>
                      <EquippedBadgesInline badgeIds={[item.equipped_badge_1, item.equipped_badge_2]} size="xs" />
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 text-[10px] font-mono font-bold text-lime-100">
                    <PointsPearl size="sm" /> {Math.round(Number(item.points || 0))}
                  </span>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* FOND MARIN */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-full h-[400px] mt-12 relative overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute bottom-0 w-full h-[200px] bg-[#121212] shadow-[0_-50px_100px_rgba(0,0,0,0.9)]" 
          style={{ borderRadius: '100% 100% 0 0 / 20% 20% 0 0' }}></div>
        <p className="relative z-10 text-gray-600 text-[10px] uppercase tracking-[0.5em] font-black">Fond des Abysses atteint</p>
        <div className="relative z-10 w-px h-20 bg-gradient-to-b from-blue-500/50 to-transparent mt-4"></div>
      </div>

    </div>
  )
}
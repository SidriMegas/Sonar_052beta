'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getDailyLoginRewards, getDailyLoginState, type DailyLoginReward } from '@/lib/daily-login'

interface DailyState {
  streak_day: number
  current_day: number
  claimed_today: boolean
  claims: Array<{ day_number: number; claim_date: string }>
}

export default function ProfilCalendrierPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rewards, setRewards] = useState<DailyLoginReward[]>([])
  const [state, setState] = useState<DailyState>({
    streak_day: 0,
    current_day: 1,
    claimed_today: false,
    claims: [],
  })

  useEffect(() => {
    let isMounted = true

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/auth')
        return
      }

      const [rewardsRes, stateRes] = await Promise.all([
        getDailyLoginRewards(),
        getDailyLoginState(session.user.id),
      ])

      if (!isMounted) {
        return
      }

      if (rewardsRes.error) {
        setError(rewardsRes.error.message)
      }

      if (stateRes.error || !stateRes.data?.success) {
        setError(stateRes.data?.error || stateRes.error?.message || 'Impossible de charger l etat du calendrier.')
      }

      setRewards(rewardsRes.data || [])
      setState({
        streak_day: stateRes.data?.streak_day || 0,
        current_day: stateRes.data?.current_day || 1,
        claimed_today: Boolean(stateRes.data?.claimed_today),
        claims: (stateRes.data?.claims || []).map((item) => ({
          day_number: item.day_number,
          claim_date: item.claim_date,
        })),
      })

      setLoading(false)
    }

    load()

    return () => {
      isMounted = false
    }
  }, [router])

  const claimedMap = useMemo(() => {
    const set = new Set<number>()
    for (const claim of state.claims) {
      set.add(claim.day_number)
    }
    return set
  }, [state.claims])

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Chargement calendrier...</div>
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#00131b] via-[#000b13] to-black text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">Calendrier 14 Jours</h1>
            <p className="text-sm text-cyan-200/80 mt-2">Ton cycle de connexion quotidien</p>
          </div>
          <Link href="/profil" className="px-4 py-2 rounded-full border border-cyan-300/40 text-cyan-200 hover:bg-cyan-400/10 text-sm font-bold uppercase">
            Retour profil
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-900/20 p-4">
            <p className="text-xs uppercase tracking-widest text-cyan-200/70">Serie active</p>
            <p className="text-3xl font-black text-cyan-200 mt-2">{state.streak_day} / 14</p>
          </div>
          <div className="rounded-2xl border border-blue-400/30 bg-blue-900/20 p-4">
            <p className="text-xs uppercase tracking-widest text-blue-200/70">Jour actuel</p>
            <p className="text-3xl font-black text-blue-200 mt-2">{state.current_day}</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-900/20 p-4">
            <p className="text-xs uppercase tracking-widest text-emerald-200/70">Claim aujourd hui</p>
            <p className="text-3xl font-black text-emerald-200 mt-2">{state.claimed_today ? 'Oui' : 'Non'}</p>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-red-300 text-sm">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rewards.map((reward) => {
            const claimed = claimedMap.has(reward.day_number)
            const isCurrent = reward.day_number === state.current_day
            return (
              <article
                key={reward.day_number}
                className={`relative rounded-2xl border p-4 transition-all ${
                  claimed
                    ? 'border-emerald-400/50 bg-emerald-900/20'
                    : isCurrent
                      ? 'border-cyan-300/60 bg-cyan-900/20 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
                      : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-300">Jour {reward.day_number}</span>
                  <span className={`text-xs font-bold ${claimed ? 'text-emerald-300' : isCurrent ? 'text-cyan-300' : 'text-gray-500'}`}>
                    {claimed ? 'Valide' : isCurrent ? 'Actuel' : 'A venir'}
                  </span>
                </div>
                <h2 className="font-black text-base mb-2">{reward.reward_label}</h2>
                <p className="text-sm text-cyan-100/80">+{reward.reward_points} perles</p>
                {reward.badge_id ? (
                  <p className="text-xs text-blue-200 mt-2">Badge: {reward.badge_id}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </main>
  )
}

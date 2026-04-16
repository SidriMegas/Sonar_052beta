"use client"
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { getRoleForEmail } from '@/lib/admin'

export default function ConnexionPage() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const handledOauthUserRef = useRef<string | null>(null)
  const router = useRouter()

  // --- LE CERVEAU DU ROBOT : DETECTION DU RETOUR OAUTH ---
  useEffect(() => {
    const checkUser = async () => {
      if (!user || handledOauthUserRef.current === user.id) return

      const provider = user.app_metadata?.provider

      if (provider === 'google' || provider === 'twitch') {
        handledOauthUserRef.current = user.id
        setLoading(true)
        setMessage("⚡ SYNC DE LA CHAÎNE EN COURS...")

        const updates: Record<string, string> = {}

        const nextRole = getRoleForEmail(user.email, provider === 'google' ? 'artiste' : 'digger')

        if (provider === 'google') {
          updates.youtube_id = user.identities?.find(id => id.provider === 'google')?.id || ''
          updates.role = nextRole

          try {
            const { data: { session: freshSession } } = await supabase.auth.getSession()
            const accessToken = freshSession?.provider_token

            if (accessToken) {
              const ytRes = await fetch(
                'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                  }
                }
              )

              if (ytRes.ok) {
                const ytData = await ytRes.json()
                if (ytData.items && ytData.items[0]) {
                  updates.youtube_channel_id = ytData.items[0].id
                  console.log("✅ Channel ID récupéré:", updates.youtube_channel_id)
                }
              }
            }
          } catch (err) {
            console.error("Erreur API YouTube:", err)
          }
        }

        if (provider === 'twitch') {
          updates.twitch_id = user.identities?.find(id => id.provider === 'twitch')?.id || ''
          updates.twitch_username = user.user_metadata?.full_name || user.user_metadata?.name || ''
          updates.role = nextRole
        }

        const { error } = await supabase
          .from('digger')
          .upsert({ 
            id: user.id, 
            email: user.email,
            username: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || `user_${user.id.slice(0,5)}`,
            ...updates 
          })

        if (!error) {
          setMessage("✅ COMPTE SYNCHRONISÉ ! Redirection...")
          setTimeout(() => {
              router.push('/profil')
              router.refresh()
          }, 1500)
        } else {
          handledOauthUserRef.current = null
          console.error("Erreur SQL:", error.message)
          setMessage(`❌ Erreur Base de données : ${error.message}`)
          setLoading(false)
        }
      }
    }
    checkUser()
  }, [router, user])

  // --- FONCTIONS DE CONNEXION RESEAUX ---
  const handleSocialLogin = async (provider: 'google' | 'twitch') => {
    setLoading(true)
    handledOauthUserRef.current = null
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: provider === 'google' ? 'https://www.googleapis.com/auth/youtube.readonly' : '',
        // FIX : On utilise window.location.origin pour éviter de boucler sur des paramètres d'URL
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth`, 
      }
    })
    if (error) {
      setMessage(`❌ ${error.message}`)
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(`❌ ${error.message}`)
      setLoading(false)
    } else {
      setMessage("✅ CONNEXION RÉUSSIE ! Redirection...")
      setTimeout(() => {
        router.push('/profil')
        router.refresh()
      }, 1500)
    }
  }

  const isBusy = loading || authLoading

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#08324a_0%,#02111b_38%,#000_72%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-16 h-44 w-44 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute right-8 top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute left-1/4 top-1/3 h-3 w-3 rounded-full bg-white/40 shadow-[0_0_14px_rgba(255,255,255,0.45)]" />
        <div className="absolute left-[18%] top-[58%] h-2 w-2 rounded-full bg-lime-300/40 shadow-[0_0_12px_rgba(163,230,53,0.4)]" />
        <div className="absolute right-[22%] top-[42%] h-4 w-4 rounded-full bg-cyan-200/25 shadow-[0_0_16px_rgba(103,232,249,0.25)]" />
        <div className="absolute right-[12%] top-[68%] h-2.5 w-2.5 rounded-full bg-white/30 shadow-[0_0_12px_rgba(255,255,255,0.3)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-20">
        <div className="w-full max-w-3xl">
          <section className="relative overflow-hidden rounded-[36px] border border-lime-400/25 bg-white/5 p-8 shadow-[0_0_50px_rgba(163,230,53,0.08)] backdrop-blur-xl md:p-10">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(120,255,214,0.08),rgba(0,0,0,0))]" />
            <div className="relative z-10">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.45em] text-lime-300/70">Vitre d'aquarium</p>
              <h1 className="max-w-xl text-4xl font-black uppercase italic leading-none text-white md:text-6xl">Entrer Dans Le Cycle</h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-cyan-50/72 md:text-base">
                Connecte ton compte dans une interface plus proche du sonar : noir profond, reflets marins, lueurs neon et verre aquarium.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => handleSocialLogin('google')}
                  disabled={isBusy}
                  className="group relative overflow-hidden rounded-[26px] border border-red-500/60 bg-[linear-gradient(180deg,rgba(255,0,0,0.18),rgba(10,10,10,0.8))] p-5 text-left transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%)]" />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.34em] text-red-200/80">YouTube</p>
                      <p className="mt-3 text-lg font-black uppercase text-white">{isBusy ? 'Verification...' : 'Lier Ma Chaine YouTube'}</p>
                      <p className="mt-2 text-xs text-red-100/70">Connexion artiste et verification de la chaine.</p>
                    </div>
                    <span className="rounded-full border border-red-300/40 bg-black/20 px-3 py-1 text-[10px] font-black uppercase text-red-100">LIVE</span>
                  </div>
                </button>

                <button
                  onClick={() => handleSocialLogin('twitch')}
                  disabled={isBusy}
                  className="group relative overflow-hidden rounded-[26px] border border-violet-400/60 bg-[linear-gradient(180deg,rgba(145,70,255,0.22),rgba(8,5,16,0.85))] p-5 text-left transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_35%)]" />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.34em] text-violet-100/85">Twitch</p>
                      <p className="mt-3 text-lg font-black uppercase text-white">{isBusy ? 'Verification...' : 'Lier Mon Compte Twitch'}</p>
                      <p className="mt-2 text-xs text-violet-100/70">Raccroche ton profil streaming au sonar.</p>
                    </div>
                    <span className="rounded-full border border-violet-200/35 bg-black/20 px-3 py-1 text-[10px] font-black uppercase text-violet-100">SYNC</span>
                  </div>
                </button>
              </div>

              <div className="mt-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/45">
                <span className="h-px flex-1 bg-lime-400/20" />
                <span>Ou Via Email</span>
                <span className="h-px flex-1 bg-lime-400/20" />
              </div>

              <form onSubmit={handleLogin} className="mt-8 grid gap-5">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/55">Email</label>
                  <input
                    type="email"
                    placeholder="ton@email.com"
                    className="w-full rounded-2xl border border-lime-400/20 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-lime-400/55"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/55">Mot De Passe</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-lime-400/20 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-lime-400/55"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-2xl border border-lime-300/45 bg-lime-400/90 px-5 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? 'Verification...' : 'Se Connecter'}
                </button>
              </form>

              {message && (
                <p className={`mt-6 rounded-2xl border px-4 py-3 text-center text-sm ${message.includes('❌') ? 'border-red-500/35 bg-red-500/10 text-red-200' : 'border-lime-400/35 bg-lime-400/10 text-lime-200'}`}>
                  {message}
                </p>
              )}

              <Link href="/inscription" className="mt-7 block text-center text-sm text-cyan-100/60 transition hover:text-white">
                Pas encore de compte ? <span className="font-black uppercase text-lime-300">S'inscrire</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
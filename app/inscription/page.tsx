"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getRoleForEmail } from '@/lib/admin'

const FAVORITE_GENRES = [
  'Rap',
  'Hip-Hop',
  'Electro',
  'House',
  'Afro',
  'R&B',
  'Pop',
  'Rock',
  'Jazz',
  'Soul',
  'Techno',
  'Indie'
]

export default function InscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [favoriteGenre, setFavoriteGenre] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const syncNewUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const user = session.user
        const provider = user.app_metadata.provider

        if (provider === 'google') {
          setLoading(true)
          setMessage("⚡ SYNCHRONISATION DU PROFIL...")

          let youtubeChannelId = null;

          // 1. On récupère le "vrai" ID YouTube (UC...) via l'API Google
          if (session.provider_token) {
            try {
              const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
                headers: { Authorization: `Bearer ${session.provider_token}` }
              });
              const ytData = await res.json();
              if (ytData.items && ytData.items[0]) {
                youtubeChannelId = ytData.items[0].id; 
              }
            } catch (err) {
              console.error("Erreur API YouTube:", err);
            }
          }

          // 2. Préparation des données pour Supabase
          const finalGoogleId = user.identities?.find(id => id.provider === 'google')?.id;
          
          const nextRole = getRoleForEmail(user.email, 'artiste')

          const { error } = await supabase
            .from('digger')
            .upsert({ 
              id: user.id, 
              email: user.email,
              username: user.user_metadata.full_name || user.email?.split('@')[0],
              youtube_id: finalGoogleId,        // L'ID Google (numérique)
              youtube_channel_id: youtubeChannelId, // LE PONT (UC...) 🔥
              role: nextRole
            })

          if (!error) {
            setMessage("✅ PROFIL SYNCHRONISÉ ! Redirection...")
            setTimeout(() => {
                router.push('/profil')
                router.refresh()
            }, 1500)
          } else {
            console.error("Erreur SQL:", error.message)
            setMessage(`❌ Erreur Base de données : ${error.message}`)
            setLoading(false)
          }
        }
      }
    }
    syncNewUser()
  }, [router])

  const handleSocialSignUp = async (provider: 'google' | 'twitch') => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        scopes: provider === 'google' ? 'https://www.googleapis.com/auth/youtube.readonly' : '',
        redirectTo: `${window.location.origin}/inscription`, 
      }
    })
    if (error) {
      setMessage(`❌ ${error.message}`)
      setLoading(false)
    }
  }

  const handleDiggerSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!acceptedTerms) {
      setMessage("❌ Tu dois accepter les conditions d'utilisation.")
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const normalizedUsername = username.trim()
      const normalizedEmail = email.trim().toLowerCase()

      const { data: existingUsername } = await supabase
        .from('digger')
        .select('id')
        .ilike('username', normalizedUsername)
        .limit(1)

      if (existingUsername && existingUsername.length > 0) {
        setMessage('❌ Ce pseudo est deja utilise.')
        setLoading(false)
        return
      }

      const { data: existingEmail } = await supabase
        .from('digger')
        .select('id')
        .eq('email', normalizedEmail)
        .limit(1)

      if (existingEmail && existingEmail.length > 0) {
        setMessage('❌ Cet email est deja utilise.')
        setLoading(false)
        return
      }

      const nextRole = getRoleForEmail(normalizedEmail, 'digger')

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth`,
          data: {
            username: normalizedUsername,
            favorite_genre: favoriteGenre,
            accepted_terms: true,
            role: nextRole
          }
        }
      })

      if (error) {
        setMessage(`❌ ${error.message}`)
        setLoading(false)
        return
      }

      const authUser = data.user

      if (authUser) {
        const fullPayload = {
          id: authUser.id,
          email: normalizedEmail,
          username: normalizedUsername,
          role: nextRole,
          genre_favori: favoriteGenre,
          favorite_genre: favoriteGenre,
          accepted_terms: true
        }

        let { error: profileError } = await supabase.from('digger').upsert(fullPayload as any)

        if (profileError && /column .* does not exist/i.test(profileError.message)) {
          const fallbackPayload = {
            id: authUser.id,
            email: normalizedEmail,
            username: normalizedUsername,
            role: nextRole
          }
          const retry = await supabase.from('digger').upsert(fallbackPayload as any)
          profileError = retry.error || null
        }

        if (profileError) {
          setMessage(`❌ ${profileError.message}`)
          setLoading(false)
          return
        }
      }

      setMessage('✅ Inscription creee. Verifie ton email puis connecte-toi.')
      setUsername('')
      setEmail('')
      setPassword('')
      setFavoriteGenre('')
      setAcceptedTerms(false)
    } catch (error) {
      setMessage('❌ Impossible de finaliser l inscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#08324a_0%,#02111b_38%,#000_72%)] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-16 h-44 w-44 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute right-8 top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute left-1/4 top-1/3 h-3 w-3 rounded-full bg-white/40 shadow-[0_0_14px_rgba(255,255,255,0.45)]" />
        <div className="absolute left-[18%] top-[58%] h-2 w-2 rounded-full bg-lime-300/40 shadow-[0_0_12px_rgba(163,230,53,0.4)]" />
        <div className="absolute right-[22%] top-[42%] h-4 w-4 rounded-full bg-cyan-200/25 shadow-[0_0_16px_rgba(103,232,249,0.25)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-20">
        <section className="relative w-full max-w-3xl overflow-hidden rounded-[36px] border border-lime-400/25 bg-black/35 p-8 shadow-[0_0_50px_rgba(163,230,53,0.08)] backdrop-blur-xl md:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(120,255,214,0.08),rgba(0,0,0,0))]" />
          <div className="relative z-10">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.45em] text-lime-300/70">Inscription Sonar</p>
            <h1 className="max-w-2xl text-4xl font-black uppercase italic leading-none text-white md:text-6xl">Entrer Dans Le Cycle</h1>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-cyan-50/72 md:text-base">
              Les artistes passent par YouTube. Les diggers peuvent s'inscrire juste en dessous avec un profil complet.
            </p>

            <div className="mt-8 rounded-[28px] border border-red-500/35 bg-[linear-gradient(180deg,rgba(255,0,0,0.16),rgba(10,10,10,0.78))] p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.34em] text-red-200/80">Artistes</p>
                  <h2 className="mt-2 text-2xl font-black uppercase text-white">Connexion YouTube</h2>
                  <p className="mt-2 max-w-lg text-sm text-red-100/70">Verification de la chaine et creation automatique du profil artiste.</p>
                </div>
                <button
                  onClick={() => handleSocialSignUp('google')}
                  disabled={loading}
                  className="rounded-2xl border border-red-400/45 bg-black/20 px-5 py-4 text-[11px] font-black uppercase tracking-[0.26em] text-red-100 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Connexion...' : 'Lier Ma Chaine YouTube'}
                </button>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/45">
              <span className="h-px flex-1 bg-lime-400/20" />
              <span>Inscription Digger</span>
              <span className="h-px flex-1 bg-lime-400/20" />
            </div>

            <form onSubmit={handleDiggerSignUp} className="mt-8 grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/55">Pseudo Unique</label>
                  <input
                    type="text"
                    placeholder="ton pseudo"
                    className="w-full rounded-2xl border border-lime-400/20 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-lime-400/55"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/55">Mail Unique</label>
                  <input
                    type="email"
                    placeholder="ton@email.com"
                    className="w-full rounded-2xl border border-lime-400/20 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-lime-400/55"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-[1fr_0.9fr]">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/55">Mot De Passe</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-lime-400/20 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-lime-400/55"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.28em] text-cyan-50/55">Genre Favori</label>
                  <select
                    className="w-full rounded-2xl border border-lime-400/20 bg-black/25 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-lime-400/55"
                    value={favoriteGenre}
                    onChange={(e) => setFavoriteGenre(e.target.value)}
                    required
                  >
                    <option value="" className="bg-black">Choisir</option>
                    {FAVORITE_GENRES.map((genre) => (
                      <option key={genre} value={genre} className="bg-black">{genre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-lime-400/15 bg-black/20 px-4 py-4 text-sm text-cyan-50/72">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-lime-400/40 bg-black"
                />
                <span>J'accepte les conditions d'utilisation.</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl border border-lime-300/45 bg-lime-400/90 px-5 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Verification...' : 'Creer Mon Compte Digger'}
              </button>
            </form>

            {message && (
              <p className={`mt-6 rounded-2xl border px-4 py-3 text-center text-sm ${message.includes('❌') ? 'border-red-500/35 bg-red-500/10 text-red-200' : 'border-lime-400/35 bg-lime-400/10 text-lime-200'}`}>
                {message}
              </p>
            )}

            <Link href="/auth" className="mt-7 block text-center text-sm text-cyan-100/60 transition hover:text-white">
              Deja un compte ? <span className="font-black uppercase text-lime-300">Se connecter</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
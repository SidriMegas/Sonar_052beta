/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 📡 SONAR 0.52 - NAVBAR / NAVIGATION PRINCIPALE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 📂 Location: /app/components/Navbar.tsx
 * * ✨ Fonctionnalités:
 * - Navigation desktop/mobile responsive
 * - Barre de recherche temps réel (titres + diggers)
 * - Découverte aléatoire avec modal immersive
 * - Menu utilisateur avec avatar
 * - Dropdown menus pour toutes les sections
 * - 🔔 Notifications en temps réel
 * - ✅ Sécurité: Variables d'environnement
 * - ✅ Optimisation: State management
 * - ✅ Accessibilité: Gestion des clics extérieurs
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

"use client"
import { useEffect, useEffectEvent, useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Likesbutton from './likesbutton'
import PointsPearl from './PointsPearl'
import EquippedBadgesInline from './EquippedBadgesInline'
import { supabase } from '@/lib/supabase'
import { getUserBalance } from '@/lib/points'
import { getTrackEmbedId } from '@/lib/youtube'

const NotificationsPanel = dynamic(() => import('./NotificationsPanel'), { ssr: false })
const QuestQuickPanel = dynamic(() => import('./QuestQuickPanel'), { ssr: false })

type NavbarProfile = {
  avatar_url: string | null
  role: string | null
}

type NavbarTrack = {
  id: string
  user_id: string | null
  nom_titre: string | null
  nom_artiste: string | null
  description?: string | null
  youtube_url?: string | null
  likes?: number | null
  vues_actuelles?: number | null
  points?: number | null
  digger?: {
    id?: string | null
    username?: string | null
    equipped_badge_1?: string | null
    equipped_badge_2?: string | null
  } | null
}

type SearchResultsState = {
  titres: Array<{
    id: string
    nom_titre: string | null
    nom_artiste: string | null
    created_at: string | null
    type_partage: string | null
  }>
  diggers: Array<{
    id: string
    username: string | null
    equipped_badge_1?: string | null
    equipped_badge_2?: string | null
  }>
}

type RawNavbarTrack = Omit<NavbarTrack, 'digger'> & {
  digger?: NavbarTrack['digger'] | Array<NonNullable<NavbarTrack['digger']>>
}

const NAVBAR_TRACK_SELECT_FULL = 'id, user_id, nom_titre, nom_artiste, description, youtube_url, likes, vues_actuelles, points, digger:user_id(id, username, equipped_badge_1, equipped_badge_2)'
const NAVBAR_TRACK_SELECT_NO_DESCRIPTION = 'id, user_id, nom_titre, nom_artiste, youtube_url, likes, vues_actuelles, points, digger:user_id(id, username, equipped_badge_1, equipped_badge_2)'
const NAVBAR_TRACK_SELECT_LEGACY = 'id, user_id, nom_titre, nom_artiste, youtube_url, likes, vues_actuelles, points, digger:user_id(id, username)'
const NAVBAR_DIGGER_SELECT_WITH_BADGES = 'id, username, equipped_badge_1, equipped_badge_2'
const NAVBAR_DIGGER_SELECT_LEGACY = 'id, username'

const normalizeNavbarTrack = (track: RawNavbarTrack): NavbarTrack => ({
  ...track,
  description: track.description ?? null,
  digger: Array.isArray(track.digger) ? track.digger[0] || null : track.digger || null,
})

const getSupabaseErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : ''
  }
  return ''
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

const isMissingColumnError = (error: unknown, column: string) => getSupabaseErrorMessage(error).toLowerCase().includes(column.toLowerCase())

export default function Navbar() {
  const NAV_SCALE = 1.2
  const BASE_NAV_HEIGHT = 180
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<NavbarProfile | null>(null)
  const [balance, setBalance] = useState(0)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSommaireOpen, setIsSommaireOpen] = useState(false)
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const searchRequestRef = useRef(0)

  // États recherche
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResultsState>({ titres: [], diggers: [] })
  const [showResults, setShowResults] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // États découverte aléatoire
  const [randomTrack, setRandomTrack] = useState<NavbarTrack | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [history, setHistory] = useState<NavbarTrack[]>([])
  const [diggerName, setDiggerName] = useState<string>("")
  const [allTracks, setAllTracks] = useState<NavbarTrack[]>([])
  const [isLoadingRandom, setIsLoadingRandom] = useState(false)

  const HAUTEUR_BARRE_NOIRE = `${BASE_NAV_HEIGHT * NAV_SCALE}px`
  const LOGO_TAILLE = 200
  const LOGO_HAUTEUR = 63
  const arenaLinks = [
    { href: '/jeux/tlmvpsp', label: '👑 LE TRONE DES ABYSSES' },
      { href: '/jeux/paris', label: '🐎 LE PMU DES ABYSSES' },
    { href: '/jeux/playlistoartager', label: '🎵 PLAYLIST DEMOCRATIQUE' },
    { href: '/jeux/vue', label: '🎮 JEU DES VUES' },
    { href: '/jeux/guerredesondes', label: '📡 GUERRE DES ONDES' },
    { href: '/jeux/bottles', label: '🍾 BOUTEILLE A LA MER' },
    { href: '/jeux/coffrefort', label: '🔐 COFFRE FORT' },
    { href: '/feedback', label: '✍️ FEEDBACK' }
  ]

  const loadAllTracks = async () => {
    try {
      const runTrackQuery = (selectFields: string) => supabase
        .from('titre')
        .select(selectFields)
        .not('type_partage', 'eq', 'production')
        .gt('vues_actuelles', 0)
        .returns<RawNavbarTrack[]>()

      let { data, error } = await runTrackQuery(NAVBAR_TRACK_SELECT_FULL)

      if (error && isMissingColumnError(error, 'description')) {
        console.warn('Colonne description absente sur public.titre, fallback navbar sans description.')
        const fallbackResult = await runTrackQuery(NAVBAR_TRACK_SELECT_NO_DESCRIPTION)
        data = fallbackResult.data
        error = fallbackResult.error
      }

      if (error && (isMissingColumnError(error, 'equipped_badge_1') || isMissingColumnError(error, 'equipped_badge_2'))) {
        console.warn('Colonnes badges non disponibles sur public.digger, fallback navbar sans badges equipes.')
        const fallbackResult = await runTrackQuery(NAVBAR_TRACK_SELECT_LEGACY)
        data = fallbackResult.data
        error = fallbackResult.error
      }

      if (error) {
        throw error
      }

      if (data) {
        const nextTracks = data.map(normalizeNavbarTrack)
        setAllTracks(nextTracks)
        return nextTracks
      }
    } catch (err) {
      console.error("Erreur chargement musiques:", formatSupabaseError(err))
    }

    return []
  }

  const loadUserContext = async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null)
      setBalance(0)
      return
    }

    try {
      const [{ data: diggerProfile }, nextBalance] = await Promise.all([
        supabase
          .from('digger')
          .select('avatar_url, role')
          .eq('id', nextUser.id)
          .single(),
        getUserBalance(nextUser.id),
      ])

      setProfile((diggerProfile || null) as NavbarProfile | null)
      setBalance(Number(nextBalance) || 0)
    } catch (err) {
      console.error('Erreur chargement contexte navbar:', err)
      setProfile(null)
      setBalance(0)
    }
  }

  const closeSearchResults = () => {
    setSearchResults({ titres: [], diggers: [] })
    setShowResults(false)
    setSearchLoading(false)
  }

  // 🔄 INITIALISATION & LISTENERS
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
        await loadUserContext(session?.user || null)
      } catch (err) {
        console.error("Erreur lors de la vérification utilisateur:", err)
      } finally {
        setLoading(false)
      }
    }
    checkUser()

    const handleResize = () => {
      if (window.innerWidth >= 1180) setIsSommaireOpen(false)
    }
    window.addEventListener('resize', handleResize)

    const clickOut = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedOutsideDesktop = menuRef.current && !menuRef.current.contains(target)
      const clickedOutsideMobile = mobileMenuRef.current && !mobileMenuRef.current.contains(target)

      if (clickedOutsideDesktop && clickedOutsideMobile) {
        setIsMenuOpen(false)
        setShowResults(false)
      }
      if (modalRef.current && !modalRef.current.contains(target)) {
        setIsModalOpen(false)
      }
    }
    document.addEventListener("mousedown", clickOut)

    // 🔐 LISTENER AUTHENTIFICATION - CRITICAL
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') {
        return
      }

      console.log("🔔 Auth state changed:", event, "User:", session?.user?.email)
      setUser(session?.user || null)
      await loadUserContext(session?.user || null)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener("mousedown", clickOut)
      subscription?.unsubscribe()
    }
  }, [])

  // 🎵 RÉCUPÉRER UNE PISTE ALÉATOIRE (AMÉLIORÉ)
  const fetchRandomTrack = async () => {
    const tracksPool = allTracks.length > 0 ? allTracks : await loadAllTracks()
    if (tracksPool.length === 0) return

    setIsLoadingRandom(true)
    
    try {
      const usedIds = new Set(history.map((track) => track.id))
      if (randomTrack) usedIds.add(randomTrack.id)

      const availableTracks = tracksPool.filter((track) => !usedIds.has(track.id))
      
      let trackToPlay
      if (availableTracks.length === 0) {
        trackToPlay = tracksPool[Math.floor(Math.random() * tracksPool.length)]
        setHistory([])
      } else {
        trackToPlay = availableTracks[Math.floor(Math.random() * availableTracks.length)]
      }

      if (randomTrack) {
        setHistory((prev) => [...prev, randomTrack])
      }

      setRandomTrack(trackToPlay)
      setDiggerName(trackToPlay.digger?.username || "Inconnu")
      setIsModalOpen(true)
    } catch (err) {
      console.error("Erreur lors de la récupération:", err)
    } finally {
      setIsLoadingRandom(false)
    }
  }

  // ◀ REVENIR À LA PISTE PRÉCÉDENTE
  const handlePrevious = () => {
    if (history.length > 0) {
      const newHistory = [...history]
      const lastTrack = newHistory.pop()
      if (lastTrack) {
        setRandomTrack(lastTrack)
        setDiggerName(lastTrack.digger?.username || "Inconnu")
        setHistory(newHistory)
      }
    }
  }

  // 🔍 RECHERCHE EN TEMPS RÉEL
  const handleSearch = useEffectEvent(async (val: string) => {
    const trimmedValue = val.trim()

    if (trimmedValue.length <= 1) {
      searchRequestRef.current += 1
      closeSearchResults()
      return
    }

    const requestId = searchRequestRef.current + 1
    searchRequestRef.current = requestId
    setSearchLoading(true)
    setShowResults(true)

    try {
      const safeValue = trimmedValue.replace(/[%_]/g, '')
      if (safeValue.length === 0) {
        closeSearchResults()
        return
      }
      const searchPattern = `%${safeValue}%`

      const diggerPromise = async (): Promise<SearchResultsState['diggers']> => {
        const runDiggerQuery = (selectFields: string) => supabase
          .from('digger')
          .select(selectFields)
          .ilike('username', searchPattern)
          .limit(5)
          .returns<SearchResultsState['diggers']>()

        let { data, error } = await runDiggerQuery(NAVBAR_DIGGER_SELECT_WITH_BADGES)

        if (error && (isMissingColumnError(error, 'equipped_badge_1') || isMissingColumnError(error, 'equipped_badge_2'))) {
          console.warn('Colonnes badges non disponibles sur public.digger, fallback recherche navbar sans badges equipes.')
          const fallbackResult = await runDiggerQuery(NAVBAR_DIGGER_SELECT_LEGACY)
          data = fallbackResult.data
          error = fallbackResult.error
        }

        if (error) {
          throw error
        }

        return data || []
      }

      const [titleMatches, artistMatches, diggers] = await Promise.all([
        supabase
          .from('titre')
          .select('id, nom_titre, nom_artiste, created_at, type_partage')
          .or('type_partage.is.null,type_partage.neq.production')
          .ilike('nom_titre', searchPattern)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('titre')
          .select('id, nom_titre, nom_artiste, created_at, type_partage')
          .or('type_partage.is.null,type_partage.neq.production')
          .ilike('nom_artiste', searchPattern)
          .order('created_at', { ascending: false })
          .limit(5),
        diggerPromise()
      ])

      if (searchRequestRef.current !== requestId) {
        return
      }

      const mergedTitres = [...(titleMatches.data || []), ...(artistMatches.data || [])]
      const titres = Array.from(new Map(mergedTitres.map((track) => [track.id, track])).values()).slice(0, 8)

      setSearchResults({
        titres,
        diggers
      })
      setShowResults(titres.length > 0 || diggers.length > 0)
    } catch (err) {
      if (searchRequestRef.current !== requestId) {
        return
      }
      console.error("Erreur recherche:", formatSupabaseError(err))
      closeSearchResults()
    } finally {
      if (searchRequestRef.current === requestId) {
        setSearchLoading(false)
      }
    }
  })

  const handleSearchFocus = () => {
    if (searchTerm.trim().length > 1 && (searchLoading || searchResults.titres.length > 0 || searchResults.diggers.length > 0)) {
      setShowResults(true)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchTerm)
    }, 250)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // 🔗 COMPOSANTS RÉUTILISABLES
  const DropdownLink = ({ href, children, mobile = false }: { href: string; children: React.ReactNode; mobile?: boolean }) => (
    <Link
      href={href}
      onClick={() => {
        setIsSommaireOpen(false)
        setIsMenuOpen(false)
      }}
      className={`block rounded-xl px-4 py-3 text-[13px] font-black uppercase tracking-[0.08em] transition-all ${
        mobile
          ? 'ml-4 border-l-2 border-white/12 text-gray-400 hover:border-[#7CFF00]/45 hover:bg-white/5 hover:text-white'
          : 'text-gray-300 hover:bg-white/7 hover:text-white hover:shadow-[0_0_22px_rgba(255,255,255,0.06)]'
      }`}
    >
      {children}
    </Link>
  )

  const MobileCategory = ({
    title,
    isOpen,
    onClick,
    children
  }: {
    title: string
    isOpen: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <div className="flex flex-col border-b border-white/5">
      <button
        onClick={onClick}
        className={`flex justify-between items-center py-5 text-[16px] font-black italic tracking-widest uppercase transition-all ${
          isOpen ? 'text-purple-500' : 'text-white'
        }`}
      >
        {title}
        <span className="text-[11px]">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  )

  // 🔌 LOGOUT HANDLER
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setBalance(0)
    setIsMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Spacer pour la navbar fixed */}
      <div style={{ height: HAUTEUR_BARRE_NOIRE, width: '100%' }} />

      {/* Navbar */}
      <nav
        style={{
          height: HAUTEUR_BARRE_NOIRE,
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          zIndex: 9999,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          backgroundColor: '#000000',
          backgroundImage: 'none'
        }}
      >
        <div
          style={{
            position: 'relative',
            width: `${100 / NAV_SCALE}%`,
            height: `${BASE_NAV_HEIGHT}px`,
            margin: '0 auto',
            transform: `scale(${NAV_SCALE})`,
            transformOrigin: 'top center'
          }}
        >
        <div className="absolute top-[14px] w-full h-[82px] px-5 xl:px-12 flex justify-between items-center">
          {/* Logo + Menu burger */}
          <div className="flex items-center gap-6">
            <Link href="/" className="group relative top-[30px] flex h-full items-center justify-center px-3 transition-opacity hover:opacity-90">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300/0 blur-3xl transition-all duration-300 group-hover:bg-lime-300/35"
              />
              <Image className="relative z-10" src="/logo.svg" alt="Logo Sonar" width={LOGO_TAILLE} height={LOGO_HAUTEUR} priority />
            </Link>

            <button
              onClick={() => setIsSommaireOpen(!isSommaireOpen)}
              className="min-[1180px]:hidden flex flex-col gap-1.5 p-2 bg-white/5 rounded-md border border-white/10"
              aria-label="Menu mobile"
            >
              <div className="w-6 h-0.5 bg-white"></div>
              <div className="w-6 h-0.5 bg-white"></div>
              <div className="w-6 h-0.5 bg-white"></div>
            </button>
          </div>

          {/* Recherche Desktop */}
          <div className="hidden min-[1180px]:block relative w-[500px]" ref={menuRef}>
            <input
              type="text"
              placeholder="RECHERCHER UNE PÉPITE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleSearchFocus}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-full py-4 px-12 pr-16 text-[12px] font-bold text-gray-300 outline-none focus:border-purple-600 transition-all"
              aria-label="Rechercher"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30 text-sm" aria-hidden="true">🔍</span>
            <button
              onClick={fetchRandomTrack}
              disabled={isLoadingRandom}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl text-lime-400 drop-shadow-[0_0_12px_rgba(163,230,53,0.45)] hover:text-lime-300 hover:scale-125 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Découverte aléatoire"
            >
              {isLoadingRandom ? '⏳' : '∞'}
            </button>

            {/* Résultats recherche */}
            {showResults && (searchLoading || searchResults.titres.length > 0 || searchResults.diggers.length > 0) && (
              <div className="absolute top-[65px] w-full bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 shadow-2xl z-[10001] max-h-[400px] overflow-y-auto">
                {searchLoading && (
                  <div className="px-2 py-3 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                    Recherche...
                  </div>
                )}
                {searchResults.titres.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-purple-500 font-black mb-2 px-2 tracking-widest uppercase">
                      🎵 Musiques
                    </p>
                    {searchResults.titres.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setShowResults(false)
                          router.push(`/track/${t.id}`)
                        }}
                        className="flex flex-col p-2 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                        role="button"
                        tabIndex={0}
                      >
                        <span className="text-sm text-gray-200 font-bold">{t.nom_titre}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-black">
                          {t.nom_artiste}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults.diggers.length > 0 && (
                  <div>
                    <p className="text-[10px] text-blue-500 font-black mb-2 px-2 tracking-widest uppercase">
                      👤 Diggers
                    </p>
                    {searchResults.diggers.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setShowResults(false)
                          router.push(`/profil/${d.id}`)
                        }}
                        className="block p-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 font-bold cursor-pointer"
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-2">
                          <span>@{d.username}</span>
                          <EquippedBadgesInline badgeIds={[d.equipped_badge_1, d.equipped_badge_2]} size="xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Droite: Icônes + Avatar */}
          <div className="flex items-center gap-4 min-[1180px]:gap-8">
            {/* Icônes + Partager groupés avant la cloche */}
            <div className="hidden min-[1180px]:-ml-8 xl:-ml-12 min-[1180px]:flex items-center gap-4 text-xl shrink-0">
              <Link href="#" className="hover:scale-125 transition-transform" aria-label="Photos">
                📸
              </Link>
              <Link href="/jeux/paris" className="hover:scale-125 transition-transform" aria-label="Paris">
                🎰
              </Link>
              {user && (
                <a
                  href="https://www.paypal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-125 transition-transform"
                  title="Soutenir Sonar via PayPal"
                  aria-label="Soutenir"
                >
                  💰
                </a>
              )}
            </div>

            {/* 🔔 NOTIFICATIONS PANEL */}
            <NotificationsPanel />

            {user && (
              <div className="hidden min-[1180px]:flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-4 py-2 shadow-[0_0_20px_rgba(0,0,0,0.22)]">
                <PointsPearl size="md" className="scale-125" />
                <span className="text-[12px] font-black tracking-[0.12em] text-white/90">
                  {balance.toLocaleString('fr-FR')}
                </span>
              </div>
            )}

            {/* 🎯 BOUTON DYNAMIQUE CONNEXION / PROFIL */}
            {!loading && (
              user ? (
                // ✅ USER CONNECTÉ - Menu Profil
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="relative w-[45px] h-[45px] xl:w-[55px] xl:h-[55px] rounded-full border-2 border-[#7CFF00]/70 bg-gray-900 flex items-center justify-center font-bold text-[#7CFF00] overflow-hidden hover:border-[#96FF33] transition-all shadow-[0_0_18px_rgba(124,255,0,0.22)]"
                    aria-label="Menu utilisateur"
                    aria-expanded={isMenuOpen}
                  >
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} alt="Avatar" fill unoptimized className="object-cover" />
                    ) : (
                      user.email?.charAt(0).toUpperCase() || 'S'
                    )}
                  </button>
                  {isMenuOpen && (
                    <div className="absolute top-[65px] right-0 w-56 bg-[#0a0a0a] border border-purple-600 rounded-2xl py-2 z-[10000] shadow-2xl">
                      <Link
                        href="/profil"
                        className="block px-6 py-4 text-[11px] text-gray-400 hover:text-white font-bold uppercase tracking-widest border-b border-white/10"
                      >
                        👤 Mon Profil
                      </Link>
                      <Link
                        href="/profil/radar"
                        className="block px-6 py-4 text-[11px] text-gray-400 hover:text-white font-bold uppercase tracking-widest border-b border-white/10"
                      >
                        📡 Radar abonnements
                      </Link>
                      {profile?.role === 'admin' && (
                        <Link
                          href="/admin"
                          className="block px-6 py-4 text-[11px] text-lime-300 hover:text-white font-bold uppercase tracking-widest border-b border-white/10"
                        >
                          🛠️ Console admin
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-6 py-4 text-[11px] text-red-500 hover:bg-red-500/10 font-bold uppercase tracking-widest transition-all"
                      >
                        🔌 Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // ❌ USER NON CONNECTÉ - Bouton Login
                <Link
                  href="/auth"
                  className="hidden min-[1180px]:block bg-purple-600 text-white text-[11px] font-black uppercase px-8 py-4 rounded-full hover:bg-white hover:text-black transition-all shadow-lg"
                >
                  🔐 CONNEXION
                </Link>
              )
            )}

            {user && <QuestQuickPanel />}

            {user && (
              <Link
                href="/partager"
                className="hidden min-[1180px]:inline-flex text-[11px] font-black uppercase border border-white/20 bg-white text-black px-5 py-2 rounded-full hover:border-[#7CFF00]/70 hover:bg-[#7CFF00] hover:text-black hover:shadow-[0_0_32px_rgba(124,255,0,0.65)] transition-all shadow-lg"
              >
                PARTAGER
              </Link>
            )}

            {/* 🔵 BOUTON PAYPAL + PARTAGER - VISIBLES SEULEMENT SI CONNECTÉ */}
          </div>
        </div>

        {/* Trait néon desktop */}
        <div className="pointer-events-none hidden min-[1180px]:block absolute inset-x-0 top-0 z-0">
          <div className="absolute right-0 top-[102px] h-[3px] w-[calc(100%-332px)] rounded-full bg-[#2fff76] shadow-[0_0_10px_rgba(47,255,118,0.95),0_0_24px_rgba(47,255,118,0.55)]" />
          <div className="absolute left-[283px] top-[103px] h-[3px] w-[96px] origin-left -rotate-[51deg] rounded-full bg-[#2fff76] shadow-[0_0_10px_rgba(47,255,118,0.95),0_0_24px_rgba(47,255,118,0.55)]" />
        </div>

        {/* Menu catégories Desktop */}
        <div className="hidden min-[1180px]:flex absolute top-[115px] w-full justify-end pr-25 gap-6 z-[1]">
          <div className="relative group">
            <Link
              href="/classement/musique"
              className="text-[16px] font-black tracking-[0.15em] text-gray-400 group-hover:text-white uppercase italic transition-all"
            >
              🏆 CLASSEMENT ▼
            </Link>
            <div className="absolute top-[34px] left-1/2 -translate-x-1/2 w-[300px] bg-[#050505] border border-white/12 rounded-[22px] p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[50] shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
              <DropdownLink href="/classement/musique">💎 TOP MUSIQUE</DropdownLink>
              <DropdownLink href="/classement/digger">🔥 TOP DIGGER</DropdownLink>
              <DropdownLink href="/classement/prod">🎹 TOP PROD</DropdownLink>
              <DropdownLink href="/classement/last">🆕 DERNIERE SORTIE</DropdownLink>
              <DropdownLink href="/classement/jeux">🎮 TOP JEUX</DropdownLink>
            </div>
          </div>

          <div className="relative group">
            <button className="text-[16px] font-black tracking-[0.15em] text-gray-400 group-hover:text-white uppercase italic transition-all">
              ⚔️ L&apos;ARÈNE ▼
            </button>
            <div className="absolute top-[34px] left-1/2 -translate-x-1/2 w-[320px] bg-[#050505] border border-white/12 rounded-[22px] p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[50] shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
              {arenaLinks.map((link) => (
                <DropdownLink key={link.href} href={link.href}>
                  {link.label}
                </DropdownLink>
              ))}
            </div>
          </div>

          <div className="relative group">
            <button className="text-[16px] font-black tracking-[0.15em] text-gray-400 group-hover:text-white uppercase italic transition-all">
              💰 MARCHÉ ▼
            </button>
            <div className="absolute top-[34px] left-1/2 -translate-x-1/2 w-[280px] bg-[#050505] border border-white/12 rounded-[22px] p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[50] shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
              <DropdownLink href="#">🔄 ÉCHANGES</DropdownLink>
              <DropdownLink href="#">🎖️ BADGES & LEVELS</DropdownLink>
              <DropdownLink href="#">🎁 CONCOURS</DropdownLink>
              <DropdownLink href="/marche/boutique">🛒 BOUTIQUE</DropdownLink>
            </div>
          </div>

          <div className="relative group">
            <button className="text-[16px] font-black tracking-[0.15em] text-gray-400 group-hover:text-white uppercase italic transition-all">
              🎥 TWITCH ▼
            </button>
            <div className="absolute top-[34px] left-1/2 -translate-x-1/2 w-[260px] bg-[#050505] border border-white/12 rounded-[22px] p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[50] shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
              <DropdownLink href="/twitch/connecter">🔗 SE CONNECTER</DropdownLink>
              <DropdownLink href="#">ℹ️ À QUOI ÇA SERT ?</DropdownLink>
            </div>
          </div>

          <div className="relative group">
            <button className="text-[16px] font-black tracking-[0.15em] text-purple-500 hover:text-purple-400 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] uppercase italic transition-all">
              ♻️ CERCLE VERTUEUX ▼
            </button>
            <div className="absolute top-[34px] left-1/2 -translate-x-1/2 w-[260px] bg-[#050505] border border-purple-600/30 rounded-[22px] p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[50] shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
              <DropdownLink href="#">📺 VIDÉOS & ARTICLES</DropdownLink>
              <DropdownLink href="#">🙋 COMMENT PARTICIPER ?</DropdownLink>
            </div>
          </div>

          <div className="relative group">
            <button className="text-[16px] font-black tracking-[0.15em] text-gray-400 group-hover:text-white uppercase italic transition-all">
              ✨ C&apos;EST NOUS ▼
            </button>
            <div className="absolute top-[34px] left-1/2 -translate-x-1/2 w-[260px] bg-[#050505] border border-white/12 rounded-[22px] p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[50] shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
              <DropdownLink href="#">📡 SONAR_052</DropdownLink>
              <DropdownLink href="#">📝 BLOG</DropdownLink>
              <DropdownLink href="#">💼 RECRUTEMENT</DropdownLink>
              <DropdownLink href="#">📞 CONTACT</DropdownLink>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {isSommaireOpen && (
          <div className="min-[1180px]:hidden absolute top-[180px] left-0 w-full bg-[#050505] border-t border-white/10 p-6 flex flex-col gap-2 z-[9998] h-[calc(100vh-180px)] overflow-y-auto pb-40">
            {user && (
              <>
                <a
                  href="https://www.paypal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsSommaireOpen(false)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-center text-[12px] font-black uppercase py-5 rounded-2xl shadow-lg mb-3"
                >
                  💳 SOUTENIR
                </a>
                <Link
                  href="/partager"
                  onClick={() => setIsSommaireOpen(false)}
                  className="border border-white/20 bg-white text-black text-center text-[12px] font-black uppercase py-5 rounded-2xl hover:border-[#7CFF00]/70 hover:bg-[#7CFF00] hover:shadow-[0_0_32px_rgba(124,255,0,0.5)] transition-all mb-6"
                >
                  🚀 PARTAGER MA MUSIQUE
                </Link>
              </>
            )}

            {!user && (
              <Link
                href="/auth"
                onClick={() => setIsSommaireOpen(false)}
                className="bg-purple-600 text-white text-center text-[12px] font-black uppercase py-5 rounded-2xl shadow-lg mb-6"
              >
                🔐 SE CONNECTER
              </Link>
            )}

            {/* Recherche mobile */}
            <div className="relative mb-6" ref={mobileMenuRef}>
              <input
                type="text"
                placeholder="RECHERCHER UNE PÉPITE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleSearchFocus}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-12 text-[12px] font-bold text-gray-300 outline-none focus:border-purple-600 transition-all"
                aria-label="Rechercher sur mobile"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 opacity-30" aria-hidden="true">🔍</span>
              <button
                onClick={fetchRandomTrack}
                disabled={isLoadingRandom}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl text-lime-400 drop-shadow-[0_0_12px_rgba(163,230,53,0.45)] hover:text-lime-300 hover:scale-125 transition-all disabled:opacity-50"
                aria-label="Découverte aléatoire sur mobile"
              >
                {isLoadingRandom ? '⏳' : '∞'}
              </button>

              {showResults && searchTerm.length > 1 && (searchLoading || searchResults.titres.length > 0 || searchResults.diggers.length > 0) && (
                <div className="absolute top-[75px] left-0 w-full bg-[#0d0d0d] border border-white/20 rounded-2xl p-2 shadow-2xl z-[99999] max-h-[350px] overflow-y-auto">
                  {searchLoading && (
                    <div className="px-4 py-3 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                      Recherche...
                    </div>
                  )}
                  {searchResults.titres.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setIsSommaireOpen(false)
                        setShowResults(false)
                        router.push(`/track/${t.id}`)
                      }}
                      className="flex flex-col p-4 mb-1 hover:bg-purple-600/20 active:bg-purple-600 rounded-xl cursor-pointer border-b border-white/5"
                      role="button"
                      tabIndex={0}
                    >
                      <span className="text-[13px] text-white font-black uppercase italic">{t.nom_titre}</span>
                      <span className="text-[10px] text-purple-500 font-bold uppercase tracking-widest">
                        {t.nom_artiste}
                      </span>
                    </div>
                  ))}
                  {searchResults.diggers.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        setIsSommaireOpen(false)
                        setShowResults(false)
                        router.push(`/profil/${d.id}`)
                      }}
                      className="flex items-center gap-3 p-4 hover:bg-blue-600/20 active:bg-blue-600 rounded-xl cursor-pointer"
                      role="button"
                      tabIndex={0}
                    >
                      <span className="text-[10px] text-blue-400 font-black uppercase">👤 {d.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <MobileCategory
              title="🏆 Classement"
              isOpen={openMobileCategory === 'classement'}
              onClick={() => setOpenMobileCategory(openMobileCategory === 'classement' ? null : 'classement')}
            >
              <DropdownLink mobile href="/classement/musique">
                💎 TOP MUSIQUE
              </DropdownLink>
              <DropdownLink mobile href="/classement/digger">
                🔥 TOP DIGGER
              </DropdownLink>
              <DropdownLink mobile href="/classement/prod">🎹 TOP PROD</DropdownLink>
              <DropdownLink mobile href="/classement/last">🆕 DERNIERE SORTIE</DropdownLink>
              <DropdownLink mobile href="/classement/jeux">🎮 TOP JEUX</DropdownLink>
            </MobileCategory>

            <MobileCategory
              title="⚔️ L'Arène"
              isOpen={openMobileCategory === 'arene'}
              onClick={() => setOpenMobileCategory(openMobileCategory === 'arene' ? null : 'arene')}
            >
              {arenaLinks.map((link) => (
                <DropdownLink key={link.href} mobile href={link.href}>
                  {link.label}
                </DropdownLink>
              ))}
            </MobileCategory>

            <MobileCategory
              title="💰 Marché"
              isOpen={openMobileCategory === 'marche'}
              onClick={() => setOpenMobileCategory(openMobileCategory === 'marche' ? null : 'marche')}
            >
              <DropdownLink mobile href="#">🔄 ÉCHANGES</DropdownLink>
              <DropdownLink mobile href="#">🎖️ BADGES & LEVELS</DropdownLink>
              <DropdownLink mobile href="#">🎁 CONCOURS</DropdownLink>
              <DropdownLink mobile href="/marche/boutique">🛒 BOUTIQUE</DropdownLink>
            </MobileCategory>

            <MobileCategory
              title="🎥 Twitch"
              isOpen={openMobileCategory === 'twitch'}
              onClick={() => setOpenMobileCategory(openMobileCategory === 'twitch' ? null : 'twitch')}
            >
              <DropdownLink mobile href="/twitch/connecter">🔗 SE CONNECTER</DropdownLink>
              <DropdownLink mobile href="#">ℹ️ À QUOI ÇA SERT ?</DropdownLink>
            </MobileCategory>

            <MobileCategory
              title="♻️ Cercle Vertueux"
              isOpen={openMobileCategory === 'cercle'}
              onClick={() => setOpenMobileCategory(openMobileCategory === 'cercle' ? null : 'cercle')}
            >
              <DropdownLink mobile href="#">📺 VIDÉOS & ARTICLES</DropdownLink>
              <DropdownLink mobile href="#">🙋 COMMENT PARTICIPER ?</DropdownLink>
            </MobileCategory>

            <MobileCategory
              title="✨ C'est Nous"
              isOpen={openMobileCategory === 'nous'}
              onClick={() => setOpenMobileCategory(openMobileCategory === 'nous' ? null : 'nous')}
            >
              <DropdownLink mobile href="#">📡 SONAR_052</DropdownLink>
              <DropdownLink mobile href="#">📝 BLOG</DropdownLink>
              <DropdownLink mobile href="#">💼 RECRUTEMENT</DropdownLink>
              <DropdownLink mobile href="#">📞 CONTACT</DropdownLink>
            </MobileCategory>
          </div>
        )}
        </div>
      </nav>

      {/* Modal découverte aléatoire */}
      {isModalOpen && randomTrack && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.16),transparent_30%),rgba(0,0,0,0.94)] backdrop-blur-xl">
          <div
            ref={modalRef}
            className="relative w-full max-w-4xl overflow-hidden rounded-[40px] border border-[#7CFF00]/25 bg-[linear-gradient(160deg,rgba(5,16,8,0.98),rgba(4,10,7,0.96))] shadow-[0_0_70px_rgba(34,197,94,0.22)] flex flex-col items-center"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,255,0,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_30%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#7CFF00]/80 to-transparent" />
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-8 right-8 z-10 text-2xl text-[#7CFF00]/60 hover:text-[#b8ff64] transition-all"
              aria-label="Fermer"
            >
              ✕
            </button>
            <div className="relative p-10 w-full">
              <div className="text-center mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[#7CFF00]/75 mb-3">
                  Radar Aleatoire
                </p>
                <Link href={`/track/${randomTrack.id}`} onClick={() => setIsModalOpen(false)}>
                  <h2 className="text-3xl font-black text-white uppercase italic leading-none hover:text-[#7CFF00] transition-colors cursor-pointer">
                    {randomTrack.nom_titre}
                  </h2>
                </Link>
                <p className="text-[#7CFF00] font-bold text-[12px] tracking-[0.3em] uppercase mt-2 drop-shadow-[0_0_10px_rgba(124,255,0,0.28)]">
                  {randomTrack.nom_artiste}
                </p>
              </div>

              {/* VIDÉO AVEC BOUTONS SUR LES CÔTÉS - RESPONSIVE */}
              <div className="flex items-center justify-center gap-2 md:gap-6 w-full mb-8">
                {/* BOUTON PRÉCÉDENT - GAUCHE */}
                <button
                  onClick={handlePrevious}
                  disabled={history.length === 0}
                  className={`w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-[#08110b] border border-[#7CFF00]/20 text-[#d9ffe6] text-base md:text-xl hover:bg-[#102417] hover:border-[#7CFF00]/55 hover:shadow-[0_0_20px_rgba(124,255,0,0.2)] transition-all flex-shrink-0 ${
                    history.length === 0 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                  aria-label="Piste précédente"
                >
                  ◀
                </button>

                {/* VIDÉO - CENTRE */}
                <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl md:rounded-3xl border border-[#7CFF00]/15 bg-black shadow-[0_0_45px_rgba(34,197,94,0.14)]">
                  {getTrackEmbedId(randomTrack) ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${getTrackEmbedId(randomTrack)}?autoplay=1`}
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      title="Lecteur vidéo YouTube"
                    ></iframe>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(124,255,0,0.08),transparent_45%),#020402] px-6 text-center text-sm font-bold uppercase tracking-[0.2em] text-[#b8ff64]">
                      Lien YouTube invalide pour ce morceau
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 z-20 rounded-full border border-[#7CFF00]/20 bg-black/65 p-2 shadow-[0_0_25px_rgba(34,197,94,0.16)] md:bottom-6 md:right-6 md:p-3">
                    <Likesbutton
                      trackId={randomTrack.id}
                      trackOwnerId={String(randomTrack.user_id ?? randomTrack.digger?.id ?? '')}
                      vuesActuelles={randomTrack.vues_actuelles || 0}
                      initialLikes={randomTrack.likes || 0}
                    />
                  </div>
                </div>

                {/* BOUTON SUIVANT - DROITE */}
                <button
                  onClick={fetchRandomTrack}
                  disabled={isLoadingRandom}
                  className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-[#08110b] border border-[#7CFF00]/20 text-[#d9ffe6] text-base md:text-xl hover:bg-[#102417] hover:border-[#7CFF00]/55 hover:shadow-[0_0_20px_rgba(124,255,0,0.2)] transition-all flex-shrink-0 disabled:opacity-50"
                  aria-label="Piste suivante"
                >
                  {isLoadingRandom ? '⏳' : '▶'}
                </button>
              </div>

              {/* INFOS */}
              <div className="mt-8 flex flex-col items-center">
                <Link href={`/profil/${randomTrack.digger?.id}`} onClick={() => setIsModalOpen(false)}>
                  <div className="flex items-center gap-2 mb-4 rounded-full border border-[#7CFF00]/20 bg-[#08110b]/90 px-3 py-1 md:px-4 md:py-1.5 hover:border-[#7CFF00]/50 hover:bg-[#102417] transition-all cursor-pointer">
                    <span className="text-[9px] md:text-[10px] text-[#9ac9aa] font-bold uppercase tracking-widest">Posté par :</span>
                    <span className="text-[9px] md:text-[10px] text-[#b8ff64] font-black uppercase tracking-widest">{diggerName}</span>
                  </div>
                </Link>
                <p className="max-w-2xl text-center text-xs italic text-[#b7c8bd] md:text-sm">
                  {randomTrack.description || "Cette pépite attend que tu la dévores..."}
                </p>
                <Link
                  href={`/track/${randomTrack.id}`}
                  onClick={() => setIsModalOpen(false)}
                  className="mt-6 border-b border-[#7CFF00]/30 pb-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#7CFF00] hover:text-white md:text-[10px]"
                >
                  Voir la fiche complète
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
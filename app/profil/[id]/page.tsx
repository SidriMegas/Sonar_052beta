/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 👤 SONAR 0.52 - PROFIL PUBLIC DU DIGGER
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 📂 Location: /app/(pages)/profil/[id]/page.tsx
 * 
 * ✨ Fonctionnalités:
 * - Affichage du profil (avatar, biographie, stats)
 * - Liste des pépites trouvées par le Digger
 * - Total de points et nombre de trouvailles
 * - Badges de niveau (à venir)
 * - Grid responsive des musiques
 * - ✅ Sécurité: Variables d'environnement
 * - ✅ Gestion d'erreurs complète
 * - ✅ Jointures Supabase correctes
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

"use client"
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getFollowState, toggleFollow } from '@/lib/social'
import { getLevelInfo } from '@/lib/levels'
import PointsPearl from '@/app/components/PointsPearl'
import AdminVerificationBadge from '@/app/components/AdminVerificationBadge'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import LevelBadge from '@/app/components/LevelBadge'

type PublicDiggerProfile = {
  id: string
  username: string | null
  role: string | null
  biographie: string | null
  avatar_url: string | null
  instagram_url: string | null
  x_url: string | null
  soundcloud_url: string | null
  spotify_url: string | null
  total_points: number | null
  equipped_badge_1?: string | null
  equipped_badge_2?: string | null
}

type PublicTrack = {
  id: string
  nom_titre: string | null
  nom_artiste: string | null
  likes: number | null
  vues_actuelles: number | null
  points: number | null
  created_at: string | null
}

// --- COMPOSANT BADGE NIVEAU ---
const BadgeNiveau = ({ points }: { points: number }) => {
  const levelInfo = getLevelInfo(points)

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-cyan-100">
      <LevelBadge points={points} size={42} className="rounded-full" />
      <div className="flex flex-col leading-none">
        <span className="text-xs font-bold uppercase tracking-widest">Niveau {levelInfo.level}</span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/60">{levelInfo.tier.label}</span>
      </div>
    </div>
  )
}

export default function PublicProfilePage() {
  const { id } = useParams()
  const [digger, setDigger] = useState<PublicDiggerProfile | null>(null)
  const [userTracks, setUserTracks] = useState<PublicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (!id) return

    let cancelled = false

    // Fire profile data fetch immediately — no auth needed for public data
    const fetchProfileData = async () => {
      try {
        const [{ data: diggerData, error: diggerError }, { data: tracksData, error: tracksError }] = await Promise.all([
          supabase
            .from('digger')
            .select('id, username, role, biographie, avatar_url, instagram_url, x_url, soundcloud_url, spotify_url, total_points, equipped_badge_1, equipped_badge_2')
            .eq('id', id)
            .single(),
          supabase
            .from('titre')
            .select('id, nom_titre, nom_artiste, likes, vues_actuelles, points, created_at')
            .eq('user_id', id)
            .order('created_at', { ascending: false }),
        ])

        if (diggerError) throw diggerError
        if (tracksError) throw tracksError
        if (!diggerData) {
          setError("Digger introuvable")
          return
        }
        if (cancelled) return
        setDigger(diggerData as PublicDiggerProfile)
        setUserTracks((tracksData || []) as PublicTrack[])
      } catch (err: unknown) {
        console.error("Erreur lors de la récupération:", err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Une erreur est survenue")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    // Auth check in parallel — only needed for follow button
    const loadAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        setViewerId(session?.user?.id || null)
        const { data: followState } = await getFollowState(session?.user?.id || null, String(id))
        if (cancelled) return
        setIsFollowing(Boolean(followState?.is_following))
        setFollowersCount(followState?.followers_count || 0)
        setFollowingCount(followState?.following_count || 0)
      } catch {}
    }

    fetchProfileData()
    loadAuthState()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] pt-[220px] px-6 xl:px-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm italic">Chargement du profil...</p>
        </div>
      </div>
    )
  }

  if (error || !digger) {
    return (
      <div className="min-h-screen bg-[#050505] pt-[220px] px-6 xl:px-20 pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-300 mb-4">🚫 Digger introuvable</p>
          <p className="text-gray-500 text-sm mb-8">
            {error || "Le profil que tu cherches n&apos;existe pas ou a été supprimé."}
          </p>
          <Link href="/" className="text-purple-500 hover:text-purple-400 font-bold uppercase text-sm">
            ← Retourner à l&apos;accueil
          </Link>
        </div>
      </div>
    )
  }

  // 📊 CALCULS
  const totalPepites = userTracks.length
  const totalPoints = digger.total_points || 0
  const totalLikes = userTracks.reduce((sum, track) => sum + (track.likes || 0), 0)
  const totalVues = userTracks.reduce((sum, track) => sum + (track.vues_actuelles || 0), 0)

  const handleFollow = async () => {
    if (!viewerId || !id || viewerId === id) {
      return
    }
    setFollowLoading(true)
    const { data } = await toggleFollow(viewerId, String(id))
    if (data?.success) {
      setIsFollowing(Boolean(data.is_following))
      setFollowersCount(data.followers_count || 0)
      setFollowingCount(data.following_count || 0)
    }
    setFollowLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white pt-[220px] px-6 xl:px-20 pb-20">
      
      {/* --- HEADER PROFIL --- */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-16 bg-gradient-to-r from-purple-600/10 to-blue-600/10 p-10 rounded-[40px] border border-white/10 hover:border-white/20 transition-all">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-4xl font-black border-4 border-[#050505] shadow-2xl overflow-hidden flex-shrink-0">
          {digger.avatar_url ? (
            <Image 
              src={digger.avatar_url} 
              alt={digger.username || 'Avatar digger'}
              width={128}
              height={128}
              unoptimized
              className="w-full h-full object-cover" 
            />
          ) : (
            digger.username?.charAt(0).toUpperCase() || "D"
          )}
        </div>

        {/* Infos */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <h1 className="text-4xl xl:text-5xl font-black uppercase italic tracking-tighter">
              @{digger.username}
            </h1>
            <EquippedBadgesInline badgeIds={[digger.equipped_badge_1, digger.equipped_badge_2]} size="sm" />
            <AdminVerificationBadge role={digger.role} compact />
            <BadgeNiveau points={totalPoints} />
          </div>

          <p className="text-gray-400 text-sm mb-6 max-w-2xl leading-relaxed">
            {digger.biographie || "Ce Digger n'a pas encore complété sa biographie. Un mystérieux explorateur du son 🎵"}
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="bg-purple-600/20 border border-purple-600/30 px-4 py-3 rounded-2xl">
              <p className="text-purple-400 font-bold text-xs uppercase tracking-widest">💎 Perles totales</p>
              <p className="text-2xl font-black text-purple-300 mt-1">{totalPoints.toLocaleString('fr-FR')}</p>
            </div>

            <div className="bg-blue-600/20 border border-blue-600/30 px-4 py-3 rounded-2xl">
              <p className="text-blue-400 font-bold text-xs uppercase tracking-widest">🎵 Pépites trouvées</p>
              <p className="text-2xl font-black text-blue-300 mt-1">{totalPepites}</p>
            </div>

            <div className="bg-green-600/20 border border-green-600/30 px-4 py-3 rounded-2xl">
              <p className="text-green-400 font-bold text-xs uppercase tracking-widest">❤️ Likes reçus</p>
              <p className="text-2xl font-black text-green-300 mt-1">{totalLikes}</p>
            </div>

            <div className="bg-orange-600/20 border border-orange-600/30 px-4 py-3 rounded-2xl">
              <p className="text-orange-400 font-bold text-xs uppercase tracking-widest">👁️ Vues cumulées</p>
              <p className="text-2xl font-black text-orange-300 mt-1">{totalVues.toLocaleString('fr-FR')}</p>
            </div>

            <div className="bg-cyan-600/20 border border-cyan-600/30 px-4 py-3 rounded-2xl">
              <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest">👥 Followers</p>
              <p className="text-2xl font-black text-cyan-300 mt-1">{followersCount}</p>
            </div>

            <div className="bg-sky-600/20 border border-sky-600/30 px-4 py-3 rounded-2xl">
              <p className="text-sky-400 font-bold text-xs uppercase tracking-widest">➡ Following</p>
              <p className="text-2xl font-black text-sky-300 mt-1">{followingCount}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2 flex-wrap">
            {digger.instagram_url ? <a href={digger.instagram_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-full border border-white/20 text-xs font-bold hover:bg-white/10">Instagram</a> : null}
            {digger.x_url ? <a href={digger.x_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-full border border-white/20 text-xs font-bold hover:bg-white/10">X</a> : null}
            {digger.soundcloud_url ? <a href={digger.soundcloud_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-full border border-white/20 text-xs font-bold hover:bg-white/10">SoundCloud</a> : null}
            {digger.spotify_url ? <a href={digger.spotify_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-full border border-white/20 text-xs font-bold hover:bg-white/10">Spotify</a> : null}
          </div>
        </div>
      </div>

      {/* --- BOUTONS D'ACTIONS --- */}
      <div className="flex gap-4 mb-12 flex-wrap">
        {viewerId && viewerId !== id ? (
          <button
            className={`px-6 py-3 font-black uppercase text-sm rounded-full transition-all shadow-lg ${
              isFollowing
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
            onClick={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? '...' : isFollowing ? '✓ Suivi' : '+ Suivre'}
          </button>
        ) : null}
        <button 
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase text-sm rounded-full transition-all shadow-lg"
          onClick={() => navigator.clipboard.writeText(`${digger.username}`)}
          aria-label="Copier le pseudo"
        >
          📋 Copier le pseudo
        </button>
        <Link 
          href={`/profil/${id}/messages`}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-sm rounded-full transition-all border border-white/10"
        >
          💬 Envoyer un message
        </Link>
      </div>

      {/* --- LISTE DES PÉPITES --- */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            {totalPepites === 0 ? "Aucune pépite trouvée" : `Ses ${totalPepites} trouvailles`}
          </h2>
          {totalPepites > 0 && (
            <p className="text-gray-400 text-sm">Triées par date (plus récentes d&apos;abord)</p>
          )}
        </div>

        {userTracks.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-[30px] p-12 text-center">
            <p className="text-gray-500 italic text-lg mb-4">🌊 Ce Digger n&apos;a pas encore plongé dans les abysses...</p>
            <p className="text-gray-600 text-sm">Les prochaines pépites arrivent bientôt 🎵</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {userTracks.map((track) => (
              <Link 
                key={track.id}
                href={`/track/${track.id}`}
                className="group bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 rounded-[30px] hover:border-purple-600 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] transition-all duration-300 h-full flex flex-col"
              >
                {/* En-tête */}
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                    🎵 MUSIQUE
                  </span>
                  <span className="text-purple-500 font-black text-sm group-hover:text-purple-300 transition-colors inline-flex items-center gap-2">
                    <PointsPearl size="md" /> +{Math.round(track.points || 0)}
                  </span>
                </div>

                {/* Titre */}
                <h4 className="text-lg font-black uppercase truncate group-hover:text-purple-400 transition-colors mb-2">
                  {track.nom_titre || "Sans titre"}
                </h4>

                {/* Artiste */}
                <p className="text-gray-500 text-sm font-bold uppercase mb-4 flex-grow">
                  Par {track.nom_artiste || "Artiste inconnu"}
                </p>

                {/* Barre de progression */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min((track.likes || 0) * 10, 100)}%`
                    }}
                    aria-hidden="true"
                  ></div>
                </div>

                {/* Stats inline */}
                <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>❤️ {track.likes || 0}</span>
                  <span>👁️ {track.vues_actuelles?.toLocaleString('fr-FR') || '0'}</span>
                </div>

                {/* Date */}
                <p className="text-[10px] text-gray-600 mt-4 pt-4 border-t border-white/5">
                  Posté le {track.created_at ? new Date(track.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* --- STATISTIQUES GLOBALES --- */}
      {totalPepites > 0 && (
        <div className="mt-20 pt-20 border-t border-white/10">
          <h3 className="text-2xl font-black italic uppercase mb-8 tracking-tighter">📊 Statistiques globales</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center hover:border-white/20 transition-all">
              <p className="text-gray-500 text-xs font-black uppercase mb-2">Moyenne de perles par pépite</p>
              <p className="text-3xl font-black text-purple-400 inline-flex items-center gap-2">
                <PointsPearl size="lg" /> {Math.round(totalPoints / totalPepites)}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center hover:border-white/20 transition-all">
              <p className="text-gray-500 text-xs font-black uppercase mb-2">Moyenne de likes par pépite</p>
              <p className="text-3xl font-black text-green-400">
                {Math.round(totalLikes / totalPepites)}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center hover:border-white/20 transition-all">
              <p className="text-gray-500 text-xs font-black uppercase mb-2">Pépite la plus likée</p>
              <p className="text-3xl font-black text-blue-400">
                {Math.max(...userTracks.map(t => t.likes || 0))}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center hover:border-white/20 transition-all">
              <p className="text-gray-500 text-xs font-black uppercase mb-2">Pépite la plus suivie</p>
              <p className="text-3xl font-black text-orange-400">
                {Math.max(...userTracks.map(t => t.vues_actuelles || 0)).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

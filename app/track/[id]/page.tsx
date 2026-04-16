"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PointsPearl from '@/app/components/PointsPearl'
import AdminVerificationBadge from '@/app/components/AdminVerificationBadge'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'

export default function ProfilPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [badges, setBadges] = useState<any[]>([])
  const [userTracks, setUserTracks] = useState<any[]>([]) 
  const [detectedTracks, setDetectedTracks] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchFullProfile = async () => {
      setLoading(true)
      try {
        // 1. Session
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/auth')
          return
        }
        setUser(session.user)

      // 2. Récupérer le profil complet
      const { data: profileData } = await supabase
        .from('digger')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileData) {
        setProfile(profileData)

        // 3. Badges (Inchangé)
        const { data: badgeData } = await supabase
          .from('mes_badges_profil')
          .select('*')
          .eq('user_id', session.user.id)
        setBadges(badgeData || [])

        // 4. Musiques POSTÉES (Inchangé)
        const { data: posted } = await supabase
          .from('titre')
          .select('*')
          .eq('user_id', session.user.id)
        setUserTracks(posted || [])

        // 5. 🔥 RÉCUPÉRER SES MUSIQUES DÉTECTÉES
        // On vérifie d'abord la nouvelle colonne youtube_channel_id du profil
        const searchId = profileData.youtube_channel_id || profileData.youtube_id;

        if (searchId) {
          const { data: detected } = await supabase
            .from('titre')
            .select('*, digger:user_id(username, equipped_badge_1, equipped_badge_2)')
            // On s'assure de comparer le UC... avec le UC...
            .eq('youtube_channel_id', searchId) 
          
          setDetectedTracks(detected || [])
        }
      }
      } catch (err) {
        console.error('Erreur chargement profil:', err)
        router.push('/auth')
      } finally {
        setLoading(false)
      }
    }

    fetchFullProfile()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-white font-black italic animate-pulse pt-[120px]">
      CHARGEMENT DU DASHBOARD...
    </div>
  )

  return (
    <div className="bg-black min-h-screen text-white p-6 pt-[120px] font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-12 border-b border-white/10 pb-10 flex flex-col md:flex-row justify-between items-end">
          <div>
            <div className="flex flex-wrap gap-2 mb-6">
               {badges.map(b => (
                 <span key={b.badge_id} className="bg-yellow-400 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase">
                   🏆 {b.name}
                 </span>
               ))}
               <span className="bg-purple-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase border border-purple-400/50">
                 {profile?.role || 'USER'}
               </span>
               <AdminVerificationBadge role={profile?.role} compact />
            </div>
            <h1 className="text-7xl md:text-9xl font-black italic uppercase tracking-tighter leading-none">
              {profile?.username}
            </h1>
            {profile?.biographie && (
              <p className="text-gray-400 mt-4 text-sm">{profile.biographie}</p>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-500 text-[10px] font-black uppercase mt-4"
          >
            🔌 DÉCONNEXION
          </button>
        </div>

        {/* GRILLE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 🔥 ARTISTE PANEL - MUSIQUES DÉTECTÉES */}
          {profile?.youtube_id && (
            <div className="bg-[#0A0A0A] border border-purple-500/20 rounded-3xl p-8">
              <h2 className="font-black italic uppercase text-xl text-purple-500 mb-8">
                🎬 Tes pépites détectées
              </h2>
              <div className="space-y-3">
                {detectedTracks.length > 0 ? (
                  detectedTracks.map(track => (
                    <Link 
                      href={`/track/${track.id}`}
                      key={track.id} 
                      className="flex justify-between items-center p-5 bg-purple-500/5 rounded-2xl border border-purple-500/10 hover:bg-purple-500/10 transition-all cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-black uppercase text-sm truncate">{track.nom_titre}</p>
                        <p className="text-[10px] text-gray-500">
                          Partagé par <span className="inline-flex items-center gap-2 text-purple-400 font-bold">@{track.digger?.username || 'Anonyme'}<EquippedBadgesInline badgeIds={[track.digger?.equipped_badge_1, track.digger?.equipped_badge_2]} size="xs" /></span>
                        </p>
                      </div>
                      <span className="text-purple-500 font-black text-xs whitespace-nowrap ml-4">
                        {(track.vues_actuelles || 0).toLocaleString()} VUES
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="h-40 flex items-center justify-center border border-dashed border-white/5 rounded-2xl text-gray-700 italic text-sm text-center">
                    Aucune musique détectée pour le moment.
                    <br />
                    <span className="text-gray-500 text-xs mt-2">Les gens doivent partager tes vidéos YouTube !</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DIGGER PANEL - MUSIQUES PARTAGÉES */}
          <div className="bg-[#0A0A0A] border border-blue-500/20 rounded-3xl p-8">
            <h2 className="font-black italic uppercase text-xl text-blue-400 mb-8">
              🎵 Tes partages digger
            </h2>
            <div className="space-y-3">
              {userTracks.length > 0 ? (
                userTracks.map(track => (
                  <Link 
                    href={`/track/${track.id}`} 
                    key={track.id} 
                    className="flex justify-between items-center p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10 hover:bg-blue-500/10 transition-all cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black uppercase text-sm truncate">{track.nom_titre}</p>
                      <p className="text-[10px] text-gray-500">{track.nom_artiste}</p>
                    </div>
                    <span className="text-blue-400 font-black text-xs whitespace-nowrap ml-4 inline-flex items-center gap-2">
                      <PointsPearl size="sm" /> {Math.round(track.points || 0)}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="h-40 flex items-center justify-center border border-dashed border-white/5 rounded-2xl text-gray-700 italic text-sm">
                  Partage un son pour gagner des perles.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Partages</p>
            <p className="text-3xl font-black">{userTracks.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Perles Totales</p>
            <p className="text-3xl font-black text-blue-400 inline-flex items-center gap-2">
              <PointsPearl /> {Math.round(userTracks.reduce((acc, t) => acc + (t.points || 0), 0))}
            </p>
          </div>
          {profile?.youtube_id && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Pépites Partagées</p>
              <p className="text-3xl font-black text-purple-400">{detectedTracks.length}</p>
            </div>
          )}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Solde</p>
            <p className="text-3xl font-black text-green-400">{profile?.points || 0} 🪩</p>
          </div>
        </div>
      </div>
    </div>
  )
}
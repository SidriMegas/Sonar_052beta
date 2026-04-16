"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import Likesbutton from '@/app/components/likesbutton'
import PointsPearl from '@/app/components/PointsPearl'
import { checkTop100TracksAndNotify } from '@/lib/notifications'
import { getEmbedUrl } from '@/lib/youtube'

type TrackRow = {
  id: string
  nom_titre: string
  nom_artiste: string
  genre: string | null
  sous_genre: string | null
  pays: string | null
  vues_actuelles: number | null
  likes: number | null
  points: number | null
  date_sortie: string | null
  created_at: string
  youtube_url: string | null
  youtube_id: string | null
  user_id: string
  digger: { id: string; username: string; equipped_badge_1?: string | null; equipped_badge_2?: string | null } | null
}

export default function ClassementLastPage() {
  const [loading, setLoading] = useState(true)
  const [tracks, setTracks] = useState<TrackRow[]>([])
  const [selectedTrack, setSelectedTrack] = useState<TrackRow | null>(null)
  const [genreFilter, setGenreFilter] = useState('')
  const [subGenreFilter, setSubGenreFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')

  useEffect(() => {
    fetchLatest()
  }, [])

  const fetchLatest = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('titre')
        .select('id, nom_titre, nom_artiste, genre, sous_genre, pays, vues_actuelles, likes, points, date_sortie, created_at, youtube_url, youtube_id, user_id, digger:user_id(id, username, equipped_badge_1, equipped_badge_2)')
        .not('type_partage', 'eq', 'production')
        .order('created_at', { ascending: false })
        .limit(300)
      const rows = (data || []) as unknown as TrackRow[]
      setTracks(rows)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        await checkTop100TracksAndNotify(session.user.id, 'Last', rows.map(t => ({ id: t.id, user_id: t.user_id, nom_titre: t.nom_titre, nom_artiste: t.nom_artiste })))
      }
    } catch (err) {
      console.error('Erreur fetchLatest:', err)
      setTracks([])
    } finally {
      setLoading(false)
    }
  }

  const genres = useMemo(() => Array.from(new Set(tracks.map((t) => t.genre).filter(Boolean))) as string[], [tracks])
  const subGenres = useMemo(() => Array.from(new Set(tracks.map((t) => t.sous_genre).filter(Boolean))) as string[], [tracks])
  const countries = useMemo(() => Array.from(new Set(tracks.map((t) => t.pays).filter(Boolean))) as string[], [tracks])

  const filtered = useMemo(() => {
    return tracks
      .filter((t) => !genreFilter || t.genre === genreFilter)
      .filter((t) => !subGenreFilter || t.sous_genre === subGenreFilter)
      .filter((t) => !countryFilter || t.pays === countryFilter)
  }, [tracks, genreFilter, subGenreFilter, countryFilter])

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-green-500 font-black italic animate-pulse tracking-widest uppercase">Scanning frequencies...</div>
  )

  return (
    <div className="bg-gradient-to-b from-[#001524] via-[#000814] to-black min-h-screen text-white p-6 pt-32 relative">
      <div className="max-w-7xl mx-auto">

        <div className="mb-16">
          <h1 className="text-8xl md:text-[12rem] font-black italic uppercase tracking-tighter leading-[0.8] opacity-10 absolute -translate-y-12 select-none">Last</h1>
          <h2 className="text-5xl font-black uppercase italic relative z-10">Classement Last</h2>
          <p className="text-blue-400 font-bold tracking-widest uppercase text-[10px] mt-2 italic">Dernieres musiques publiees</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Genre</label>
            <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)} className="w-full bg-transparent font-black uppercase text-xs outline-none cursor-pointer">
              <option value="" className="bg-black">Tous les genres</option>
              {genres.map(g => <option key={g} value={g} className="bg-black">{g}</option>)}
            </select>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Sous-genre</label>
            <select value={subGenreFilter} onChange={e => setSubGenreFilter(e.target.value)} className="w-full bg-transparent font-black uppercase text-xs outline-none cursor-pointer">
              <option value="" className="bg-black">Tous</option>
              {subGenres.map(sg => <option key={sg} value={sg} className="bg-black">{sg}</option>)}
            </select>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <label className="text-[9px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Origine</label>
            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="w-full bg-transparent font-black uppercase text-xs outline-none cursor-pointer">
              <option value="" className="bg-black">Monde entier</option>
              {countries.map(c => <option key={c} value={c} className="bg-black">{c}</option>)}
            </select>
          </div>
        </div>

        <div className="table-shell bg-transparent border border-white/10 rounded-[40px] shadow-2xl overflow-hidden mb-20">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-[0.2em]">
              <tr>
                <th className="p-6 border-b border-white/10">Date</th>
                <th className="p-6 border-b border-white/10">Artiste</th>
                <th className="p-6 border-b border-white/10">Titre</th>
                <th className="p-6 border-b border-white/10">Genre</th>
                <th className="p-6 border-b border-white/10 text-center text-blue-400">
                  <span className="inline-flex items-center gap-2">
                    <PointsPearl size="sm" /> Perles
                  </span>
                </th>
                <th className="p-6 border-b border-white/10 text-center">Sonar</th>
                <th className="p-6 border-b border-white/10 text-center">Vues</th>
                <th className="p-6 border-b border-white/10 text-center italic">LIEN</th>
                <th className="p-6 border-b border-white/10">Digger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-10 text-center text-gray-500 italic">Aucun résultat.</td></tr>
              ) : (
                filtered.map(track => (
                  <tr key={track.id} className="hover:bg-blue-500/10 transition-all duration-300 group">
                    <td className="p-6 text-gray-400 text-[10px]">{new Date(track.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="p-6">
                      <div className="font-black text-white uppercase italic text-sm">{track.nom_artiste}</div>
                      <div className="text-[9px] text-gray-600 uppercase font-bold">{track.pays || 'Global'}</div>
                    </td>
                    <td className="p-6">
                      <Link href={`/track/${track.id}`} className="text-gray-400 hover:text-white transition-colors text-sm italic">{track.nom_titre}</Link>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md text-gray-400 uppercase font-bold tracking-wider">{track.genre || 'Inconnu'}</span>
                    </td>
                    <td className="p-6 text-center">
                      <span className="font-mono font-black text-blue-400 text-xl inline-flex items-center gap-2">
                        <PointsPearl size="sm" /> {Math.round(track.points || 0)}
                      </span>
                    </td>
                    <td className="p-6 text-center">
                      <div className="flex justify-center"><Likesbutton trackId={track.id} trackOwnerId={track.user_id} vuesActuelles={track.vues_actuelles || 0} initialLikes={track.likes || 0} onVoteChange={fetchLatest} size="md" /></div>
                    </td>
                    <td className="p-6 text-center font-mono text-[10px] text-gray-500">{(track.vues_actuelles || 0).toLocaleString('fr-FR')}</td>
                    <td className="p-6 text-center">
                      <button onClick={() => setSelectedTrack(track)} className="bg-black border border-green-500/50 text-green-400 px-4 py-1.5 rounded-full text-[10px] font-black hover:bg-green-500 hover:text-black transition-all uppercase tracking-widest">📡 SCAN</button>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <Link href={`/profil/${track.digger?.id || track.user_id}`} className="text-blue-500/80 font-black text-[10px] uppercase hover:text-blue-400">@{track.digger?.username || 'Anonyme'}</Link>
                        <EquippedBadgesInline badgeIds={[track.digger?.equipped_badge_1, track.digger?.equipped_badge_2]} size="xs" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTrack && (
        <div className="fixed bottom-6 right-6 z-[101] w-[320px] bg-[#050505] border-2 border-green-500/30 rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden flex flex-col">
          <div className="p-3 flex justify-between items-center bg-green-500/10 border-b border-green-500/20">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] font-black uppercase text-green-400 truncate">{selectedTrack.nom_artiste} — {selectedTrack.nom_titre}</p>
            </div>
            <button onClick={() => setSelectedTrack(null)} className="text-green-500 hover:text-white text-xs px-2">✕</button>
          </div>
          <div className="aspect-video w-full">
            {(selectedTrack.youtube_id || getEmbedUrl(selectedTrack.youtube_url)) ? (
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${selectedTrack.youtube_id || getEmbedUrl(selectedTrack.youtube_url)}?autoplay=1&rel=0&modestbranding=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen title="Lecteur YouTube"></iframe>
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center text-xs text-slate-400 px-4 text-center">Lien YouTube invalide.</div>
            )}
          </div>
            <div className="p-4 bg-black flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] text-gray-500 font-black uppercase">Statut Sonar</span>
                <span className="text-[10px] text-green-500 font-mono uppercase tracking-tighter">Scan en cours...</span>
              </div>
              <div className="transform scale-125 origin-right">
                <Likesbutton trackId={selectedTrack.id} trackOwnerId={selectedTrack.user_id} vuesActuelles={selectedTrack.vues_actuelles || 0} initialLikes={selectedTrack.likes || 0} onVoteChange={fetchLatest} size="md" />
              </div>
            </div>
        </div>
      )}
    </div>
  )
}

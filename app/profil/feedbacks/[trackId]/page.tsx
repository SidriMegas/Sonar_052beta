"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function FeedbacksPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [track, setTrack] = useState<any>(null)
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [ratingId, setRatingId] = useState<string | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const params = useParams()
  const trackId = params?.trackId as string
  const router = useRouter()

  // Points par étoile
  const POINTS_BY_STARS = {
    0: 0,
    1: 0,
    2: 5,
    3: 10,
    4: 20,
    5: 30
  }

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth')
        return
      }
      setUser(session.user)

      // Récupérer le profil
      const { data: profileData } = await supabase
        .from('digger')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Récupérer la musique
      const { data: trackData } = await supabase
        .from('titre')
        .select('*')
        .eq('id', trackId)
        .single()

      if (trackData) {
        setTrack(trackData)
      }

      // Récupérer les feedbacks
      const { data: feedbacksData } = await supabase
        .from('feedback')
        .select('*')
        .eq('titre_id', trackId)
        .order('created_at', { ascending: false })

      if (feedbacksData) {
        setFeedbacks(feedbacksData || [])
      }

      setLoading(false)
    }

    if (trackId) fetch()
  }, [trackId, router])

  // Noter un feedback
  const handleRateFeedback = async (feedbackId: string, stars: number) => {
    try {
      setRatingId(feedbackId)
      setRatingValue(stars)

      // Mettre à jour la note
      const { error } = await supabase
        .from('feedback')
        .update({ note: stars })
        .eq('id', feedbackId)

      if (error) throw error

      // Calculer les points
      const points = POINTS_BY_STARS[stars as keyof typeof POINTS_BY_STARS]

      // Ajouter à points_history
      if (points > 0) {
        await supabase.from('points_history').insert({
          user_id: user.id,
          amount: points,
          type: 'feedback_rated',
          reason: `Feedback noté ${stars}⭐ pour "${track.nom_titre}"`
        })

        // Mettre à jour le total points du digger
        const { data: currentDigger } = await supabase
          .from('digger')
          .select('points')
          .eq('id', user.id)
          .single()

        const newPoints = (currentDigger?.points || 0) + points

        await supabase
          .from('digger')
          .update({ points: newPoints })
          .eq('id', user.id)
      }

      // Mettre à jour le feedback dans la liste
      setFeedbacks(prev =>
        prev.map(f => f.id === feedbackId ? { ...f, note: stars } : f)
      )

      setMessage(`✅ Feedback noté ${stars}⭐ (+${points} perles)`)
      setTimeout(() => setMessage(''), 3000)

      setTimeout(() => {
        setRatingId(null)
        setRatingValue(0)
      }, 500)
    } catch (err: any) {
      setMessage(`❌ ${err.message}`)
    }
  }

  if (loading) {
    return <div className="bg-black min-h-screen flex items-center justify-center text-white pt-20">Chargement...</div>
  }

  // Vérifier que c'est l'artiste qui accède à cette page
  const isArtist = track?.youtube_channel_id === profile?.youtube_channel_id

  return (
    <div className="bg-black min-h-screen text-white pt-20 pb-10">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">

        {/* HEADER */}
        <Link href="/profil" className="text-purple-400 hover:text-purple-300 mb-6 inline-block font-black uppercase text-sm">
          ← RETOUR
        </Link>

        {track && (
          <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-2xl p-6 mb-8">
            <h1 className="text-3xl sm:text-4xl font-black uppercase italic mb-2">{track.nom_titre}</h1>
            <p className="text-gray-400 text-lg mb-4">{track.nom_artiste}</p>
            <div className="flex gap-4 text-sm">
              <span>❤️ {track.likes || 0} likes</span>
              <span>👁️ {(track.vues_actuelles || 0).toLocaleString()} vues</span>
              <span>💬 {feedbacks.length} retours</span>
            </div>

            {!isArtist && (
              <div className="mt-4 p-3 bg-orange-900/20 text-orange-400 rounded-lg text-sm">
                ⚠️ Seul l'artiste peut noter les feedbacks
              </div>
            )}
          </div>
        )}

        {/* MESSAGE */}
        {message && (
          <div className={`p-3 rounded-lg text-center font-bold text-sm mb-6 ${message.includes('✅') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
            {message}
          </div>
        )}

        {/* FEEDBACKS */}
        {feedbacks.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-lg">Aucun retour pour cette musique</p>
            <p className="text-gray-600 text-sm mt-2">Les avis apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map(feedback => {
              const expanded = expandedId === feedback.id
              const isRating = ratingId === feedback.id
              
              return (
                <div
                  key={feedback.id}
                  className={`bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all ${
                    expanded ? 'p-6' : 'p-4 cursor-pointer hover:border-purple-500/30'
                  }`}
                  onClick={() => !expanded && setExpandedId(feedback.id)}
                >
                  {/* HEADER - TOUJOURS VISIBLE */}
                  <div className="flex items-start justify-between gap-4 mb-3 sm:mb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                        Retour #{feedback.id.slice(0, 8)}
                      </p>
                      {!expanded && (
                        <p className="text-sm text-gray-300 line-clamp-2">{feedback.contenu}</p>
                      )}
                    </div>

                    {/* RATING DISPLAY */}
                    <div className="flex-shrink-0 text-right">
                      {feedback.note ? (
                        <div className="text-lg font-black text-yellow-400">
                          {'⭐'.repeat(feedback.note)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Non noté</div>
                      )}
                    </div>
                  </div>

                  {/* CONTENU DÉPLOYÉ */}
                  {expanded && (
                    <>
                      <div className="mb-4 p-4 bg-black/50 rounded-lg border border-white/10">
                        <p className="text-sm text-gray-300 mb-3">{feedback.contenu}</p>
                        <p className="text-xs text-gray-500">
                          📅 {new Date(feedback.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>

                      {/* NOTATION - SEULEMENT SI ARTISTE */}
                      {isArtist && (
                        <div className={`p-4 rounded-lg border transition-all ${
                          isRating 
                            ? 'border-purple-500 bg-purple-900/20' 
                            : 'border-white/10 bg-black/50'
                        }`}>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-3">
                            {feedback.note ? '✅ Noté' : 'Noter ce retour'}
                          </p>
                          <div className="flex justify-between gap-2">
                            {[1, 2, 3, 4, 5].map(stars => (
                              <button
                                key={stars}
                                onClick={() => handleRateFeedback(feedback.id, stars)}
                                disabled={isRating && ratingValue !== stars}
                                className={`flex-1 py-2 rounded-lg font-black text-sm transition-all ${
                                  feedback.note === stars || (isRating && ratingValue === stars)
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                } disabled:opacity-50`}
                              >
                                ⭐ {stars}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            {feedback.note && feedback.note > 0 && (
                              <span className="text-green-400">+{POINTS_BY_STARS[feedback.note as keyof typeof POINTS_BY_STARS]} perles</span>
                            )}
                          </p>
                        </div>
                      )}

                      {!isArtist && feedback.note && (
                        <div className="p-3 bg-green-900/20 text-green-400 rounded-lg text-xs text-center">
                          ✅ Noté {feedback.note}⭐ • +{POINTS_BY_STARS[feedback.note as keyof typeof POINTS_BY_STARS]} perles
                        </div>
                      )}

                      {/* FERMER */}
                      <button
                        onClick={() => setExpandedId(null)}
                        className="w-full mt-4 py-2 border border-gray-600 text-gray-400 hover:bg-white/5 rounded-lg font-bold text-sm transition-all"
                      >
                        ↑ REPLIER
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
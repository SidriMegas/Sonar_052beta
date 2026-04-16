import { supabase } from './supabase'

/**
 * CRÉER UNE NOTIFICATION
 */
export async function createNotification(
  userId: string,
  type: 'pari_resolved' | 'pari_won' | 'pari_lost' | 'like' | 'bottle_like' | 'top100' | 'quest_ready',
  title: string,
  message: string,
  trackId?: string
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([
      {
        user_id: userId,
        type: type,
        title: title,
        message: message,
        related_titre_id: trackId,
      },
    ])
    .select('id')
    .limit(1)

  if (error) {
    console.error('Erreur création notification détaillée:', JSON.stringify(error, null, 2))
    return false
  }
  return Boolean(data && data.length > 0)
}

/**
 * RÉCUPÉRER LES NOTIFICATIONS NON LUES
 * Correction : On ne fait que le SELECT ici.
 */
export async function getUnreadNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false) // On ne récupère que ce qui n'est pas lu
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erreur getUnreadNotifications:', error)
    return []
  }
  return data || []
}

/**
 * MARQUER UNE NOTIFICATION COMME LUE
 */
export async function markNotificationAsRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select('id')
    .limit(1)

  if (error) {
    console.error('Erreur markNotificationAsRead:', error)
    return false
  }

  return Boolean(data && data.length > 0)
}

/**
 * MARQUER TOUTES LES NOTIFICATIONS COMME LUES
 */
export async function markAllNotificationsAsRead(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
    .select('id')

  if (error) {
    console.error('Erreur markAllNotificationsAsRead:', error)
    return false
  }

  return Array.isArray(data)
}

/**
 * SUPPRIMER UNE NOTIFICATION
 */
export async function deleteNotification(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .select('id')
    .limit(1)

  if (error) {
    console.error('Erreur deleteNotification:', error)
    return false
  }

  return Boolean(data && data.length > 0)
}

export async function deleteAllNotifications(notificationIds: string[]) {
  if (!notificationIds.length) return true
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .in('id', notificationIds)
    .select('id')

  if (error) {
    console.error('Erreur deleteAllNotifications:', error)
    return false
  }

  return Array.isArray(data) && data.length === notificationIds.length
}

/**
 * VÉRIFIER ET NOTIFIER si des titres d'un user sont dans le top100 d'un tableau.
 * Utilise localStorage pour n'envoyer la notif qu'une seule fois par entrée.
 */
export async function checkTop100TracksAndNotify(
  userId: string,
  tableKey: string,
  sortedTracks: Array<{ id: string; user_id: string; nom_titre?: string; nom_artiste?: string }>,
  limit = 100,
) {
  if (!userId || typeof window === 'undefined') return

  const top = sortedTracks.slice(0, limit)
  for (const track of top) {
    if (track.user_id !== userId) continue
    const key = `top100:${tableKey}:${track.id}`
    if (localStorage.getItem(key)) continue
    await createNotification(
      userId,
      'top100',
      `Top ${limit} ${tableKey} 🏆`,
      `Ton titre "${track.nom_artiste} - ${track.nom_titre}" est entré dans le top ${limit} du classement ${tableKey} !`,
      track.id,
    )
    localStorage.setItem(key, '1')
  }
}

/**
 * VÉRIFIER ET NOTIFIER si un score de jeu est dans le top100.
 * La clé inclut le score pour re-notifier si le score s'améliore et entre à nouveau.
 */
export async function checkTop100ScoreAndNotify(
  userId: string,
  gameKey: string,
  score: number,
  rank: number,
  limit = 100,
) {
  if (!userId || typeof window === 'undefined') return
  if (rank > limit) return
  const key = `top100:score:${gameKey}:${userId}:${score}`
  if (localStorage.getItem(key)) return
  await createNotification(
    userId,
    'top100',
    `Top ${limit} ${gameKey} 🎮`,
    `Ton score de ${score} au jeu "${gameKey}" est dans le top ${limit} !`,
  )
  localStorage.setItem(key, String(rank))
}
"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { deleteNotification, markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/notifications'
import { USER_QUEST_DEFINITIONS } from '@/lib/quests'

type NotificationRow = {
  id: string
  user_id: string
  type: string | null
  title: string | null
  message: string | null
  read: boolean | null
  created_at: string | null
  related_pari_id?: string | null
  related_titre_id?: string | null
}

const MAX_NOTIFICATIONS = 30

function getSeenStorageKey(userId: string) {
  return `notifications:seen:${userId}`
}

function getHiddenStorageKey(userId: string) {
  return `notifications:hidden:${userId}`
}

function readStoredIds(key: string) {
  if (typeof window === 'undefined') return new Set<string>()

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set<string>()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function writeStoredIds(key: string, values: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(Array.from(values)))
}

function getProgressionViewFromQuestId(questId: string) {
  if (questId.startsWith('throne-')) return 'throne'
  if (questId.startsWith('paris-')) return 'pmu'
  if (questId.startsWith('playlist-')) return 'playlist'
  if (questId.startsWith('vue-')) return 'vue'
  if (questId.startsWith('bottle-')) return 'bouteille'
  if (questId.startsWith('coffre-')) return 'coffre'
  if (questId.startsWith('feedback-')) return 'feedback'
  if (questId.startsWith('profile-') || questId.startsWith('artist-')) return 'general'
  return 'overview'
}

function getQuestViewFromNotificationTitle(title: string) {
  const prefix = 'Quete terminee: '
  if (!title.startsWith(prefix)) return 'overview'
  const questTitle = title.slice(prefix.length).trim()
  const quest = USER_QUEST_DEFINITIONS.find((entry) => entry.title === questTitle)
  return quest ? getProgressionViewFromQuestId(quest.id) : 'overview'
}

function getNotificationIcon(type: string | null) {
  switch (type) {
    case 'pari_won':
    case 'pari_win':
      return '🏆'
    case 'pari_lost':
      return '❌'
    case 'pari_resolved':
      return '📊'
    case 'like':
    case 'bottle_like':
      return '❤️'
    case 'quest_ready':
      return '🎯'
    case 'playlist_added':
      return '🎵'
    case 'new_follower':
      return '👤'
    case 'top100':
      return '🚀'
    default:
      return '📢'
  }
}

function formatNotificationTime(dateValue: string | null) {
  if (!dateValue) return ''

  const timestamp = new Date(dateValue).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000))

  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Il y a ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Il y a ${diffDays} j`

  return new Date(dateValue).toLocaleDateString('fr-FR')
}

export default function NotificationsPanel() {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [baseTitle] = useState(() => (typeof document === 'undefined' ? '' : document.title))
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !hiddenIds.has(notification.id)),
    [notifications, hiddenIds],
  )

  const unreadCount = useMemo(
    () => visibleNotifications.reduce((count, notification) => count + (seenIds.has(notification.id) ? 0 : 1), 0),
    [visibleNotifications, seenIds],
  )

  const loadNotifications = async (nextUserId: string | null) => {
    setUserId(nextUserId)

    if (!nextUserId) {
      setNotifications([])
      setSeenIds(new Set())
      setHiddenIds(new Set())
      setIsLoading(false)
      return
    }

    setSeenIds(readStoredIds(getSeenStorageKey(nextUserId)))
    setHiddenIds(readStoredIds(getHiddenStorageKey(nextUserId)))

    setIsLoading(true)

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, read, created_at, related_pari_id, related_titre_id')
      .eq('user_id', nextUserId)
      .order('created_at', { ascending: false })
      .limit(MAX_NOTIFICATIONS)

    if (error) {
      console.error('Erreur chargement notifications:', error)
      setNotifications([])
      setIsLoading(false)
      return
    }

    setNotifications((data || []) as NotificationRow[])
    setIsLoading(false)
  }

  useEffect(() => {
    let alive = true

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!alive) return
      await loadNotifications(user?.id || null)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') {
        return
      }

      if (!alive) return
      await loadNotifications(session?.user?.id || null)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!baseTitle) return
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle

    return () => {
      document.title = baseTitle
    }
  }, [unreadCount, baseTitle])

  useEffect(() => {
    if (!userId) return
    writeStoredIds(getSeenStorageKey(userId), seenIds)
  }, [seenIds, userId])

  useEffect(() => {
    if (!userId) return
    writeStoredIds(getHiddenStorageKey(userId), hiddenIds)
  }, [hiddenIds, userId])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-panel:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await loadNotifications(userId)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleNotificationRoute = (notification: NotificationRow) => {
    if (notification.related_pari_id) {
      router.push('/jeux/paris')
      return
    }

    if (notification.type === 'like' && notification.related_titre_id) {
      router.push(`/track/${notification.related_titre_id}`)
      return
    }

    if (notification.type === 'quest_ready') {
      const view = getQuestViewFromNotificationTitle(notification.title || '')
      router.push(`/profil?panel=progression&view=${view}`)
    }
  }

  const handleOpenPanel = async () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)

    if (!nextOpen || !userId || unreadCount === 0) {
      return
    }

    const nextSeenIds = new Set(seenIds)
    visibleNotifications.forEach((notification) => {
      nextSeenIds.add(notification.id)
    })
    setSeenIds(nextSeenIds)

    setNotifications((current) => current.map((notification) => (
      nextSeenIds.has(notification.id) ? { ...notification, read: true } : notification
    )))

    const success = await markAllNotificationsAsRead(userId)
    if (!success) {
      console.warn('Notifications marquees comme vues localement, mais la mise a jour distante a echoue.')
    }
  }

  const handleNotificationClick = async (notification: NotificationRow) => {
    if (!seenIds.has(notification.id)) {
      const nextSeenIds = new Set(seenIds)
      nextSeenIds.add(notification.id)
      setSeenIds(nextSeenIds)

      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item))
      const success = await markNotificationAsRead(notification.id)
      if (!success) {
        console.warn('Notification marquee comme vue localement, mais la mise a jour distante a echoue.')
      }
    }

    setIsOpen(false)
    handleNotificationRoute(notification)
  }

  const handleDelete = async (notificationId: string) => {
    const previous = notifications
    const previousHiddenIds = new Set(hiddenIds)
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId))
    setHiddenIds((current) => {
      const next = new Set(current)
      next.add(notificationId)
      return next
    })

    const success = await deleteNotification(notificationId)
    if (!success) {
      setNotifications(previous)
      setHiddenIds(previousHiddenIds)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        ref={buttonRef}
        onClick={handleOpenPanel}
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
          isOpen
            ? 'border-white/18 bg-white/12 shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
            : 'border-transparent bg-transparent hover:border-white/10 hover:bg-white/8'
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-[0_0_16px_rgba(239,68,68,0.55)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-50 flex w-[360px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#090909]/96 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:w-[420px]">
          <div className="border-b border-white/8 bg-white/[0.04] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Centre de notifications</p>
                <h3 className="mt-1 text-sm font-black uppercase tracking-[0.16em] text-white">Notifications</h3>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-300">
                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
              </div>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm italic text-gray-500">Chargement des notifications...</div>
            ) : visibleNotifications.length === 0 ? (
              <div className="p-10 text-center text-sm italic text-gray-600">Aucune notification pour le moment</div>
            ) : (
              <div className="divide-y divide-white/6">
                {visibleNotifications.map((notification) => {
                  const icon = getNotificationIcon(notification.type)
                  const isSeen = seenIds.has(notification.id)

                  return (
                    <div
                      key={notification.id}
                      className={`group relative flex gap-3 px-4 py-4 transition-colors ${
                        isSeen ? 'bg-transparent opacity-60 hover:bg-white/[0.03] hover:opacity-100' : 'bg-white/[0.05] hover:bg-white/[0.08]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-lg">
                          {icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-sm font-bold ${isSeen ? 'text-gray-300' : 'text-white'}`}>
                              {notification.title || 'Notification'}
                            </p>
                            {!isSeen && (
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                            )}
                          </div>

                          {notification.message ? (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{notification.message}</p>
                          ) : null}

                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600">
                            {formatNotificationTime(notification.created_at)}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(notification.id)}
                        className="shrink-0 self-start rounded-full p-2 text-gray-700 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        aria-label="Supprimer la notification"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import PointsPearl from '@/app/components/PointsPearl'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { getFollowState } from '@/lib/social'
import { getLevelInfo } from '@/lib/levels'
import { USER_QUEST_DEFINITIONS, getQuestCategory, getQuestSpeedLabel, sortQuestsByFastest, type QuestCategoryId, type UserQuestDefinition } from '@/lib/quests'
import type { TrackSummary } from '@/lib/types/track'
import { claimQuestReward, getUserQuestStatuses, markQuestNotified, type UserQuestStatus } from '@/lib/user-quests'
import AdminVerificationBadge from '@/app/components/AdminVerificationBadge'
import AvatarCropperModal from '@/app/components/AvatarCropperModal'
import BadgeIcon from '@/app/components/BadgeIcon'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'
import LevelBadge from '@/app/components/LevelBadge'
import QuestBadgePreview from '@/app/components/QuestBadgePreview'
import { resolveBadgeDisplay, type BadgeDefinitionRecord, type ResolvedBadgeDisplay } from '@/lib/badge-display'

type ProfileData = {
  id: string
  username: string
  role?: string | null
  biographie?: string | null
  instagram_url?: string | null
  x_url?: string | null
  soundcloud_url?: string | null
  spotify_url?: string | null
  avatar_url?: string | null
  youtube_channel_id?: string | null
  points?: number | null
  equipped_badge_1?: string | null
  equipped_badge_2?: string | null
}

type PointHistoryEntry = {
  amount: number | null
  type: string | null
  reason: string | null
  created_at: string | null
}

type BadgeDefinition = {
  id: string
  name: string
  description: string | null
  image_url?: string | null
}

type BadgeCatalogEntry = {
  id: string
  name: string
  variantCount: number
}

type UserBadgeUnlock = {
  badge_id: string
  created_at: string | null
  badge: BadgeDefinition | null
}

type TrophyBadgeEntry = {
  badgeId: string
  unlocked: boolean
  unlockedAt: string | null
  display: ResolvedBadgeDisplay
}

type VoteHistoryEntry = {
  titre_id: string
  created_at: string | null
  points: number | null
  track: TrackSummary | null
}

type FeedbackEntry = {
  id: string
  titre_id: string
  contenu: string
  note: number | null
  created_at: string | null
  track: TrackSummary | null
}

type DailyLoginClaim = {
  claim_date?: string | null
  day_number?: number | null
  reward_label?: string | null
  reward_points?: number | null
}

type DailyLoginState = {
  streak_day: number
  current_day: number
  claimed_today: boolean
  claims: DailyLoginClaim[]
}

type LeaderboardRanks = {
  digger: number | null
  last: number | null
  musique: number | null
  prod: number | null
  'jeu-vue': number | null
  'jeu-paris': number | null
  'jeu-playlist': number | null
}

type QuestProgressCard = {
  id: string
  title: string
  description: string
  category: QuestCategoryId
  categoryLabel: string
  groupKey: string
  progressPercent: number
  completed: boolean
  progressLabel: string
  rewardLabel: string
  speedLabel: string
  target: number
  pearlReward: number
  xpReward: number
  seriesLabel?: string
  badgeLabel?: string | null
  badgeId?: string | null
  badgeFamily?: string | null
  badgeVisualLabel?: string | null
  badgeTierLabel?: string | null
  badgeName?: string | null
  badgeDescription?: string | null
}

type QuestSeriesGroup = {
  key: string
  title: string
  cards: QuestProgressCard[]
  representative: QuestProgressCard
}

type ExtraQuestStats = {
  sharesToday: number
  likesSentToday: number
  coffreAttemptsToday: number
  coffreAttemptsTotal: number
  coffreUnlockCount: number
  bottleSentCount: number
  vueGamesPlayed: number
  vueBestScore: number
  vueWarmupPerfectCount: number
  throneVotesToday: number
  throneVotesTotal: number
  playlistVotesToday: number
  playlistVotesTotal: number
  playlistSuggestionsTotal: number
  playlistBestDurationDays: number
  playlistParticipationStreak: number
  playlistFinalCount: number
  parisProposalCount: number
  parisAcceptedCount: number
  betCount: number
  betWonCount: number
  betLostCount: number
  totalBetAmount: number
  throneReignDays: number
  autopromoReignDays: number
}

type ProgressionView = 'overview' | 'completed' | 'general' | 'throne' | 'pmu' | 'playlist' | 'vue' | 'bouteille' | 'coffre' | 'feedback'

type ProgressionMenuItem = {
  id: ProgressionView
  label: string
  description: string
}

type ActivityItem = {
  id: string
  date: string | null | undefined
  label: string
  title: string
  body: string
  href: string
}

type ProfilePanel = 'flux' | 'progression' | 'statistiques' | 'feedbacks' | 'galerie'

const DEFAULT_LEADERBOARD_RANKS: LeaderboardRanks = {
  digger: null,
  last: null,
  musique: null,
  prod: null,
  'jeu-vue': null,
  'jeu-paris': null,
  'jeu-playlist': null,
}

const EMPTY_EXTRA_QUEST_STATS: ExtraQuestStats = {
  sharesToday: 0,
  likesSentToday: 0,
  coffreAttemptsToday: 0,
  coffreAttemptsTotal: 0,
  coffreUnlockCount: 0,
  bottleSentCount: 0,
  vueGamesPlayed: 0,
  vueBestScore: 0,
  vueWarmupPerfectCount: 0,
  throneVotesToday: 0,
  throneVotesTotal: 0,
  playlistVotesToday: 0,
  playlistVotesTotal: 0,
  playlistSuggestionsTotal: 0,
  playlistBestDurationDays: 0,
  playlistParticipationStreak: 0,
  playlistFinalCount: 0,
  parisProposalCount: 0,
  parisAcceptedCount: 0,
  betCount: 0,
  betWonCount: 0,
  betLostCount: 0,
  totalBetAmount: 0,
  throneReignDays: 0,
  autopromoReignDays: 0,
}

const POINT_TYPE_LABELS: Record<string, string> = {
  like: 'Like envoye',
  game: 'Jeu',
  quest: 'Quete',
  bet: 'Pari',
  daily_bonus: 'Connexion',
  feedback_rated: 'Feedback juge',
  purchase: 'Achat',
  refund: 'Remboursement',
}

const PROGRESSION_MENU: ProgressionMenuItem[] = [
  { id: 'overview', label: 'Apercu', description: 'Quetes du jour plus les quetes bientot terminees.' },
  { id: 'completed', label: 'Quetes terminer', description: 'Toutes les quetes terminees, validees ou en attente de validation.' },
  { id: 'general', label: 'General', description: 'Classements, quetes de like et quetes de partage.' },
  { id: 'throne', label: 'Trone des abysses', description: 'Quetes liees au jeu du Trone des abysses.' },
  { id: 'pmu', label: 'PMU des abysses', description: 'Quetes liees au PMU des abysses.' },
  { id: 'playlist', label: 'Playlist democratique', description: 'Quetes liees a Playlist democratique.' },
  { id: 'vue', label: 'Jeux des vues', description: 'Quetes liees au jeu des vues.' },
  { id: 'bouteille', label: 'Bouteille', description: 'Quetes liees au jeu Bouteille.' },
  { id: 'coffre', label: 'Coffre fort', description: 'Quetes liees au Coffre fort.' },
  { id: 'feedback', label: 'Feedback', description: 'Quetes liees aux feedbacks.' },
]

const PROGRESSION_DETAIL_MENU = PROGRESSION_MENU.filter(
  (item): item is ProgressionMenuItem & { id: Exclude<ProgressionView, 'overview'> } => item.id !== 'overview'
)

function formatNumber(value: number) {
  return value.toLocaleString('fr-FR')
}

function formatDate(value?: string | null) {
  if (!value) return 'Date inconnue'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Date inconnue'
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}...`
}

function dedupeTracks(tracks: TrackSummary[]) {
  const map = new Map<string, TrackSummary>()
  tracks.forEach((track) => {
    map.set(track.id, track)
  })
  return Array.from(map.values())
}

function findRankForUser(rows: Array<{ user_id?: string | null }>, userId: string) {
  const index = rows.findIndex((row) => row.user_id === userId)
  return index >= 0 ? index + 1 : null
}

function findBestTrackRank(rows: Array<{ user_id?: string | null }>, userId: string) {
  let bestRank: number | null = null
  rows.forEach((row, index) => {
    if (row.user_id !== userId) return
    const rank = index + 1
    if (bestRank === null || rank < bestRank) bestRank = rank
  })
  return bestRank
}

function getQuestProgressPercent(current: number, target: number) {
  if (target <= 0) return 0
  return Math.max(0, Math.min((current / target) * 100, 100))
}

function getRankQuestProgressPercent(rank: number | null, targetRank: number) {
  if (!rank || rank <= 0) return 0
  if (rank <= targetRank) return 100
  return Math.max(0, Math.min((targetRank / rank) * 100, 100))
}

function isSameLocalDay(value: string | null | undefined) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function getReignDays(rows: Array<{ mode: string | null; starts_at: string | null; ends_at: string | null; king_titre_id: string | null }>, ownedTrackIds: Set<string>) {
  const nowTs = Date.now()
  let globalDays = 0
  let autopromoDays = 0

  rows.forEach((row) => {
    if (!row.king_titre_id || !ownedTrackIds.has(row.king_titre_id) || !row.starts_at) return
    const startsAt = new Date(row.starts_at).getTime()
    if (Number.isNaN(startsAt)) return
    const endsAtRaw = row.ends_at ? new Date(row.ends_at).getTime() : nowTs
    const endsAt = Number.isNaN(endsAtRaw) ? nowTs : Math.min(endsAtRaw, nowTs)
    const days = Math.max(0, Math.floor((endsAt - startsAt) / (1000 * 60 * 60 * 24)))
    if (row.mode === 'autopromo') {
      autopromoDays += days
      return
    }
    globalDays += days
  })

  return {
    throneReignDays: globalDays,
    autopromoReignDays: autopromoDays,
  }
}

function getActivityDayStreak(values: Array<string | null | undefined>) {
  const uniqueDays = Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => {
          const date = new Date(value as string)
          if (Number.isNaN(date.getTime())) return null
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        })
        .filter(Boolean) as string[]
    )
  )

  if (uniqueDays.length === 0) return 0

  const timestamps = uniqueDays
    .map((day) => {
      const [year, month, date] = day.split('-').map(Number)
      return new Date(year, month, date).setHours(0, 0, 0, 0)
    })
    .sort((left, right) => right - left)

  const today = new Date()
  const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const yesterdayTs = todayTs - 24 * 60 * 60 * 1000

  if (timestamps[0] !== todayTs && timestamps[0] !== yesterdayTs) return 0

  let streak = 1
  for (let index = 1; index < timestamps.length; index += 1) {
    if (timestamps[index - 1] - timestamps[index] !== 24 * 60 * 60 * 1000) break
    streak += 1
  }

  return streak
}

function getLeaderboardRankForQuest(quest: UserQuestDefinition, leaderboardRanks: LeaderboardRanks) {
  const family = quest.badgeReward?.family
  if (!family) return null
  if (family === 'trophy-digger') return leaderboardRanks.digger
  if (family === 'trophy-last') return leaderboardRanks.last
  if (family === 'trophy-musique') return leaderboardRanks.musique
  if (family === 'trophy-prod') return leaderboardRanks.prod
  if (family === 'trophy-jeu-vue') return leaderboardRanks['jeu-vue']
  if (family === 'trophy-jeu-paris') return leaderboardRanks['jeu-paris']
  if (family === 'trophy-jeu-playlist') return leaderboardRanks['jeu-playlist']
  return null
}

function getQuestBadgeId(quest: UserQuestDefinition) {
  return quest.badgeReward ? `quest-${quest.id}` : null
}

function getQuestBadgeName(quest: UserQuestDefinition) {
  return quest.badgeReward ? `${quest.badgeReward.label} ${quest.badgeReward.tierLabel}` : null
}

function getQuestBadgeDescription(quest: UserQuestDefinition) {
  return quest.badgeReward ? `Badge obtenu en validant la quete "${quest.title}".` : null
}

function getQuestCurrentValue(params: {
  quest: UserQuestDefinition
  shareCount: number
  likesSentCount: number
  likesReceivedCount: number
  feedbackGivenCount: number
  feedbackReceivedCount: number
  followingCount: number
  followersCount: number
  streakDays: number
  arenaGamesVisited: number
  stats: ExtraQuestStats
}) {
  const {
    quest,
    shareCount,
    likesSentCount,
    likesReceivedCount,
    feedbackGivenCount,
    feedbackReceivedCount,
    followingCount,
    followersCount,
    streakDays,
    arenaGamesVisited,
    stats,
  } = params

  if (quest.category === 'journaliere') {
    if (quest.id === 'daily-share-one-track') return stats.sharesToday
    if (quest.id === 'daily-like-two-tracks') return stats.likesSentToday
    if (quest.id === 'daily-coffre-attempt') return stats.coffreAttemptsToday
    if (quest.id === 'daily-vote-throne') return stats.throneVotesToday
    if (quest.id === 'daily-vote-playlist') return stats.playlistVotesToday
  }

  if (quest.category === 'profil') {
    if (quest.seriesLabel === 'Partager') return shareCount
    if (quest.seriesLabel === 'Like') return likesSentCount
    if (quest.seriesLabel === 'Proposer') return shareCount
    if (quest.seriesLabel === 'Connexion') return streakDays
  }

  if (quest.id.startsWith('feedback-give-')) return feedbackGivenCount

  if (quest.id.startsWith('throne-reign-')) return stats.throneReignDays
  if (quest.id.startsWith('throne-autopromo-reign-')) return stats.autopromoReignDays
  if (quest.id.startsWith('throne-advisor-')) return stats.throneVotesTotal
  if (quest.id.startsWith('coffre-attempt-')) return stats.coffreAttemptsTotal
  if (quest.id === 'coffre-unlock') return stats.coffreUnlockCount
  if (quest.id.startsWith('vue-play-')) return stats.vueGamesPlayed
  if (quest.id.startsWith('vue-score-')) return stats.vueBestScore
  if (quest.id === 'vue-warmup-perfect') return stats.vueWarmupPerfectCount
  if (quest.id.startsWith('paris-proposal-')) return stats.parisProposalCount
  if (quest.id.startsWith('paris-accepted-')) return stats.parisAcceptedCount
  if (quest.id.startsWith('paris-bet-')) return stats.betCount
  if (quest.id.startsWith('paris-win-')) return stats.betWonCount
  if (quest.id.startsWith('paris-loss-')) return stats.betLostCount
  if (quest.id.startsWith('paris-stake-')) return stats.totalBetAmount
  if (quest.id.startsWith('playlist-vote-')) return stats.playlistVotesTotal
  if (quest.id.startsWith('playlist-proposal-')) return stats.playlistSuggestionsTotal
  if (quest.id.startsWith('playlist-survive-')) return stats.playlistBestDurationDays
  if (quest.id === 'playlist-final') return stats.playlistFinalCount
  if (quest.id === 'playlist-streak-30') return stats.playlistParticipationStreak
  if (quest.id.startsWith('bottle-send-')) return stats.bottleSentCount

  if (quest.id === 'first-login-streak' || quest.id === 'streak-week' || quest.id === 'streak-month') return streakDays
  if (quest.id === 'first-follow' || quest.id === 'social-circle') return followingCount
  if (quest.id === 'followers-earned') return followersCount
  if (quest.id === 'first-bet' || quest.id === 'paris-regular') return stats.betCount
  if (quest.id === 'first-like' || quest.id === 'likes-scout') return likesSentCount
  if (quest.id === 'first-feedback' || quest.id === 'feedback-mentor') return feedbackGivenCount
  if (quest.id === 'first-share' || quest.id === 'three-shares') return shareCount
  if (quest.id === 'view-arena') return arenaGamesVisited
  if (quest.id === 'likes-earned') return likesReceivedCount
  if (quest.id === 'feedback-earned') return feedbackReceivedCount

  return 0
}

function buildQuestCards(params: {
  shareCount: number
  likesSentCount: number
  likesReceivedCount: number
  feedbackGivenCount: number
  feedbackReceivedCount: number
  followingCount: number
  followersCount: number
  streakDays: number
  arenaGamesVisited: number
  stats: ExtraQuestStats
  leaderboardRanks: LeaderboardRanks
}) {
  const {
    shareCount,
    likesSentCount,
    likesReceivedCount,
    feedbackGivenCount,
    feedbackReceivedCount,
    followingCount,
    followersCount,
    streakDays,
    arenaGamesVisited,
    stats,
    leaderboardRanks,
  } = params

  return sortQuestsByFastest(USER_QUEST_DEFINITIONS).map((quest) => {
    const category = getQuestCategory(quest.category)
    const isRankQuest = quest.category === 'profil' && quest.seriesLabel === 'Classement'
    const currentRank = isRankQuest ? getLeaderboardRankForQuest(quest, leaderboardRanks) : null
    const currentValue = isRankQuest
      ? currentRank
      : getQuestCurrentValue({
          quest,
          shareCount,
          likesSentCount,
          likesReceivedCount,
          feedbackGivenCount,
          feedbackReceivedCount,
          followingCount,
          followersCount,
          streakDays,
          arenaGamesVisited,
          stats,
        })

    const normalizedValue = Number(currentValue || 0)
    const completed = isRankQuest
      ? Boolean(currentRank && currentRank <= quest.target)
      : normalizedValue >= quest.target

    const progressPercent = isRankQuest
      ? getRankQuestProgressPercent(currentRank, quest.target)
      : getQuestProgressPercent(normalizedValue, quest.target)

    const progressLabel = isRankQuest
      ? completed
        ? `Rang actuel #${currentRank}`
        : currentRank
          ? `Rang actuel #${currentRank} • objectif top ${quest.target}`
          : `Non classe • objectif top ${quest.target}`
      : completed
        ? `${Math.min(normalizedValue, quest.target)}/${quest.target} atteint`
        : `${normalizedValue}/${quest.target} ${quest.unitLabel}`

    return {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      category: quest.category,
      categoryLabel: category.label,
      groupKey: quest.category === 'profil' && quest.seriesLabel === 'Classement' && quest.badgeReward?.family
        ? quest.badgeReward.family
        : `${quest.category}:${quest.seriesLabel || quest.id}`,
      progressPercent,
      completed,
      progressLabel,
      rewardLabel: `${quest.pearlReward} perles • ${quest.xpReward} XP`,
      speedLabel: getQuestSpeedLabel(quest.estimatedMinutes),
      target: quest.target,
      pearlReward: quest.pearlReward,
      xpReward: quest.xpReward,
      seriesLabel: quest.seriesLabel,
      badgeLabel: quest.badgeReward ? `${quest.badgeReward.label} • ${quest.badgeReward.tierLabel}` : null,
      badgeId: getQuestBadgeId(quest),
      badgeFamily: quest.badgeReward?.family || null,
      badgeVisualLabel: quest.badgeReward?.label || null,
      badgeTierLabel: quest.badgeReward?.tierLabel || null,
      badgeName: getQuestBadgeName(quest),
      badgeDescription: getQuestBadgeDescription(quest),
    } satisfies QuestProgressCard
  })
}

function getProgressionMenuItem(view: ProgressionView) {
  return PROGRESSION_MENU.find((item) => item.id === view) || PROGRESSION_MENU[0]
}

function filterQuestCardsForView(cards: QuestProgressCard[], view: Exclude<ProgressionView, 'overview'>) {
  if (view === 'completed') {
    return cards.filter((quest) => quest.completed)
  }

  if (view === 'general') {
    return cards.filter((quest) => quest.category === 'profil')
  }

  if (view === 'throne') {
    return cards.filter((quest) => quest.id.startsWith('throne-'))
  }

  if (view === 'pmu') {
    return cards.filter((quest) => quest.id.startsWith('paris-') || quest.id === 'first-bet' || quest.id === 'paris-regular')
  }

  if (view === 'playlist') {
    return cards.filter((quest) => quest.id.startsWith('playlist-'))
  }

  if (view === 'vue') {
    return cards.filter((quest) => quest.id.startsWith('vue-'))
  }

  if (view === 'bouteille') {
    return cards.filter((quest) => quest.id.startsWith('bottle-'))
  }

  if (view === 'coffre') {
    return cards.filter((quest) => quest.id.startsWith('coffre-'))
  }

  if (view === 'feedback') {
    return cards.filter((quest) => quest.category === 'feedback')
  }

  return []
}

function groupQuestCards(cards: QuestProgressCard[]) {
  const groups = new Map<string, QuestProgressCard[]>()

  cards.forEach((card) => {
    const list = groups.get(card.groupKey) || []
    list.push(card)
    groups.set(card.groupKey, list)
  })

  return Array.from(groups.entries())
    .map(([key, cardsInGroup]) => {
      const ordered = [...cardsInGroup].sort((left, right) => left.target - right.target)
      const representative = ordered.find((card) => !card.completed) || ordered[ordered.length - 1]

      return {
        key,
        title: representative.seriesLabel || representative.title,
        cards: ordered,
        representative,
      } satisfies QuestSeriesGroup
    })
    .sort((left, right) => {
      if (left.representative.completed !== right.representative.completed) return left.representative.completed ? 1 : -1
      return right.representative.progressPercent - left.representative.progressPercent
    })
}

function getVerdict(note: number | null) {
  if (!note) {
    return {
      label: 'En attente',
      className: 'border-white/10 bg-white/5 text-gray-300',
    }
  }

  if (note >= 4) {
    return {
      label: `${note} etoiles`,
      className: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    }
  }

  if (note === 3) {
    return {
      label: '3 etoiles',
      className: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    }
  }

  return {
    label: `${note} etoiles`,
    className: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  }
}

function ProfilPageContent() {
  const { user, loading: authLoading } = useAuth({ redirectTo: '/auth' })
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [userTracks, setUserTracks] = useState<TrackSummary[]>([])
  const [detectedTracks, setDetectedTracks] = useState<TrackSummary[]>([])
  const [likedTracks, setLikedTracks] = useState<VoteHistoryEntry[]>([])
  const [feedbackGiven, setFeedbackGiven] = useState<FeedbackEntry[]>([])
  const [feedbackReceived, setFeedbackReceived] = useState<FeedbackEntry[]>([])
  const [pointHistory, setPointHistory] = useState<PointHistoryEntry[]>([])
  const [badgeUnlocks, setBadgeUnlocks] = useState<UserBadgeUnlock[]>([])
  const [questStatuses, setQuestStatuses] = useState<UserQuestStatus[]>([])
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 })
  const [leaderboardRanks, setLeaderboardRanks] = useState<LeaderboardRanks>(DEFAULT_LEADERBOARD_RANKS)
  const [extraQuestStats, setExtraQuestStats] = useState<ExtraQuestStats>(EMPTY_EXTRA_QUEST_STATS)
  const [dailyState, setDailyState] = useState<DailyLoginState>({
    streak_day: 0,
    current_day: 1,
    claimed_today: false,
    claims: [],
  })
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    username: '',
    biographie: '',
    instagram_url: '',
    x_url: '',
    soundcloud_url: '',
    spotify_url: '',
  })
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [allBadgeDefinitions, setAllBadgeDefinitions] = useState<BadgeDefinition[]>([])
  const [selectedLockedBadgeId, setSelectedLockedBadgeId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<ProfilePanel>('flux')
  const [activeProgressionView, setActiveProgressionView] = useState<ProgressionView>('overview')
  const [expandedQuestGroups, setExpandedQuestGroups] = useState<string[]>([])
  const [claimingQuestIds, setClaimingQuestIds] = useState<string[]>([])
  const [equippingBadgeSlot, setEquippingBadgeSlot] = useState<1 | 2 | null>(null)
  const [badgePreview, setBadgePreview] = useState<{ equipped_badge_1: string | null; equipped_badge_2: string | null } | null>(null)
  const [showAvatarCropper, setShowAvatarCropper] = useState(false)
  const [avatarSourceImage, setAvatarSourceImage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [avatarDraftBlob, setAvatarDraftBlob] = useState<Blob | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    const panel = searchParams.get('panel')
    const view = searchParams.get('view') as ProgressionView | null

    if (panel === 'flux' || panel === 'progression' || panel === 'statistiques' || panel === 'feedbacks' || panel === 'galerie') {
      setActivePanel(panel)
    }

    if (view && PROGRESSION_MENU.some((item) => item.id === view)) {
      setActiveProgressionView(view)
    }
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return

    if (!user?.id) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchProfileDashboard = async () => {
      setLoading(true)

      try {
        setNewEmail(user.email || '')

        const { data: profileData, error: profileError } = await supabase
          .from('digger')
          .select('id, username, role, biographie, instagram_url, x_url, soundcloud_url, spotify_url, avatar_url, youtube_channel_id, points, equipped_badge_1, equipped_badge_2')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        if (!profileData) {
          setLoading(false)
          return
        }

        const nextProfile = profileData as ProfileData
        setProfile(nextProfile)
        setEditData({
          username: nextProfile.username,
          biographie: nextProfile.biographie || '',
          instagram_url: nextProfile.instagram_url || '',
          x_url: nextProfile.x_url || '',
          soundcloud_url: nextProfile.soundcloud_url || '',
          spotify_url: nextProfile.spotify_url || '',
        })

        const [postedResult, pointsResult, badgesResult, allBadgesResult, votesResult, feedbackSentResult, followResult, dailyResult, questStatusRows] = await Promise.all([
          supabase
            .from('titre')
            .select('id, user_id, nom_titre, nom_artiste, youtube_url, genre, sous_genre, pays, points, likes, vues_actuelles, vues_au_partage, feedback_enabled, created_at, youtube_channel_id, digger:user_id(id, username)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('points_history')
            .select('amount, type, reason, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', user.id)
            .order('badge_id', { ascending: true }),
          supabase
            .from('badges')
            .select('id, name, description, image_url')
            .limit(5000),
          supabase
            .from('vote')
            .select('titre_id, created_at, points')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(60),
          supabase
            .from('feedback')
            .select('id, titre_id, contenu, note, created_at')
            .eq('digger_id', user.id)
            .order('created_at', { ascending: false })
            .limit(80),
          getFollowState(user.id, user.id),
          supabase.rpc('fn_daily_login_state', { p_user_id: user.id }),
          getUserQuestStatuses(user.id),
        ])

        const nextUserTracks = (postedResult.data || []) as TrackSummary[]
        if (cancelled) return
        setUserTracks(nextUserTracks)
        setPointHistory((pointsResult.data || []) as PointHistoryEntry[])
        setQuestStatuses(questStatusRows)
        setAllBadgeDefinitions((allBadgesResult.data || []) as BadgeDefinition[])

        const badgeRows = (badgesResult.data || []) as Array<{ badge_id: string }>
        const allBadgeDefinitionsRows = (allBadgesResult.data || []) as BadgeDefinition[]
        if (badgeRows.length > 0) {
          const badgeMap = new Map<string, BadgeDefinition>()
          allBadgeDefinitionsRows.forEach((badge) => {
            badgeMap.set(badge.id, badge)
          })

          setBadgeUnlocks(
            badgeRows.map((badge) => ({
              ...badge,
              created_at: null,
              badge: badgeMap.get(badge.badge_id) || null,
            }))
          )
        } else {
          setBadgeUnlocks([])
        }

        setFollowStats({
          followers: followResult.data?.followers_count || 0,
          following: followResult.data?.following_count || 0,
        })

        const dailyPayload = Array.isArray(dailyResult.data) ? dailyResult.data[0] : dailyResult.data
        if (dailyPayload?.success) {
          setDailyState({
            streak_day: Number(dailyPayload.streak_day || 0),
            current_day: Number(dailyPayload.current_day || 1),
            claimed_today: Boolean(dailyPayload.claimed_today),
            claims: Array.isArray(dailyPayload.claims) ? (dailyPayload.claims as DailyLoginClaim[]) : [],
          })
        } else {
          setDailyState({
            streak_day: 0,
            current_day: 1,
            claimed_today: false,
            claims: [],
          })
        }

        setDetectedTracks([])
        setLikedTracks([])
        setFeedbackGiven(
          ((feedbackSentResult.data || []) as Array<{
            id: string
            titre_id: string
            contenu: string
            note: number | null
            created_at: string | null
          }>).map((entry) => ({
            ...entry,
            track: nextUserTracks.find((track) => track.id === entry.titre_id) || null,
          }))
        )
        setFeedbackReceived([])
        setExtraQuestStats(EMPTY_EXTRA_QUEST_STATS)
        setLeaderboardRanks(DEFAULT_LEADERBOARD_RANKS)
        setLoading(false)

        window.setTimeout(async () => {
          if (cancelled) return

          try {
            let nextDetectedTracks: TrackSummary[] = []
            if (nextProfile.youtube_channel_id) {
              const { data: detectedData } = await supabase
                .from('titre')
                .select('id, user_id, nom_titre, nom_artiste, likes, vues_actuelles, vues_au_partage, feedback_enabled, created_at, youtube_channel_id, points')
                .eq('youtube_channel_id', nextProfile.youtube_channel_id)
                .order('created_at', { ascending: false })

              nextDetectedTracks = (detectedData || []) as TrackSummary[]
            }

            const [throneVotesResult, playlistVotesResult, coffreAttemptsResult, playlistSuggestionsResult, throneRoundsResult, parisMisesResult, parisNotificationsResult, parisQuestionsResult, bottleSentResult, vueProfileResult] = await Promise.all([
              supabase.from('tlmvpsp_votes').select('created_at').eq('user_id', user.id).limit(1500),
              supabase.from('playlist_votes').select('created_at').eq('user_id', user.id).limit(1500),
              supabase.from('coffrefort_tentatives').select('created_at, is_correct').eq('user_id', user.id).limit(1500),
              supabase.from('playlist_suggestions').select('created_at').eq('user_id', user.id).limit(1500),
              supabase.from('tlmvpsp_rounds').select('mode, starts_at, ends_at, king_titre_id').limit(1500),
              supabase.from('paris_mises').select('montant').eq('user_id', user.id).limit(1500),
              supabase.from('notifications').select('type').eq('user_id', user.id).in('type', ['pari_won', 'pari_lost']).limit(1500),
              supabase.from('paris_questions').select('status, description').limit(1500),
              supabase.from('bottles').select('id').eq('user_id', user.id).limit(1500),
              supabase.from('vue_score').select('best_score, times_played, exact_guess_count').eq('user_id', user.id).maybeSingle(),
            ])

            if (cancelled) return
            setDetectedTracks(nextDetectedTracks)

            const ownedTracks = dedupeTracks([...nextUserTracks, ...nextDetectedTracks])
            const ownedTrackIds = ownedTracks.map((track) => track.id)
            const ownedTrackIdSet = new Set(ownedTrackIds)

            const throneVoteRows = (throneVotesResult.data || []) as Array<{ created_at: string | null }>
            const playlistVoteRows = (playlistVotesResult.data || []) as Array<{ created_at: string | null }>
            const coffreAttemptRows = (coffreAttemptsResult.data || []) as Array<{ created_at: string | null; is_correct: boolean | null }>
            const playlistSuggestionRows = (playlistSuggestionsResult.data || []) as Array<{ created_at: string | null }>
            const throneRoundRows = (throneRoundsResult.data || []) as Array<{ mode: string | null; starts_at: string | null; ends_at: string | null; king_titre_id: string | null }>
            const parisMiseRows = (parisMisesResult.data || []) as Array<{ montant: number | null }>
            const parisNotificationRows = (parisNotificationsResult.data || []) as Array<{ type: string | null }>
            const parisQuestionRows = (parisQuestionsResult.data || []) as Array<{ status: string | null; description: string | null }>
            const bottleSentRows = (bottleSentResult.data || []) as Array<{ id: string }>
            const vueProfileRow = (vueProfileResult.data || null) as { best_score?: number | null; times_played?: number | null; exact_guess_count?: number | null } | null
            const reignDays = getReignDays(throneRoundRows, ownedTrackIdSet)
            const suggestionSignatures = new Set([
              `Suggéré par ${nextProfile.username}`,
              `Suggéré par ${user.email || ''}`,
            ].filter(Boolean))
            const suggestedRows = parisQuestionRows.filter((row) => row.description ? suggestionSignatures.has(row.description) : false)

            const [diggerRankResult, lastRankResult, musiqueRankResult, prodRankResult, vueRankResult, parisRankResult, playlistRankResult] = await Promise.all([
              supabase.from('digger').select('id, points').order('points', { ascending: false }).limit(250),
              supabase.from('titre').select('id, user_id, created_at').not('type_partage', 'eq', 'production').order('created_at', { ascending: false }).limit(250),
              supabase.from('titre').select('id, user_id, points, created_at').not('type_partage', 'eq', 'production').order('points', { ascending: false }).order('created_at', { ascending: false }).limit(500),
              supabase.from('titre').select('id, user_id, points, created_at').eq('type_partage', 'production').order('created_at', { ascending: false }).limit(500),
              supabase.from('vue_score').select('user_id, best_score').order('best_score', { ascending: false }).limit(250),
              supabase.from('points_history').select('user_id, amount').eq('type', 'bet').gt('amount', 0).limit(1500),
              supabase.from('playlist_tracks').select('created_at, removed_at, expires_at, titre:titre_id(user_id)').limit(500),
            ])

            const diggerRows = (diggerRankResult.data || []) as Array<{ id: string; points: number | null }>
            const lastRows = (lastRankResult.data || []) as Array<{ id: string; user_id: string | null; created_at: string | null }>
            const musiqueRows = (musiqueRankResult.data || []) as Array<{ id: string; user_id: string | null; points: number | null; created_at: string | null }>
            const prodRows = (prodRankResult.data || []) as Array<{ id: string; user_id: string | null; points: number | null; created_at: string | null }>
            const vueRows = (vueRankResult.data || []) as Array<{ user_id: string | null; best_score: number | null }>
            const parisRows = (parisRankResult.data || []) as Array<{ user_id: string | null; amount: number | null }>
            const playlistRows = (playlistRankResult.data || []) as Array<{
              created_at: string | null
              removed_at: string | null
              expires_at: string | null
              titre: { user_id?: string | null } | Array<{ user_id?: string | null }> | null
            }>

            const diggerRank = diggerRows.findIndex((row) => row.id === user.id)

            const parisTotals = new Map<string, number>()
            parisRows.forEach((row) => {
              if (!row.user_id) return
              parisTotals.set(row.user_id, (parisTotals.get(row.user_id) || 0) + Number(row.amount || 0))
            })
            const parisRankingRows = Array.from(parisTotals.entries())
              .map(([user_id, total_amount]) => ({ user_id, total_amount }))
              .sort((left, right) => right.total_amount - left.total_amount)

            const nowTs = Date.now()
            const playlistBestByUser = new Map<string, number>()
            playlistRows.forEach((row) => {
          const titleRow = Array.isArray(row.titre) ? row.titre[0] : row.titre
          const titleUserId = titleRow?.user_id || null
          if (!titleUserId || !row.created_at) return
          const startedAt = new Date(row.created_at).getTime()
          const endedAt = row.removed_at ? new Date(row.removed_at).getTime() : row.expires_at ? new Date(row.expires_at).getTime() : nowTs
          const durationHours = Math.max(0, (endedAt - startedAt) / 1000 / 3600)
          const currentBest = playlistBestByUser.get(titleUserId) || 0
          if (durationHours > currentBest) playlistBestByUser.set(titleUserId, durationHours)
            })
            const playlistRankingRows = Array.from(playlistBestByUser.entries())
          .map(([user_id, best_duration]) => ({ user_id, best_duration }))
          .sort((left, right) => right.best_duration - left.best_duration)

            const playlistFinalCount = playlistRows.reduce((count, row) => {
          const titleRow = Array.isArray(row.titre) ? row.titre[0] : row.titre
          if (titleRow?.user_id !== user.id || !row.created_at) return count
          const startedAt = new Date(row.created_at).getTime()
          const endedAt = row.removed_at ? new Date(row.removed_at).getTime() : row.expires_at ? new Date(row.expires_at).getTime() : nowTs
          if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) return count
          return endedAt - startedAt >= 7 * 24 * 60 * 60 * 1000 ? count + 1 : count
          }, 0)

            const playlistParticipationStreak = getActivityDayStreak([
              ...playlistVoteRows.map((entry) => entry.created_at),
              ...playlistSuggestionRows.map((entry) => entry.created_at),
            ])
            const hasWarmupBadge = badgeRows.some((badge) => badge.badge_id === 'devin_exact')

            setExtraQuestStats({
          sharesToday: nextUserTracks.filter((track) => isSameLocalDay(track.created_at)).length,
          likesSentToday: ((votesResult.data || []) as Array<{ created_at: string | null }>).filter((entry) => isSameLocalDay(entry.created_at)).length,
          coffreAttemptsToday: coffreAttemptRows.filter((entry) => isSameLocalDay(entry.created_at)).length,
          coffreAttemptsTotal: coffreAttemptRows.length,
          coffreUnlockCount: coffreAttemptRows.filter((entry) => Boolean(entry.is_correct)).length,
          bottleSentCount: bottleSentRows.length,
          vueGamesPlayed: Number(vueProfileRow?.times_played || 0),
          vueBestScore: Number(vueProfileRow?.best_score || 0),
          vueWarmupPerfectCount: Math.max(Number(vueProfileRow?.exact_guess_count || 0), hasWarmupBadge ? 1 : 0),
          throneVotesToday: throneVoteRows.filter((entry) => isSameLocalDay(entry.created_at)).length,
          throneVotesTotal: throneVoteRows.length,
          playlistVotesToday: playlistVoteRows.filter((entry) => isSameLocalDay(entry.created_at)).length,
          playlistVotesTotal: playlistVoteRows.length,
          playlistSuggestionsTotal: playlistSuggestionRows.length,
          playlistBestDurationDays: Math.floor((playlistRankingRows.find((row) => row.user_id === user.id)?.best_duration || 0) / 24),
          playlistParticipationStreak,
          playlistFinalCount,
          parisProposalCount: suggestedRows.length,
          parisAcceptedCount: suggestedRows.filter((row) => row.status === 'open' || row.status === 'resolved').length,
          betCount: parisMiseRows.length,
          betWonCount: parisNotificationRows.filter((entry) => entry.type === 'pari_won').length,
          betLostCount: parisNotificationRows.filter((entry) => entry.type === 'pari_lost').length,
          totalBetAmount: parisMiseRows.reduce((sum, row) => sum + Number(row.montant || 0), 0),
          throneReignDays: reignDays.throneReignDays,
          autopromoReignDays: reignDays.autopromoReignDays,
            })

            setLeaderboardRanks({
          digger: diggerRank >= 0 ? diggerRank + 1 : null,
          last: findBestTrackRank(lastRows, user.id),
          musique: findBestTrackRank(musiqueRows, user.id),
          prod: findBestTrackRank(prodRows, user.id),
          'jeu-vue': findRankForUser(vueRows, user.id),
          'jeu-paris': findRankForUser(parisRankingRows, user.id),
          'jeu-playlist': findRankForUser(playlistRankingRows, user.id),
            })

            const feedbackReceivedResult = ownedTrackIds.length > 0
              ? await supabase
                  .from('feedback')
                  .select('id, titre_id, contenu, note, created_at')
                  .in('titre_id', ownedTrackIds)
                  .order('created_at', { ascending: false })
                  .limit(80)
              : { data: [] }

            const voteRows = (votesResult.data || []) as Array<{ titre_id: string; created_at: string | null; points: number | null }>
            const feedbackSentRows = (feedbackSentResult.data || []) as Array<{
          id: string
          titre_id: string
          contenu: string
          note: number | null
          created_at: string | null
            }>
            const feedbackReceivedRows = (feedbackReceivedResult.data || []) as Array<{
          id: string
          titre_id: string
          contenu: string
          note: number | null
          created_at: string | null
            }>

            const relatedTrackIds = Array.from(
              new Set([
                ...voteRows.map((entry) => entry.titre_id),
                ...feedbackSentRows.map((entry) => entry.titre_id),
                ...feedbackReceivedRows.map((entry) => entry.titre_id),
              ])
            ).filter((trackId) => !ownedTrackIds.includes(trackId))

            let relatedTracks: TrackSummary[] = []
            if (relatedTrackIds.length > 0) {
              const { data: relatedData } = await supabase
                .from('titre')
                .select('id, user_id, nom_titre, nom_artiste, likes, vues_actuelles, vues_au_partage, feedback_enabled, created_at, youtube_channel_id, points')
                .in('id', relatedTrackIds)

              relatedTracks = (relatedData || []) as TrackSummary[]
            }

            const trackMap = new Map<string, TrackSummary>()
            dedupeTracks([...ownedTracks, ...relatedTracks]).forEach((track) => {
              trackMap.set(track.id, track)
            })

            if (cancelled) return
            setLikedTracks(
              voteRows.map((entry) => ({
                ...entry,
                track: trackMap.get(entry.titre_id) || null,
              }))
            )

            setFeedbackGiven(
              feedbackSentRows.map((entry) => ({
                ...entry,
                track: trackMap.get(entry.titre_id) || null,
              }))
            )

            setFeedbackReceived(
              feedbackReceivedRows.map((entry) => ({
                ...entry,
                track: trackMap.get(entry.titre_id) || null,
              }))
            )
          } catch (backgroundError) {
            if (!cancelled) {
              console.error('Erreur chargement secondaire profil:', backgroundError)
            }
          }
        }, 0)
      } catch (error) {
        console.error('Erreur chargement profil:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchProfileDashboard()

    return () => {
      cancelled = true
    }
  }, [authLoading, user?.email, user?.id])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ Max 5 MB')
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('❌ JPG, PNG ou WebP')
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      setAvatarSourceImage(loadEvent.target?.result as string)
      setShowAvatarCropper(true)
    }
    reader.readAsDataURL(file)
  }

  const handleApplyAvatarCrop = (blob: Blob) => {
    const nextPreviewUrl = URL.createObjectURL(blob)
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return nextPreviewUrl
    })
    setAvatarDraftBlob(blob)
    setShowAvatarCropper(false)
    setAvatarSourceImage('')
  }

  const handleSaveProfile = async () => {
    if (!user || !profile) {
      setMessage('❌ Profil indisponible.')
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      let avatarUrl = profile.avatar_url

      if (avatarDraftBlob) {
        const filePath = `${user.id}/${Date.now()}.jpg`

        if (profile.avatar_url) {
          try {
            const oldPath = profile.avatar_url.split('/').slice(-2).join('/')
            await supabase.storage.from('avatar').remove([oldPath])
          } catch {
            console.log('Old file not found')
          }
        }

        const { error: uploadError } = await supabase.storage.from('avatar').upload(filePath, avatarDraftBlob, { upsert: true })
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatar').getPublicUrl(filePath)
        avatarUrl = data.publicUrl
      }

      const { error } = await supabase
        .from('digger')
        .update({
          username: editData.username,
          biographie: editData.biographie,
          instagram_url: editData.instagram_url || null,
          x_url: editData.x_url || null,
          soundcloud_url: editData.soundcloud_url || null,
          spotify_url: editData.spotify_url || null,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id)

      if (error) throw error

      setProfile({
        ...profile,
        username: editData.username,
        biographie: editData.biographie,
        instagram_url: editData.instagram_url || null,
        x_url: editData.x_url || null,
        soundcloud_url: editData.soundcloud_url || null,
        spotify_url: editData.spotify_url || null,
        avatar_url: avatarUrl,
      })

      setMessage('✅ Profil mis a jour')
      setIsEditing(false)
      setShowAvatarCropper(false)
      setAvatarSourceImage('')
      setAvatarDraftBlob(null)
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return ''
      })
      router.refresh()
      setTimeout(() => setMessage(''), 3000)
    } catch (error: unknown) {
      const nextMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setMessage(`❌ ${nextMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTrack = async (trackId: string) => {
    if (!window.confirm('Supprimer ce morceau ?')) return

    try {
      await supabase.from('titre').delete().eq('id', trackId)
      setUserTracks((current) => current.filter((track) => track.id !== trackId))
      setDetectedTracks((current) => current.filter((track) => track.id !== trackId))
      setFeedbackReceived((current) => current.filter((entry) => entry.titre_id !== trackId))
      setMessage('✅ Morceau supprime')
      setTimeout(() => setMessage(''), 2000)
    } catch (error: unknown) {
      const nextMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setMessage(`❌ ${nextMessage}`)
    }
  }

  const handleToggleFeedback = async (trackId: string, currentValue: boolean) => {
    try {
      await supabase.from('titre').update({ feedback_enabled: !currentValue }).eq('id', trackId)
      setDetectedTracks((current) => current.map((track) => (
        track.id === trackId ? { ...track, feedback_enabled: !currentValue } : track
      )))
      setMessage(`✅ Feedback ${!currentValue ? 'active' : 'desactive'}`)
      setTimeout(() => setMessage(''), 2000)
    } catch (error: unknown) {
      const nextMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setMessage(`❌ ${nextMessage}`)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setSettingsMessage('❌ Email invalide')
      return
    }

    setSettingsLoading(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setSettingsMessage(`❌ ${error.message}`)
    } else {
      setSettingsMessage('✅ Email de verification envoye.')
    }
    setSettingsLoading(false)
  }

  const handleReport = () => {
    router.push('/feedback')
  }

  const handleDeleteRequest = () => {
    const confirmed = window.confirm('Confirmer la demande de suppression de compte ?')
    if (!confirmed) return

    const subject = encodeURIComponent('Demande suppression compte')
    const body = encodeURIComponent(`Bonjour, je souhaite supprimer mon compte.\n\nUser ID: ${user?.id || ''}\nPseudo: ${profile?.username || ''}`)
    window.location.href = `mailto:contact@mansamidas.com?subject=${subject}&body=${body}`
    setSettingsMessage('✅ Demande pre-remplie dans ton client mail.')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const currentPoints = profile?.points || 0
  const totalLikesReceived = userTracks.reduce((sum, track) => sum + (track.likes || 0), 0)
  const totalViews = userTracks.reduce((sum, track) => sum + (track.vues_actuelles || 0), 0)
  const totalTrackPoints = userTracks.reduce((sum, track) => sum + (track.points || 0), 0)
  const cumulativePoints = pointHistory.reduce((sum, entry) => sum + Math.max(0, entry.amount || 0), 0)
  const totalSpentPoints = Math.abs(pointHistory.reduce((sum, entry) => sum + Math.min(0, entry.amount || 0), 0))
  const claimedQuestXp = questStatuses.reduce((sum, status) => sum + Math.max(0, status.xp_reward || 0), 0)
  const totalXp = cumulativePoints + claimedQuestXp + badgeUnlocks.length * 40 + dailyState.streak_day * 12 + feedbackGiven.length * 8
  const levelInfo = getLevelInfo(totalXp)
  const ownedTrackHistory = dedupeTracks([...userTracks, ...detectedTracks])
  const bestTrack = [...userTracks].sort((left, right) => {
    const pointsGap = (right.points || 0) - (left.points || 0)
    if (pointsGap !== 0) return pointsGap
    return (right.likes || 0) - (left.likes || 0)
  })[0] || null
  const likeViewRatio = totalViews > 0 ? (totalLikesReceived / totalViews) * 100 : 0

  const activityItems: ActivityItem[] = [
    ...userTracks.map((track) => ({
      id: `share-${track.id}`,
      date: track.created_at,
      label: 'Partage',
      title: track.nom_titre,
      body: `${track.nom_artiste} · ${track.points || 0} perles cumulees`,
      href: `/track/${track.id}`,
    })),
    ...likedTracks
      .filter((entry) => entry.track)
      .map((entry) => ({
        id: `like-${entry.titre_id}`,
        date: entry.created_at,
        label: 'Like',
        title: entry.track?.nom_titre || 'Morceau supprime',
        body: `${entry.track?.nom_artiste || 'Artiste inconnu'} · ${entry.points || 0} perles envoyees`,
        href: `/track/${entry.titre_id}`,
      })),
    ...feedbackGiven
      .filter((entry) => entry.track)
      .map((entry) => ({
        id: `feedback-${entry.id}`,
        date: entry.created_at,
        label: 'Feedback',
        title: entry.track?.nom_titre || 'Feedback',
        body: truncate(entry.contenu, 90),
        href: `/track/${entry.titre_id}`,
      })),
  ]
    .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
    .slice(0, 14)

  const arenaGamesVisited = [
    extraQuestStats.coffreAttemptsTotal > 0,
    extraQuestStats.throneVotesTotal > 0,
    extraQuestStats.playlistVotesTotal > 0 || extraQuestStats.playlistSuggestionsTotal > 0 || extraQuestStats.playlistBestDurationDays > 0,
    extraQuestStats.betCount > 0,
    extraQuestStats.bottleSentCount > 0,
    extraQuestStats.vueGamesPlayed > 0 || extraQuestStats.vueBestScore > 0 || extraQuestStats.vueWarmupPerfectCount > 0,
  ].filter(Boolean).length

  const questProgressCards = buildQuestCards({
    shareCount: userTracks.length,
    likesSentCount: likedTracks.length,
    likesReceivedCount: totalLikesReceived,
    feedbackGivenCount: feedbackGiven.length,
    feedbackReceivedCount: feedbackReceived.length,
    followingCount: followStats.following,
    followersCount: followStats.followers,
    streakDays: dailyState.streak_day,
    arenaGamesVisited,
    stats: extraQuestStats,
    leaderboardRanks,
  })
  const questStatusMap = new Map(questStatuses.map((status) => [status.quest_id, status]))
  const claimableQuestCount = questProgressCards.filter((quest) => {
    const status = questStatusMap.get(quest.id)
    return quest.completed && !status?.claimed_at
  }).length
  const completedQuestCards = [...questProgressCards]
    .filter((quest) => quest.completed)
    .sort((left, right) => {
      const leftClaimed = Boolean(questStatusMap.get(left.id)?.claimed_at)
      const rightClaimed = Boolean(questStatusMap.get(right.id)?.claimed_at)
      if (leftClaimed !== rightClaimed) return Number(leftClaimed) - Number(rightClaimed)
      return right.progressPercent - left.progressPercent
    })
  const dailyQuestCards = questProgressCards.filter((quest) => quest.category === 'journaliere')
  const nearFinishedQuestCards = [...questProgressCards]
    .filter((quest) => quest.category !== 'journaliere' && !quest.completed)
    .sort((left, right) => right.progressPercent - left.progressPercent)
    .slice(0, 6)
  const visibleQuestCards = activeProgressionView === 'overview'
    ? []
    : filterQuestCardsForView(questProgressCards, activeProgressionView)
  const visibleQuestGroups = groupQuestCards(visibleQuestCards)
  const groupedQuestBadges = new Map<string, {
    id: string
    name: string
    variants: Set<string>
  }>()

  USER_QUEST_DEFINITIONS
    .filter((quest) => quest.badgeReward)
    .forEach((quest) => {
      const family = quest.badgeReward?.family || quest.id
      const designName = quest.badgeReward?.label || quest.title
      const variant = quest.badgeReward?.tierLabel || 'Unique'
      const groupKey = `${family}::${designName}`
      const existing = groupedQuestBadges.get(groupKey)

      if (existing) {
        existing.variants.add(variant)
        return
      }

      groupedQuestBadges.set(groupKey, {
        id: groupKey,
        name: designName,
        variants: new Set([variant]),
      })
    })

  const badgeDefinitionMap = allBadgeDefinitions.reduce<Record<string, BadgeDefinitionRecord>>((accumulator, badge) => {
    accumulator[badge.id] = badge
    return accumulator
  }, {})

  const unlockedBadgeMap = new Map<string, UserBadgeUnlock>()
  badgeUnlocks.forEach((entry) => {
    unlockedBadgeMap.set(entry.badge_id, entry)
  })

  const trophyBadgeMap = new Map<string, TrophyBadgeEntry>()
  badgeUnlocks.forEach((entry) => {
    const display = resolveBadgeDisplay(entry.badge_id, entry.badge || badgeDefinitionMap[entry.badge_id] || null)
    if (!display) return

    trophyBadgeMap.set(entry.badge_id, {
      badgeId: entry.badge_id,
      unlocked: true,
      unlockedAt: entry.created_at || null,
      display,
    })
  })

  USER_QUEST_DEFINITIONS.forEach((quest) => {
    if (!quest.badgeReward) return
    const badgeId = `quest-${quest.id}`
    const display = resolveBadgeDisplay(badgeId, badgeDefinitionMap[badgeId] || null)
    if (!display) return
    const unlocked = unlockedBadgeMap.get(badgeId)
    trophyBadgeMap.set(badgeId, {
      badgeId,
      unlocked: trophyBadgeMap.get(badgeId)?.unlocked || Boolean(unlocked),
      unlockedAt: trophyBadgeMap.get(badgeId)?.unlockedAt || unlocked?.created_at || null,
      display,
    })
  })

  const badgeCatalogMap = new Map<string, BadgeCatalogEntry>()
  groupedQuestBadges.forEach((badge) => {
    badgeCatalogMap.set(badge.id, {
      id: badge.id,
      name: badge.name,
      variantCount: badge.variants.size,
    })
  })

  allBadgeDefinitions.forEach((badge) => {
    if (badge.id.startsWith('quest-')) return
    if (badgeCatalogMap.has(badge.id)) return

    const display = resolveBadgeDisplay(badge.id, badge)
    if (display) {
      const unlocked = unlockedBadgeMap.get(badge.id)
      trophyBadgeMap.set(badge.id, {
        badgeId: badge.id,
        unlocked: trophyBadgeMap.get(badge.id)?.unlocked || Boolean(unlocked),
        unlockedAt: trophyBadgeMap.get(badge.id)?.unlockedAt || unlocked?.created_at || null,
        display,
      })
    }

    badgeCatalogMap.set(badge.id, {
      id: badge.id,
      name: badge.name,
      variantCount: 1,
    })
  })

  const badgeCatalog = Array.from(badgeCatalogMap.values()).sort((left, right) => left.name.localeCompare(right.name, 'fr'))
  const trophyBadges = Array.from(trophyBadgeMap.values()).sort((left, right) => {
    if (left.unlocked !== right.unlocked) return left.unlocked ? -1 : 1
    if (left.unlockedAt && right.unlockedAt) return right.unlockedAt.localeCompare(left.unlockedAt)
    if (left.unlockedAt) return -1
    if (right.unlockedAt) return 1
    return left.display.name.localeCompare(right.display.name, 'fr')
  })
  const unlockedTrophyBadges = trophyBadges.filter((badge) => badge.unlocked)
  const lockedTrophyBadges = trophyBadges.filter((badge) => !badge.unlocked)
  const selectedLockedBadge = lockedTrophyBadges.find((badge) => badge.badgeId === selectedLockedBadgeId) || lockedTrophyBadges[0] || null
  const effectiveEquippedBadge1 = badgePreview?.equipped_badge_1 ?? profile?.equipped_badge_1 ?? null
  const effectiveEquippedBadge2 = badgePreview?.equipped_badge_2 ?? profile?.equipped_badge_2 ?? null
  const hasPendingBadgePreview = Boolean(
    profile && (
      effectiveEquippedBadge1 !== (profile.equipped_badge_1 || null)
      || effectiveEquippedBadge2 !== (profile.equipped_badge_2 || null)
    )
  )

  useEffect(() => {
    if (!user?.id || loading) return

    const notificationStatusMap = new Map(questStatuses.map((status) => [status.quest_id, status]))

    const pendingQuestNotifications = questProgressCards.filter((quest) => {
      const status = notificationStatusMap.get(quest.id)
      return quest.completed && !status?.notified_at
    })

    if (pendingQuestNotifications.length === 0) return

    let cancelled = false

    const notifyCompletedQuests = async () => {
      for (const quest of pendingQuestNotifications) {
        const result = await markQuestNotified(
          quest.id,
          `Quete terminee: ${quest.title}`,
          `Ta quete est terminee. Ouvre ton profil puis valide-la pour recevoir ${quest.rewardLabel}.`
        )

        if (cancelled || !result.success || !result.notified_at) continue
        const notifiedAt = result.notified_at
        const claimedAt = result.claimed_at ?? null

        setQuestStatuses((current) => {
          const existing = current.find((status) => status.quest_id === quest.id)
          if (existing?.notified_at) return current
          if (existing) {
            return current.map((status) => status.quest_id === quest.id ? { ...status, notified_at: notifiedAt || status.notified_at } : status)
          }
          return [...current, {
            quest_id: quest.id,
            notified_at: notifiedAt,
            claimed_at: claimedAt,
            pearl_reward: 0,
            xp_reward: 0,
          }]
        })
      }
    }

    notifyCompletedQuests()

    return () => {
      cancelled = true
    }
  }, [loading, questProgressCards, questStatuses, user?.id])

  const handleClaimQuest = async (quest: QuestProgressCard) => {
    if (!quest.completed || claimingQuestIds.includes(quest.id)) return

    setClaimingQuestIds((current) => [...current, quest.id])
    const result = await claimQuestReward({
      questId: quest.id,
      pearlReward: quest.pearlReward,
      xpReward: quest.xpReward,
      badgeId: quest.badgeId,
      badgeName: quest.badgeName,
      badgeDescription: quest.badgeDescription,
    })

    setClaimingQuestIds((current) => current.filter((entry) => entry !== quest.id))

    if (!result.success || !result.claimed_at) {
      setMessage(result.error || 'Impossible de valider cette quete pour le moment.')
      return
    }
    const claimedAt = result.claimed_at

    setQuestStatuses((current) => {
      const existing = current.find((status) => status.quest_id === quest.id)
      if (existing) {
        return current.map((status) => status.quest_id === quest.id ? {
          ...status,
          claimed_at: claimedAt || status.claimed_at,
          pearl_reward: quest.pearlReward,
          xp_reward: quest.xpReward,
        } : status)
      }

      return [...current, {
        quest_id: quest.id,
        notified_at: new Date().toISOString(),
        claimed_at: claimedAt,
        pearl_reward: quest.pearlReward,
        xp_reward: quest.xpReward,
      }]
    })

    setProfile((current) => current ? { ...current, points: (current.points || 0) + quest.pearlReward } : current)
    setPointHistory((current) => [{
      amount: quest.pearlReward,
      type: 'quest',
      reason: `Recompense quete: ${quest.title}`,
      created_at: claimedAt,
    }, ...current])

    if (quest.badgeId && quest.badgeName) {
      const badgeId = quest.badgeId
      const badgeName = quest.badgeName
      const badgeDescription = quest.badgeDescription || null
      setBadgeUnlocks((current) => {
        const alreadyHasBadge = current.some((entry) => entry.badge_id === badgeId)
        if (alreadyHasBadge) return current
        return [{
          badge_id: badgeId,
          created_at: claimedAt,
          badge: {
            id: badgeId,
            name: badgeName,
            description: badgeDescription,
          },
        }, ...current]
      })
    }

    setMessage(`Quete validee: ${quest.rewardLabel} envoyes automatiquement.`)
  }

  const handleEquipBadgePreview = (slot: 1 | 2, badgeId: string | null) => {
    if (!profile) return

    const currentEquippedBadge1 = badgePreview?.equipped_badge_1 ?? profile.equipped_badge_1 ?? null
    const currentEquippedBadge2 = badgePreview?.equipped_badge_2 ?? profile.equipped_badge_2 ?? null

    const nextUpdates = slot === 1
      ? {
          equipped_badge_1: badgeId,
          equipped_badge_2: currentEquippedBadge2 === badgeId ? null : currentEquippedBadge2,
        }
      : {
          equipped_badge_2: badgeId,
          equipped_badge_1: currentEquippedBadge1 === badgeId ? null : currentEquippedBadge1,
        }

    setBadgePreview(nextUpdates)
    setMessage('Previsualisation des badges active.')
  }

  const handleCancelBadgePreview = () => {
    setBadgePreview(null)
    setMessage('Previsualisation annulee.')
  }

  const handleConfirmBadgePreview = async () => {
    if (!user?.id || !profile || !hasPendingBadgePreview) return

    setEquippingBadgeSlot(1)

    const nextUpdates = {
      equipped_badge_1: effectiveEquippedBadge1,
      equipped_badge_2: effectiveEquippedBadge2,
    }

    const { data, error } = await supabase
      .from('digger')
      .update(nextUpdates)
      .eq('id', user.id)
      .select('equipped_badge_1, equipped_badge_2')
      .single()

    setEquippingBadgeSlot(null)

    if (error) {
      setMessage('Impossible de mettre a jour les badges equipes pour le moment.')
      return
    }

    setProfile((current) => current ? {
      ...current,
      equipped_badge_1: data?.equipped_badge_1 ?? nextUpdates.equipped_badge_1,
      equipped_badge_2: data?.equipped_badge_2 ?? nextUpdates.equipped_badge_2,
    } : current)
    setBadgePreview(null)
    setMessage('Badges equipes mis a jour.')
  }

  const renderQuestAction = (quest: QuestProgressCard) => {
    const status = questStatusMap.get(quest.id)
    const isClaiming = claimingQuestIds.includes(quest.id)

    if (status?.claimed_at) {
      return <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Recompense recue</span>
    }

    if (quest.completed) {
      return (
        <button
          type="button"
          onClick={() => handleClaimQuest(quest)}
          disabled={isClaiming}
          className="inline-flex h-10 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-400/18 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isClaiming ? 'Validation...' : 'Valider la quete'}
        </button>
      )
    }

    return <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">{quest.progressLabel}</span>
  }

  const renderQuestTitle = (quest: QuestProgressCard, className: string) => (
    <div className="flex min-w-0 items-center gap-3">
      {quest.badgeFamily && quest.badgeVisualLabel && quest.badgeTierLabel ? (
        <QuestBadgePreview
          family={quest.badgeFamily}
          label={quest.badgeVisualLabel}
          tierLabel={quest.badgeTierLabel}
          size="xs"
        />
      ) : null}
      <p className={`truncate ${className}`}>{quest.title}</p>
    </div>
  )

  if (authLoading || loading) {
    return <div className="min-h-screen bg-black pt-24 text-white flex items-center justify-center">Chargement...</div>
  }

  const topTracks = [...ownedTrackHistory].sort((left, right) => (right.points || 0) - (left.points || 0)).slice(0, 5)

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#030507_0%,#081018_100%)] text-white pt-24 pb-12">
      <div className="mx-auto max-w-[1880px] px-4 sm:px-5 lg:px-6">
        <div className="mb-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => setActivePanel('flux')} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] transition ${activePanel === 'flux' ? 'border-cyan-300/40 bg-cyan-400/12 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-cyan-400/20 hover:text-cyan-100'}`}>
            Flux
          </button>
          <button type="button" onClick={() => { setActivePanel('progression'); setActiveProgressionView('overview') }} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] transition ${activePanel === 'progression' ? 'border-amber-300/40 bg-amber-400/12 text-amber-100' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-amber-400/20 hover:text-amber-100'}`}>
            Progression
          </button>
          <button type="button" onClick={() => setActivePanel('statistiques')} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] transition ${activePanel === 'statistiques' ? 'border-emerald-300/40 bg-emerald-400/12 text-emerald-100' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-emerald-400/20 hover:text-emerald-100'}`}>
            Statistique
          </button>
          <button type="button" onClick={() => setActivePanel('feedbacks')} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] transition ${activePanel === 'feedbacks' ? 'border-fuchsia-300/40 bg-fuchsia-400/12 text-fuchsia-100' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-fuchsia-400/20 hover:text-fuchsia-100'}`}>
            Feedbacks
          </button>
          <button type="button" onClick={() => setActivePanel('galerie')} className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.22em] transition ${activePanel === 'galerie' ? 'border-amber-300/40 bg-amber-400/12 text-amber-100' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-amber-400/20 hover:text-amber-100'}`}>
            Galerie des trophees
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="order-2 space-y-6 xl:order-2">
            {activePanel === 'flux' ? (
            <section className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5 sm:px-7">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-cyan-200/70">Flux</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Activite chronologique</h2>
                    <p className="mt-2 max-w-2xl text-sm text-gray-400">Tous les derniers gestes du profil: morceaux postes, likes envoyes et feedbacks laisses.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Actions tracees</p>
                    <p className="mt-1 text-2xl font-black text-cyan-100">{activityItems.length}</p>
                  </div>
                </div>
              </div>

              {activityItems.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-gray-500 sm:px-7">Aucune action recente a afficher.</div>
              ) : (
                <div className="divide-y divide-white/6">
                  {activityItems.map((item) => (
                    <div key={item.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center sm:px-7">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">{item.label}</p>
                        <p className="mt-2 text-sm text-gray-300">{formatDate(item.date)}</p>
                      </div>
                      <div>
                        <h3 className="text-base font-black uppercase tracking-[0.12em] text-white">{item.title}</h3>
                        <p className="mt-1 text-sm text-gray-400">{item.body}</p>
                      </div>
                      <Link href={item.href} className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 px-4 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                        Ouvrir
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>
            ) : null}

            {activePanel === 'progression' ? (
            <section className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5 sm:px-7">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-200/70">Progression</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">Niveau, badges et quetes</h2>
              </div>

              <div className="px-5 py-5 sm:px-7">
                <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,10,10,0.16))] p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <LevelBadge points={totalXp} size={72} className="drop-shadow-[0_10px_24px_rgba(245,158,11,0.18)]" />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/80">
                              <LevelBadge points={totalXp} size={18} />
                              <span>{levelInfo.tier.label}</span>
                            </span>
                            <span className="text-sm font-black uppercase tracking-[0.2em] text-white">Niveau {levelInfo.level}</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-gray-500">{formatNumber(totalXp)} XP</span>
                          </div>

                          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8">
                            <div className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#fde68a)]" style={{ width: `${Math.max(4, levelInfo.progress * 100)}%` }} />
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.18em]">
                            <span className="text-amber-100/75">Actuel: niveau {levelInfo.level}</span>
                            <span className="text-gray-400">{levelInfo.isMaxLevel ? 'Palier max atteint' : `Prochain: niveau ${levelInfo.level + 1} • ${formatNumber(levelInfo.xpNeededForNextLevel)} XP`}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4 rounded-[20px] border border-cyan-300/12 bg-cyan-400/6 px-4 py-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Connexion</p>
                        <p className="mt-1 text-3xl font-black leading-none text-white">{dailyState.streak_day}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/80">jours de suite</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-400">Jour {dailyState.current_day}{dailyState.claimed_today ? ' • recupere' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 border-t border-white/8 px-5 py-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)] sm:px-7">
                <div className="space-y-5">
                  <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="space-y-4 rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black uppercase tracking-[0.18em] text-white">Quetes</h3>
                        <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{claimableQuestCount} a valider</span>
                      </div>
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setActiveProgressionView('overview')}
                          className={`w-full rounded-xl border px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-[0.18em] transition ${activeProgressionView === 'overview' ? 'border-amber-300/35 bg-amber-400/14 text-amber-100' : 'border-white/8 bg-white/[0.03] text-gray-300 hover:border-white/14 hover:text-white'}`}
                        >
                          Apercu
                        </button>
                        {PROGRESSION_DETAIL_MENU.map((item) => {
                          const count = filterQuestCardsForView(questProgressCards, item.id).length
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveProgressionView(item.id)
                                setExpandedQuestGroups([])
                              }}
                              className={`w-full rounded-xl border px-4 py-3.5 text-left text-[11px] font-black uppercase tracking-[0.18em] transition ${activeProgressionView === item.id ? 'border-cyan-300/35 bg-cyan-400/14 text-cyan-100' : 'border-white/8 bg-white/[0.03] text-gray-300 hover:border-white/14 hover:text-white'}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p>{item.label}</p>
                                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">{count}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveProgressionView('completed')
                          setExpandedQuestGroups([])
                        }}
                        className={`w-full rounded-[18px] border p-3 text-left transition ${activeProgressionView === 'completed'
                          ? 'border-emerald-300/35 bg-emerald-400/14'
                          : claimableQuestCount > 0
                            ? 'border-emerald-300/30 bg-emerald-500/10 shadow-[0_0_28px_rgba(74,222,128,0.18)]'
                            : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h4 className={`text-sm font-black uppercase tracking-[0.16em] ${claimableQuestCount > 0 ? 'text-emerald-200' : 'text-white'}`}>Quetes terminer</h4>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${claimableQuestCount > 0 ? 'bg-emerald-300/18 text-emerald-100' : 'bg-white/8 text-gray-400'}`}>{completedQuestCards.length}</span>
                        </div>
                        <p className={`mt-3 text-sm ${claimableQuestCount > 0 ? 'text-emerald-100/82' : 'text-gray-500'}`}>
                          {completedQuestCards.length === 0
                            ? 'Aucune quete terminee pour le moment.'
                            : claimableQuestCount > 0
                              ? `${claimableQuestCount} quete${claimableQuestCount > 1 ? 's' : ''} terminee${claimableQuestCount > 1 ? 's' : ''} attend${claimableQuestCount > 1 ? 'ent' : ''} une validation.`
                              : `${completedQuestCards.length} quete${completedQuestCards.length > 1 ? 's' : ''} deja terminee${completedQuestCards.length > 1 ? 's' : ''}.`}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePanel('galerie')}
                        className="w-full rounded-[18px] border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-left text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/16"
                      >
                        Voir tous les badges
                      </button>
                    </aside>

                    <div className="overflow-hidden rounded-[20px] border border-white/8 bg-[#090d13]">
                      {activeProgressionView === 'overview' ? (
                        <div>
                          <div>
                            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-5 xl:px-6">
                              <h4 className="text-base font-black uppercase tracking-[0.14em] text-white">Quetes du jour</h4>
                              <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{dailyQuestCards.filter((quest) => quest.completed).length}/{dailyQuestCards.length}</span>
                            </div>
                            <div className="divide-y divide-white/8">
                              {dailyQuestCards.map((quest) => (
                                <div key={quest.id} className="px-4 py-4 sm:px-5 xl:px-6">
                                  <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_210px_150px] xl:items-center">
                                    <div className="min-w-0">
                                      {renderQuestTitle(quest, 'text-sm font-black uppercase tracking-[0.14em] text-white')}
                                    </div>
                                    <div className="xl:text-right">
                                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/78">{quest.rewardLabel}</p>
                                    </div>
                                      <div className="xl:text-right">
                                        {renderQuestAction(quest)}
                                      </div>
                                  </div>
                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                                    <div className={`h-full rounded-full ${quest.completed ? 'bg-emerald-400' : 'bg-amber-300'}`} style={{ width: `${quest.progressPercent}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-white/8">
                            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5 xl:px-6">
                              <h4 className="text-base font-black uppercase tracking-[0.14em] text-white">Quetes bientot finies</h4>
                              <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">Top progression</span>
                            </div>
                            {nearFinishedQuestCards.length === 0 ? (
                              <div className="px-4 py-8 text-sm text-gray-500 sm:px-5 xl:px-6">Aucune quete proche d etre terminee pour l instant.</div>
                            ) : (
                              <div className="divide-y divide-white/8">
                                {nearFinishedQuestCards.map((quest) => (
                                  <div key={quest.id} className="px-4 py-4 sm:px-5 xl:px-6">
                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_210px_150px] xl:items-center">
                                      <div className="min-w-0">
                                        {renderQuestTitle(quest, 'text-sm font-black uppercase tracking-[0.14em] text-white')}
                                      </div>
                                      <div className="xl:text-right">
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/78">{quest.rewardLabel}</p>
                                      </div>
                                      <div className="xl:text-right">
                                        {renderQuestAction(quest)}
                                      </div>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${quest.progressPercent}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : activeProgressionView === 'completed' ? (
                        <div>
                          <div className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-5 xl:px-6">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/70">Quetes terminer</p>
                              <h4 className="mt-1 text-xl font-black uppercase tracking-[0.14em] text-white">Toutes les quetes terminees</h4>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-100">{claimableQuestCount} a valider</span>
                          </div>
                          {completedQuestCards.length === 0 ? (
                            <div className="px-4 py-10 text-sm text-gray-500 sm:px-5 xl:px-6">
                              Aucune quete terminee pour le moment.
                            </div>
                          ) : (
                            <div className="divide-y divide-white/8">
                              {completedQuestCards.map((quest) => {
                                const isClaimed = Boolean(questStatusMap.get(quest.id)?.claimed_at)

                                return (
                                  <div key={quest.id} className="px-4 py-4 sm:px-5 xl:px-6">
                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_210px_150px] xl:items-center">
                                      <div className="min-w-0">
                                        {renderQuestTitle(quest, 'text-sm font-black uppercase tracking-[0.14em] text-white')}
                                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-500">{quest.categoryLabel} • {quest.speedLabel}</p>
                                      </div>
                                      <div className="xl:text-right">
                                        <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${isClaimed ? 'text-gray-400' : 'text-emerald-200'}`}>{quest.rewardLabel}</p>
                                      </div>
                                      <div className="xl:text-right">
                                        {renderQuestAction(quest)}
                                      </div>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                                      <div className="h-full rounded-full bg-emerald-400" style={{ width: '100%' }} />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-5 xl:px-6">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Categorie</p>
                              <h4 className="mt-1 text-xl font-black uppercase tracking-[0.14em] text-white">{getProgressionMenuItem(activeProgressionView).label}</h4>
                            </div>
                            <span className="shrink-0 text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{visibleQuestCards.filter((quest) => quest.completed && !questStatusMap.get(quest.id)?.claimed_at).length} a valider</span>
                          </div>
                          {visibleQuestGroups.length === 0 ? (
                            <div className="px-4 py-10 text-sm text-gray-500 sm:px-5 xl:px-6">
                              Aucune quete dans cette section pour le moment. J ajouterai celles de cette categorie quand tu me les enverras.
                            </div>
                          ) : (
                            <div className="divide-y divide-white/8">
                              {visibleQuestGroups.map((group) => {
                                const isExpanded = expandedQuestGroups.includes(group.key)
                                const representative = group.representative

                                return (
                                  <div key={group.key} className="px-4 py-4 sm:px-5 xl:px-6">
                                    <div className="grid gap-3 xl:grid-cols-[minmax(0,2.2fr)_210px_150px] xl:items-center">
                                      <div className="min-w-0">
                                        {renderQuestTitle(representative, 'text-sm font-black uppercase tracking-[0.14em] text-white')}
                                      </div>

                                      <div className="min-w-0 xl:text-right">
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/78">{representative.rewardLabel}</p>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                                        {renderQuestAction(representative)}
                                        {group.cards.length > 1 ? (
                                          <button
                                            type="button"
                                            onClick={() => setExpandedQuestGroups((current) => current.includes(group.key) ? current.filter((key) => key !== group.key) : [...current, group.key])}
                                            className="inline-flex h-10 items-center rounded-full border border-cyan-300/20 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/10"
                                          >
                                            {isExpanded ? 'Masquer' : 'Derouler'}
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>

                                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                                      <div className={`h-full rounded-full ${representative.completed ? 'bg-emerald-400' : 'bg-cyan-300'}`} style={{ width: `${representative.progressPercent}%` }} />
                                    </div>

                                    {isExpanded ? (
                                      <div className="mt-5 border-t border-white/8 pt-4">
                                        {group.cards.map((quest) => (
                                          <div key={quest.id} className="grid gap-3 border-b border-white/6 py-4 last:border-b-0 xl:grid-cols-[minmax(0,2.2fr)_210px_150px] xl:items-center">
                                            <div className="min-w-0">
                                              {renderQuestTitle(quest, 'text-sm font-black uppercase tracking-[0.14em] text-white')}
                                            </div>
                                              <div className="min-w-0 xl:text-right">
                                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/78">{quest.rewardLabel}</p>
                                              </div>
                                              <div className="xl:text-right">
                                                {renderQuestAction(quest)}
                                              </div>
                                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                                              <div className={`h-full rounded-full ${quest.completed ? 'bg-emerald-400' : 'bg-cyan-300'}`} style={{ width: `${quest.progressPercent}%` }} />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
            ) : null}

            {activePanel === 'galerie' ? (
            <section className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5 sm:px-7">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-amber-200/70">Galerie des trophees</p>
                <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Salle des badges</h2>
                    <p className="mt-2 max-w-3xl text-sm text-gray-400">Equipe deux badges pour ton pseudo, retrouve tous ceux deja debloques et inspecte ceux qu il te reste a obtenir.</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {hasPendingBadgePreview ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-emerald-300/20 bg-emerald-500/8 px-3 py-3">
                        <button
                          type="button"
                          onClick={handleConfirmBadgePreview}
                          disabled={equippingBadgeSlot !== null}
                          className="inline-flex h-10 items-center rounded-full border border-emerald-300/30 bg-emerald-500/12 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {equippingBadgeSlot !== null ? 'Validation...' : 'Valider'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelBadgePreview}
                          disabled={equippingBadgeSlot !== null}
                          className="inline-flex h-10 items-center rounded-full border border-white/12 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3 rounded-[20px] border border-amber-300/14 bg-amber-400/8 px-4 py-3">
                      <EquippedBadgesInline badgeIds={[effectiveEquippedBadge1, effectiveEquippedBadge2]} badgeDefinitions={badgeDefinitionMap} size="sm" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/72">Badges equipes</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-400">2 slots visibles sur le profil</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-b border-white/8 px-5 py-4 sm:grid-cols-3 sm:px-7">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/72">Badges obtenus</p>
                  <p className="mt-2 text-3xl font-black text-white">{unlockedTrophyBadges.length}</p>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/72">Encore verrouilles</p>
                  <p className="mt-2 text-3xl font-black text-white">{lockedTrophyBadges.length}</p>
                </div>
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-100/72">Catalogue total</p>
                  <p className="mt-2 text-3xl font-black text-white">{trophyBadges.length}</p>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-7">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
                  <section className="overflow-hidden rounded-[24px] border border-amber-300/14 bg-[linear-gradient(180deg,rgba(251,191,36,0.05),rgba(255,255,255,0.02))]">
                    <div className="border-b border-white/8 px-5 py-4">
                      <h4 className="text-lg font-black uppercase tracking-[0.16em] text-white">Badges obtenus</h4>
                      <p className="mt-2 text-sm text-gray-400">Equipe un badge sur le slot 1 ou 2 pour l afficher a cote de ton pseudo.</p>
                    </div>
                    <div className="grid gap-4 px-5 py-5 md:grid-cols-2 2xl:grid-cols-3">
                      {unlockedTrophyBadges.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-10 text-sm text-gray-500 md:col-span-2 2xl:col-span-3">
                          <p>Aucun badge debloque pour le moment.</p>
                          {claimableQuestCount > 0 ? (
                            <>
                              <p className="mt-3 text-emerald-200">Tu as pourtant {claimableQuestCount} quete{claimableQuestCount > 1 ? 's' : ''} terminee{claimableQuestCount > 1 ? 's' : ''} avec badge en attente.</p>
                              <p className="mt-2">Les badges de quete sont attribues au moment ou tu cliques sur le bouton de validation de la quete, pas simplement quand la progression est complete.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePanel('progression')
                                  setActiveProgressionView('completed')
                                }}
                                className="mt-5 inline-flex h-11 items-center rounded-full border border-emerald-300/30 bg-emerald-500/12 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/18"
                              >
                                Aller valider mes quetes
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : unlockedTrophyBadges.map((badge) => {
                        const isEquippedSlot1 = effectiveEquippedBadge1 === badge.badgeId
                        const isEquippedSlot2 = effectiveEquippedBadge2 === badge.badgeId

                        return (
                          <div key={badge.badgeId} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                            <div className="flex items-start gap-4">
                              <BadgeIcon badge={badge.display} size="md" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black uppercase tracking-[0.12em] text-white">{badge.display.name}</p>
                                <p className="mt-2 text-xs leading-5 text-gray-400">{badge.display.reason}</p>
                                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/74">Obtenu le {formatDate(badge.unlockedAt)}</p>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => handleEquipBadgePreview(1, isEquippedSlot1 ? null : badge.badgeId)}
                                disabled={equippingBadgeSlot !== null}
                                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${isEquippedSlot1 ? 'border-emerald-300/30 bg-emerald-500/12 text-emerald-100' : 'border-white/10 bg-white/5 text-white hover:border-emerald-300/25 hover:bg-emerald-500/10'} disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {isEquippedSlot1 ? 'Retirer slot 1' : 'Equiper slot 1'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEquipBadgePreview(2, isEquippedSlot2 ? null : badge.badgeId)}
                                disabled={equippingBadgeSlot !== null}
                                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition ${isEquippedSlot2 ? 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100' : 'border-white/10 bg-white/5 text-white hover:border-cyan-300/25 hover:bg-cyan-500/10'} disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {isEquippedSlot2 ? 'Retirer slot 2' : 'Equiper slot 2'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <section className="space-y-5">
                    <div className="overflow-hidden rounded-[24px] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(34,211,238,0.06),rgba(255,255,255,0.02))]">
                      <div className="border-b border-white/8 px-5 py-4">
                        <h4 className="text-lg font-black uppercase tracking-[0.16em] text-white">Badges a debloquer</h4>
                        <p className="mt-2 text-sm text-gray-400">Clique sur un badge verrouille pour voir sa condition d obtention.</p>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto px-5 py-5">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          {lockedTrophyBadges.map((badge) => {
                            const isSelected = selectedLockedBadge?.badgeId === badge.badgeId

                            return (
                              <button
                                key={badge.badgeId}
                                type="button"
                                onClick={() => setSelectedLockedBadgeId(badge.badgeId)}
                                className={`flex items-center gap-3 rounded-[20px] border p-3 text-left transition ${isSelected ? 'border-cyan-300/35 bg-cyan-400/12' : 'border-white/8 bg-black/18 hover:border-white/14 hover:bg-white/[0.04]'}`}
                              >
                                <BadgeIcon badge={badge.display} size="sm" className="opacity-70" />
                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-white">{badge.display.name}</p>
                                  <p className="mt-1 text-[11px] text-gray-500">{badge.display.questTitle || badge.display.reason}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-fuchsia-300/14 bg-[linear-gradient(180deg,rgba(217,70,239,0.06),rgba(255,255,255,0.02))] p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-100/72">Fiche du badge</p>
                      {selectedLockedBadge ? (
                        <div className="mt-4 flex items-start gap-4">
                          <BadgeIcon badge={selectedLockedBadge.display} size="md" />
                          <div className="min-w-0">
                            <h5 className="text-lg font-black uppercase tracking-[0.12em] text-white">{selectedLockedBadge.display.name}</h5>
                            <p className="mt-3 text-sm leading-6 text-gray-300">{selectedLockedBadge.display.reason}</p>
                            {selectedLockedBadge.display.questTitle ? (
                              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-100/78">Quete liee: {selectedLockedBadge.display.questTitle}</p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">Tous les badges disponibles ont deja ete debloques.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </section>
            ) : null}

            {activePanel === 'statistiques' ? (
            <section className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5 sm:px-7">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-emerald-200/70">Statistique</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">Vue analytics du profil</h2>
              </div>

              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 2xl:grid-cols-4 sm:px-7">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Partages</p>
                  <p className="mt-3 text-3xl font-black text-white">{userTracks.length}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Likes recus</p>
                  <p className="mt-3 text-3xl font-black text-white">{formatNumber(totalLikesReceived)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Vues cumulees</p>
                  <p className="mt-3 text-3xl font-black text-white">{formatNumber(totalViews)}</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">Max perles morceau</p>
                  <p className="mt-3 text-3xl font-black text-white">{bestTrack ? formatNumber(bestTrack.points || 0) : 0}</p>
                </div>
              </div>

              <div className="grid gap-5 border-t border-white/8 px-5 py-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] sm:px-7">
                <div className="min-w-0 space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-black uppercase tracking-[0.18em] text-white">Performance</h3>
                      <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">Style analytics</span>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300">
                          <span>Ratio likes / vues</span>
                          <span>{likeViewRatio.toFixed(2)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(likeViewRatio * 8, 100)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300">
                          <span>Perles cumulees sur les morceaux</span>
                          <span>{formatNumber(totalTrackPoints)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min((totalTrackPoints / Math.max(cumulativePoints || 1, 1)) * 100, 100)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-300">
                          <span>Likes envoyes</span>
                          <span>{likedTracks.length}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-fuchsia-300" style={{ width: `${Math.min(likedTracks.length * 10, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <h3 className="text-lg font-black uppercase tracking-[0.18em] text-white">Historique de perles</h3>
                    {pointHistory.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-500">Aucun mouvement de perles disponible.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {pointHistory.slice(0, 6).map((entry, index) => (
                          <div key={`${entry.created_at || 'point'}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-300">{POINT_TYPE_LABELS[entry.type || ''] || 'Mouvement'}</p>
                              <p className="mt-1 text-sm text-gray-400">{entry.reason || 'Historique de perles'}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-black ${(entry.amount || 0) >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                                {(entry.amount || 0) >= 0 ? '+' : ''}{entry.amount || 0}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">{formatDate(entry.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-black uppercase tracking-[0.18em] text-white">Historique des morceaux</h3>
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">Top performance</span>
                  </div>

                  {topTracks.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-500">Aucun morceau a analyser pour l instant.</p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {topTracks.map((track) => {
                        const denominator = Math.max(bestTrack?.points || 1, 1)
                        const width = Math.max(10, ((track.points || 0) / denominator) * 100)

                        return (
                          <div key={track.id} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <Link href={`/track/${track.id}`} className="text-sm font-black uppercase tracking-[0.12em] text-white transition hover:text-cyan-200">
                                  {track.nom_titre}
                                </Link>
                                <p className="mt-1 text-sm text-gray-400">{track.nom_artiste}</p>
                              </div>
                              <div className="text-right text-sm text-gray-300">
                                <p>{formatNumber(track.points || 0)} perles</p>
                                <p className="mt-1 text-gray-500">{formatNumber(track.likes || 0)} likes</p>
                              </div>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                              <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#34d399)]" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
            ) : null}

            {activePanel === 'feedbacks' ? (
            <section className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5 sm:px-7">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-fuchsia-200/70">Feedbacks</p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight sm:text-3xl">Retours recus et feedbacks envoyes</h2>
              </div>

              <div className="grid gap-4 px-5 py-5 lg:grid-cols-2 sm:px-7">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-black uppercase tracking-[0.18em] text-white">Feedbacks recus</h3>
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{feedbackReceived.length}</span>
                  </div>

                  {feedbackReceived.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-500">Aucun retour artiste recu pour le moment.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {feedbackReceived.slice(0, 8).map((entry) => {
                        const verdict = getVerdict(entry.note)

                        return (
                          <div key={entry.id} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{formatDate(entry.created_at)}</p>
                                <h4 className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-white">{entry.track?.nom_titre || 'Morceau'}</h4>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${verdict.className}`}>
                                {verdict.label}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-gray-300">{truncate(entry.contenu, 150)}</p>
                            <div className="mt-4 flex gap-2">
                              <Link href={`/profil/feedbacks/${entry.titre_id}`} className="inline-flex h-10 items-center rounded-full border border-fuchsia-300/20 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-100 transition hover:bg-fuchsia-400/10">
                                Voir la fiche
                              </Link>
                              <Link href={`/track/${entry.titre_id}`} className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6">
                                Ouvrir le track
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-black uppercase tracking-[0.18em] text-white">Feedbacks envoyes</h3>
                    <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{feedbackGiven.length}</span>
                  </div>

                  {feedbackGiven.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-500">Aucun feedback envoye pour le moment.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {feedbackGiven.slice(0, 8).map((entry) => {
                        const verdict = getVerdict(entry.note)

                        return (
                          <div key={entry.id} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{formatDate(entry.created_at)}</p>
                                <h4 className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-white">{entry.track?.nom_titre || 'Morceau'}</h4>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${verdict.className}`}>
                                {verdict.label}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-gray-300">{truncate(entry.contenu, 150)}</p>
                            <div className="mt-4 flex gap-2">
                              <Link href={`/track/${entry.titre_id}`} className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6">
                                Voir le morceau
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>
            ) : null}
          </div>

          <aside className="order-1 space-y-6 xl:order-1 xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(251,191,36,0.18))] text-3xl font-black uppercase text-white">
                      {previewUrl ? (
                        <Image src={previewUrl} alt="Avatar" fill unoptimized className="object-cover" />
                      ) : profile?.avatar_url ? (
                        <Image src={profile.avatar_url} alt="Avatar" fill unoptimized className="object-cover" />
                      ) : (
                        profile?.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    {isEditing ? (
                      <label className="absolute -bottom-2 -right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-cyan-500 text-black transition hover:bg-cyan-300">
                        ✎
                        <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </label>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Profil</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-black uppercase tracking-tight text-white">@{profile?.username}</h1>
                            <EquippedBadgesInline badgeIds={[effectiveEquippedBadge1, effectiveEquippedBadge2]} badgeDefinitions={badgeDefinitionMap} size="xs" />
                            <AdminVerificationBadge role={profile?.role} compact />
                          </div>
                        </div>
                        <button onClick={() => setIsEditing(true)} className="inline-flex h-10 items-center rounded-full border border-white/12 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                          Editer
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-400">{profile?.biographie || 'Ajoute une bio pour donner une vraie signature a ton profil.'}</p>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1 space-y-3">
                      <input type="text" value={editData.username} onChange={(event) => setEditData({ ...editData, username: event.target.value })} className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" />
                      <textarea value={editData.biographie} onChange={(event) => setEditData({ ...editData, biographie: event.target.value })} rows={3} maxLength={200} className="w-full resize-none rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5 px-5 py-5">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-cyan-300/18 bg-cyan-400/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/86">
                    {profile?.role || 'digger'}
                  </span>
                  <AdminVerificationBadge role={profile?.role} />
                </div>

                <div className="rounded-[22px] border border-amber-300/12 bg-amber-400/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/70">Badges equipes</p>
                      <p className="mt-1 text-xs text-amber-50/74">Deux badges apparaissent a cote de ton pseudo.</p>
                    </div>
                    <EquippedBadgesInline badgeIds={[effectiveEquippedBadge1, effectiveEquippedBadge2]} badgeDefinitions={badgeDefinitionMap} size="sm" />
                  </div>
                  {hasPendingBadgePreview ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmBadgePreview}
                        disabled={equippingBadgeSlot !== null}
                        className="inline-flex h-10 items-center rounded-full border border-emerald-300/30 bg-emerald-500/12 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100 transition hover:bg-emerald-500/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {equippingBadgeSlot !== null ? 'Validation...' : 'Valider les badges'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelBadgePreview}
                        disabled={equippingBadgeSlot !== null}
                        className="inline-flex h-10 items-center rounded-full border border-white/12 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <input type="url" placeholder="Instagram" value={editData.instagram_url} onChange={(event) => setEditData({ ...editData, instagram_url: event.target.value })} className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" />
                    <input type="url" placeholder="X" value={editData.x_url} onChange={(event) => setEditData({ ...editData, x_url: event.target.value })} className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" />
                    <input type="url" placeholder="SoundCloud" value={editData.soundcloud_url} onChange={(event) => setEditData({ ...editData, soundcloud_url: event.target.value })} className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" />
                    <input type="url" placeholder="Spotify" value={editData.spotify_url} onChange={(event) => setEditData({ ...editData, spotify_url: event.target.value })} className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" />
                      {previewUrl ? (
                        <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-400/8 p-4 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Nouvel avatar en attente</p>
                          <div className="mt-4 flex justify-center">
                            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-cyan-300/25 bg-black">
                              <Image src={previewUrl} alt="Nouvel avatar" fill unoptimized className="object-cover" />
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-cyan-50/80">Clique sur Sauver pour enregistrer cette nouvelle photo de profil.</p>
                        </div>
                      ) : null}
                    <div className="flex gap-3">
                      <button onClick={handleSaveProfile} disabled={isSaving} className="flex-1 rounded-full bg-cyan-400 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-cyan-300 disabled:opacity-60">
                        {isSaving ? 'Sauvegarde' : 'Sauver'}
                      </button>
                      <button onClick={() => {
                        setIsEditing(false)
                        setShowAvatarCropper(false)
                        setAvatarSourceImage('')
                        setPreviewUrl((current) => {
                          if (current) URL.revokeObjectURL(current)
                          return ''
                        })
                      }} className="flex-1 rounded-full border border-white/12 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : null}

                <div>
                  <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.24em] text-gray-500">
                    <span className="inline-flex items-center gap-2"><LevelBadge points={totalXp} size={16} /><span>Niveau {levelInfo.level}</span></span>
                    <span>{formatNumber(totalXp)} XP</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#facc15)]" style={{ width: `${levelInfo.progress * 100}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Partages</p>
                    <p className="mt-2 text-2xl font-black text-white">{userTracks.length}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Likes</p>
                    <p className="mt-2 text-2xl font-black text-white">{formatNumber(totalLikesReceived)}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Abonnes</p>
                    <p className="mt-2 text-2xl font-black text-white">{followStats.followers}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Abonnements</p>
                    <p className="mt-2 text-2xl font-black text-white">{followStats.following}</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-amber-300/15 bg-amber-400/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/80">Perles cumulees</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-3xl font-black text-white">
                    <PointsPearl size="lg" /> {formatNumber(cumulativePoints)}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-amber-100/80">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-amber-100/60">Solde actuel</p>
                      <p className="mt-1 font-black text-white">{formatNumber(currentPoints)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-amber-100/60">Perles depensees</p>
                      <p className="mt-1 font-black text-white">{formatNumber(totalSpentPoints)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href="/profil/calendrier" className="inline-flex h-11 items-center rounded-full border border-white/12 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6">
                    Calendrier
                  </Link>
                  <button onClick={handleLogout} className="inline-flex h-11 items-center rounded-full border border-rose-400/20 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-500/10">
                    Deconnexion
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile?.instagram_url ? <a href={profile.instagram_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 transition hover:bg-white/6">Instagram</a> : null}
                  {profile?.x_url ? <a href={profile.x_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 transition hover:bg-white/6">X</a> : null}
                  {profile?.soundcloud_url ? <a href={profile.soundcloud_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 transition hover:bg-white/6">SoundCloud</a> : null}
                  {profile?.spotify_url ? <a href={profile.spotify_url} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 transition hover:bg-white/6">Spotify</a> : null}
                </div>
              </div>
            </div>

            {message ? (
              <div className={`rounded-[24px] border px-5 py-4 text-sm font-bold ${message.includes('✅') ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-100'}`}>
                {message}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-gray-500">Compte</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-white">Parametres</h2>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Changer d email</p>
                  <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40" placeholder="ton@email.com" />
                  <button onClick={handleChangeEmail} disabled={settingsLoading} className="mt-3 inline-flex h-11 items-center rounded-full bg-cyan-400 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-black transition hover:bg-cyan-300 disabled:opacity-60">
                    {settingsLoading ? 'Envoi...' : 'Envoyer verification'}
                  </button>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">Actions support</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={handleReport} className="inline-flex h-10 items-center rounded-full border border-amber-300/20 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-400/10">
                      Signaler un probleme
                    </button>
                    <button onClick={handleDeleteRequest} className="inline-flex h-10 items-center rounded-full border border-rose-300/20 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-500/10">
                      Demander suppression
                    </button>
                  </div>
                </div>

                {settingsMessage ? (
                  <div className={`rounded-[22px] border px-4 py-3 text-sm font-bold ${settingsMessage.includes('✅') ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-100'}`}>
                    {settingsMessage}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[#0b1016]">
              <div className="border-b border-white/8 px-5 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.34em] text-gray-500">Tracks</p>
                <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-white">Gestion rapide</h2>
              </div>
              <div className="space-y-3 px-5 py-5">
                {ownedTrackHistory.slice(0, 4).map((track) => (
                  <div key={track.id} className="rounded-[22px] border border-white/8 bg-white/5 p-4">
                    <Link href={`/track/${track.id}`} className="text-sm font-black uppercase tracking-[0.12em] text-white transition hover:text-cyan-200">
                      {track.nom_titre}
                    </Link>
                    <p className="mt-1 text-sm text-gray-400">{track.nom_artiste}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button onClick={() => handleDeleteTrack(track.id)} className="inline-flex h-9 items-center rounded-full border border-rose-300/20 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-500/10">
                        Supprimer
                      </button>
                      {track.youtube_channel_id === profile?.youtube_channel_id ? (
                        <button onClick={() => handleToggleFeedback(track.id, Boolean(track.feedback_enabled))} className="inline-flex h-9 items-center rounded-full border border-cyan-300/20 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/10">
                          {track.feedback_enabled ? 'Feedback actif' : 'Activer feedback'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {ownedTrackHistory.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-8 text-sm text-gray-500">Aucun morceau disponible.</div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AvatarCropperModal
        isOpen={showAvatarCropper && Boolean(avatarSourceImage)}
        imageSrc={avatarSourceImage}
        onCancel={() => {
          setShowAvatarCropper(false)
          setAvatarSourceImage('')
        }}
        onApply={handleApplyAvatarCrop}
      />

    </div>
  )
}

export default function ProfilPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Chargement du profil...</div>}>
      <ProfilPageContent />
    </Suspense>
  )
}
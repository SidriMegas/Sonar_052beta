"use client"

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getFollowState } from '@/lib/social'
import { USER_QUEST_DEFINITIONS, getQuestCategory, sortQuestsByFastest, type UserQuestDefinition } from '@/lib/quests'
import { claimQuestReward, getUserQuestStatuses, type UserQuestStatus } from '@/lib/user-quests'
import QuestBadgePreview from './QuestBadgePreview'

type LeaderboardRanks = {
  digger: number | null
  last: number | null
  musique: number | null
  prod: number | null
  'jeu-vue': number | null
  'jeu-paris': number | null
  'jeu-playlist': number | null
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

type QuestCard = {
  id: string
  title: string
  categoryLabel: string
  progressLabel: string
  rewardLabel: string
  completed: boolean
  progressPercent: number
  claimed?: boolean
  pearlReward: number
  xpReward: number
  badgeId?: string | null
  badgeFamily?: string | null
  badgeLabel?: string | null
  badgeTierLabel?: string | null
  badgeName?: string | null
  badgeDescription?: string | null
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

function isSameLocalDay(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function getActivityDayStreak(values: Array<string | null | undefined>) {
  const uniqueDays = Array.from(new Set(values.filter(Boolean).map((value) => new Date(value as string).toLocaleDateString('sv-SE')))).sort((left, right) => right.localeCompare(left))
  if (uniqueDays.length === 0) return 0

  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  const firstDay = uniqueDays[0]
  const todayLabel = cursor.toLocaleDateString('sv-SE')
  if (firstDay !== todayLabel) {
    const yesterday = new Date(cursor)
    yesterday.setDate(yesterday.getDate() - 1)
    if (firstDay !== yesterday.toLocaleDateString('sv-SE')) return 0
    cursor = yesterday
  }

  for (const day of uniqueDays) {
    if (day !== cursor.toLocaleDateString('sv-SE')) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

function getQuestProgressPercent(current: number, target: number) {
  if (target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

function getRankQuestProgressPercent(rank: number | null, targetRank: number) {
  if (!rank) return 0
  if (rank <= targetRank) return 100
  return Math.max(0, Math.min(100, Math.round((targetRank / rank) * 100)))
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

function getLeaderboardRankForQuest(quest: UserQuestDefinition, leaderboardRanks: LeaderboardRanks) {
  const family = quest.badgeReward?.family
  if (family === 'trophy-digger') return leaderboardRanks.digger
  if (family === 'trophy-last') return leaderboardRanks.last
  if (family === 'trophy-musique') return leaderboardRanks.musique
  if (family === 'trophy-prod') return leaderboardRanks.prod
  if (family === 'trophy-jeu-vue') return leaderboardRanks['jeu-vue']
  if (family === 'trophy-jeu-paris') return leaderboardRanks['jeu-paris']
  if (family === 'trophy-jeu-playlist') return leaderboardRanks['jeu-playlist']
  return null
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
  const { quest, shareCount, likesSentCount, likesReceivedCount, feedbackGivenCount, feedbackReceivedCount, followingCount, followersCount, streakDays, arenaGamesVisited, stats } = params

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
  }

  if (quest.id.startsWith('feedback-give-')) return feedbackGivenCount
  if (quest.id.startsWith('throne-reign-')) return stats.throneReignDays
  if (quest.id.startsWith('throne-autopromo-reign-')) return stats.autopromoReignDays
  if (quest.id.startsWith('throne-advisor-')) return stats.throneVotesTotal
  if (quest.id.startsWith('coffre-attempt-')) return stats.coffreAttemptsTotal
  if (quest.id === 'coffre-unlock') return stats.coffreUnlockCount
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
  if (quest.id.startsWith('vue-play-')) return stats.vueGamesPlayed
  if (quest.id.startsWith('vue-score-')) return stats.vueBestScore
  if (quest.id === 'vue-warmup-perfect') return stats.vueWarmupPerfectCount

  if (quest.id === 'first-login-streak' || quest.id === 'streak-week' || quest.id === 'streak-month') return streakDays
  if (quest.id === 'first-follow' || quest.id === 'social-circle') return followingCount
  if (quest.id === 'followers-earned') return followersCount
  if (quest.id === 'first-bet') return stats.betCount
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
  const { shareCount, likesSentCount, likesReceivedCount, feedbackGivenCount, feedbackReceivedCount, followingCount, followersCount, streakDays, arenaGamesVisited, stats, leaderboardRanks } = params

  return sortQuestsByFastest(USER_QUEST_DEFINITIONS).map((quest) => {
    const category = getQuestCategory(quest.category)
    const isRankQuest = quest.category === 'profil' && quest.seriesLabel === 'Classement'
    const currentRank = isRankQuest ? getLeaderboardRankForQuest(quest, leaderboardRanks) : null
    const currentValue = isRankQuest ? currentRank : getQuestCurrentValue({
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
    const safeCurrentValue = currentValue ?? 0

    const completed = isRankQuest ? Boolean(currentRank && currentRank <= quest.target) : safeCurrentValue >= quest.target
    const progressPercent = isRankQuest ? getRankQuestProgressPercent(currentRank, quest.target) : getQuestProgressPercent(safeCurrentValue, quest.target)
    const progressLabel = isRankQuest
      ? completed
        ? `Rang actuel #${currentRank}`
        : currentRank
          ? `Rang actuel #${currentRank} • objectif top ${quest.target}`
          : `Non classe • objectif top ${quest.target}`
      : completed
        ? `${Math.min(safeCurrentValue, quest.target)}/${quest.target} atteint`
        : `${safeCurrentValue}/${quest.target} ${quest.unitLabel}`

    return {
      id: quest.id,
      title: quest.title,
      categoryLabel: category.label,
      progressLabel,
      rewardLabel: `${quest.pearlReward} perles • ${quest.xpReward} XP`,
      completed,
      progressPercent,
      pearlReward: quest.pearlReward,
      xpReward: quest.xpReward,
      badgeId: getQuestBadgeId(quest),
      badgeFamily: quest.badgeReward?.family || null,
      badgeLabel: quest.badgeReward?.label || null,
      badgeTierLabel: quest.badgeReward?.tierLabel || null,
      badgeName: getQuestBadgeName(quest),
      badgeDescription: getQuestBadgeDescription(quest),
    } satisfies QuestCard
  })
}

export default function QuestQuickPanel() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [completedQuests, setCompletedQuests] = useState<QuestCard[]>([])
  const [nearFinishedQuests, setNearFinishedQuests] = useState<QuestCard[]>([])
  const [portalReady, setPortalReady] = useState(false)
  const [claimingQuestIds, setClaimingQuestIds] = useState<string[]>([])
  const [acknowledgedClaimableCount, setAcknowledgedClaimableCount] = useState(0)
  const [snapshotLoadedAt, setSnapshotLoadedAt] = useState<number | null>(null)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const hasFreshSnapshot = snapshotLoadedAt && Date.now() - snapshotLoadedAt < 60000
    if (hasFreshSnapshot && (completedQuests.length > 0 || nearFinishedQuests.length > 0)) return

    let cancelled = false

    const loadQuestSnapshot = async () => {
      setLoading(true)

      try {
        const { data: authPayload } = await supabase.auth.getUser()
        const authUser = authPayload.user
        if (!authUser) {
          if (!cancelled) {
            setCompletedQuests([])
            setNearFinishedQuests([])
          }
          return
        }

        const [postedResult, votesResult, feedbackSentResult, followResult, dailyResult, throneVotesResult, playlistVotesResult, coffreAttemptsResult, playlistSuggestionsResult, throneRoundsResult, parisMisesResult, parisNotificationsResult, parisQuestionsResult, bottleSentResult, vueProfileResult, badgeRows, questStatuses] = await Promise.all([
          supabase.from('titre').select('id, created_at, likes, vues_actuelles, points, youtube_channel_id').eq('user_id', authUser.id).order('created_at', { ascending: false }),
          supabase.from('vote').select('created_at, points').eq('user_id', authUser.id).limit(1500),
          supabase.from('feedback').select('id, created_at').eq('digger_id', authUser.id).limit(1500),
          getFollowState(authUser.id, authUser.id),
          supabase.rpc('fn_daily_login_state', { p_user_id: authUser.id }),
          supabase.from('tlmvpsp_votes').select('created_at').eq('user_id', authUser.id).limit(1500),
          supabase.from('playlist_votes').select('created_at').eq('user_id', authUser.id).limit(1500),
          supabase.from('coffrefort_tentatives').select('created_at, is_correct').eq('user_id', authUser.id).limit(1500),
          supabase.from('playlist_suggestions').select('created_at').eq('user_id', authUser.id).limit(1500),
          supabase.from('tlmvpsp_rounds').select('mode, starts_at, ends_at, king_titre_id').limit(1500),
          supabase.from('paris_mises').select('montant').eq('user_id', authUser.id).limit(1500),
          supabase.from('notifications').select('type').eq('user_id', authUser.id).in('type', ['pari_won', 'pari_lost']).limit(1500),
          supabase.from('paris_questions').select('status, description').limit(1500),
          supabase.from('bottles').select('id').eq('user_id', authUser.id).limit(1500),
          supabase.from('vue_score').select('best_score, times_played, exact_guess_count').eq('user_id', authUser.id).maybeSingle(),
          supabase.from('user_badges').select('badge_id').eq('user_id', authUser.id),
          getUserQuestStatuses(authUser.id),
        ])

        const postedRows = (postedResult.data || []) as Array<{ id: string; created_at: string | null; likes: number | null; vues_actuelles: number | null; points: number | null; youtube_channel_id?: string | null }>
        const detectedRows = postedRows[0]?.youtube_channel_id
          ? (((await supabase.from('titre').select('id').eq('youtube_channel_id', postedRows[0].youtube_channel_id).order('created_at', { ascending: false })).data || []) as Array<{ id: string }> )
          : []
        const ownedTrackIds = new Set([...postedRows.map((track) => track.id), ...detectedRows.map((track) => track.id)])

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
        const badgeIds = new Set(((badgeRows.data || []) as Array<{ badge_id: string }>).map((row) => row.badge_id))

        let throneReignDays = 0
        let autopromoReignDays = 0
        throneRoundRows.forEach((round) => {
          if (!round.king_titre_id || !ownedTrackIds.has(round.king_titre_id) || !round.starts_at) return
          const start = new Date(round.starts_at).getTime()
          const end = round.ends_at ? new Date(round.ends_at).getTime() : Date.now()
          const days = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
          if (round.mode === 'autopromo') autopromoReignDays = Math.max(autopromoReignDays, days)
          else throneReignDays = Math.max(throneReignDays, days)
        })

        const suggestionSignatures = new Set(['Suggéré par '])
        const suggestedRows = parisQuestionRows.filter((row) => row.description ? Array.from(suggestionSignatures).some((prefix) => row.description?.startsWith(prefix)) : false)

        const [diggerRankResult, lastRankResult, musiqueRankResult, prodRankResult, vueRankResult, parisRankResult, playlistRankResult] = await Promise.all([
          supabase.from('digger').select('id, points').order('points', { ascending: false }).limit(250),
          supabase.from('titre').select('id, user_id, created_at').not('type_partage', 'eq', 'production').order('created_at', { ascending: false }).limit(250),
          supabase.from('titre').select('id, user_id, points, created_at').not('type_partage', 'eq', 'production').order('points', { ascending: false }).order('created_at', { ascending: false }).limit(500),
          supabase.from('prod').select('id, user_id, points, created_at').order('created_at', { ascending: false }).limit(500),
          supabase.from('vue_score').select('user_id, best_score').order('best_score', { ascending: false }).limit(250),
          supabase.from('points_history').select('user_id, amount').eq('type', 'bet').gt('amount', 0).limit(1500),
          supabase.from('playlist_tracks').select('created_at, removed_at, expires_at, titre:titre_id(user_id)').limit(500),
        ])

        const diggerRows = (diggerRankResult.data || []) as Array<{ id: string; points: number | null }>
        const lastRows = (lastRankResult.data || []) as Array<{ user_id: string | null }>
        const musiqueRows = (musiqueRankResult.data || []) as Array<{ user_id: string | null }>
        const prodRows = (prodRankResult.data || []) as Array<{ user_id: string | null }>
        const vueRows = (vueRankResult.data || []) as Array<{ user_id: string | null; best_score: number | null }>
        const parisRows = (parisRankResult.data || []) as Array<{ user_id: string | null; amount: number | null }>
        const playlistRows = (playlistRankResult.data || []) as Array<{ created_at: string | null; removed_at: string | null; expires_at: string | null; titre: { user_id?: string | null } | Array<{ user_id?: string | null }> | null }>

        const parisTotals = new Map<string, number>()
        parisRows.forEach((row) => {
          if (!row.user_id) return
          parisTotals.set(row.user_id, (parisTotals.get(row.user_id) || 0) + Number(row.amount || 0))
        })
        const parisRankingRows = Array.from(parisTotals.entries()).map(([user_id, total_amount]) => ({ user_id, total_amount })).sort((left, right) => right.total_amount - left.total_amount)

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

        const playlistRankingRows = Array.from(playlistBestByUser.entries()).map(([user_id, best_duration]) => ({ user_id, best_duration })).sort((left, right) => right.best_duration - left.best_duration)
        const playlistFinalCount = playlistRows.reduce((count, row) => {
          const titleRow = Array.isArray(row.titre) ? row.titre[0] : row.titre
          if (titleRow?.user_id !== authUser.id || !row.created_at) return count
          const startedAt = new Date(row.created_at).getTime()
          const endedAt = row.removed_at ? new Date(row.removed_at).getTime() : row.expires_at ? new Date(row.expires_at).getTime() : nowTs
          if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) return count
          return endedAt - startedAt >= 7 * 24 * 60 * 60 * 1000 ? count + 1 : count
        }, 0)

        const stats: ExtraQuestStats = {
          sharesToday: postedRows.filter((track) => isSameLocalDay(track.created_at)).length,
          likesSentToday: ((votesResult.data || []) as Array<{ created_at: string | null }>).filter((entry) => isSameLocalDay(entry.created_at)).length,
          coffreAttemptsToday: coffreAttemptRows.filter((entry) => isSameLocalDay(entry.created_at)).length,
          coffreAttemptsTotal: coffreAttemptRows.length,
          coffreUnlockCount: coffreAttemptRows.filter((entry) => Boolean(entry.is_correct)).length,
          bottleSentCount: bottleSentRows.length,
          vueGamesPlayed: Number(vueProfileRow?.times_played || 0),
          vueBestScore: Number(vueProfileRow?.best_score || 0),
          vueWarmupPerfectCount: Math.max(Number(vueProfileRow?.exact_guess_count || 0), badgeIds.has('devin_exact') ? 1 : 0),
          throneVotesToday: throneVoteRows.filter((entry) => isSameLocalDay(entry.created_at)).length,
          throneVotesTotal: throneVoteRows.length,
          playlistVotesToday: playlistVoteRows.filter((entry) => isSameLocalDay(entry.created_at)).length,
          playlistVotesTotal: playlistVoteRows.length,
          playlistSuggestionsTotal: playlistSuggestionRows.length,
          playlistBestDurationDays: Math.floor((playlistRankingRows.find((row) => row.user_id === authUser.id)?.best_duration || 0) / 24),
          playlistParticipationStreak: getActivityDayStreak([...playlistVoteRows.map((entry) => entry.created_at), ...playlistSuggestionRows.map((entry) => entry.created_at)]),
          playlistFinalCount,
          parisProposalCount: suggestedRows.length,
          parisAcceptedCount: suggestedRows.filter((row) => row.status === 'open' || row.status === 'resolved').length,
          betCount: parisMiseRows.length,
          betWonCount: parisNotificationRows.filter((entry) => entry.type === 'pari_won').length,
          betLostCount: parisNotificationRows.filter((entry) => entry.type === 'pari_lost').length,
          totalBetAmount: parisMiseRows.reduce((sum, row) => sum + Number(row.montant || 0), 0),
          throneReignDays,
          autopromoReignDays,
        }

        const ranks: LeaderboardRanks = {
          digger: (() => { const index = diggerRows.findIndex((row) => row.id === authUser.id); return index >= 0 ? index + 1 : null })(),
          last: findBestTrackRank(lastRows, authUser.id),
          musique: findBestTrackRank(musiqueRows, authUser.id),
          prod: findBestTrackRank(prodRows, authUser.id),
          'jeu-vue': findRankForUser(vueRows, authUser.id),
          'jeu-paris': findRankForUser(parisRankingRows, authUser.id),
          'jeu-playlist': findRankForUser(playlistRankingRows, authUser.id),
        }

        const streakPayload = Array.isArray(dailyResult.data) ? dailyResult.data[0] : dailyResult.data
        const streakDays = streakPayload?.success ? Number(streakPayload.streak_day || 0) : 0
        const followingCount = followResult.data?.following_count || 0
        const followersCount = followResult.data?.followers_count || 0
        const feedbackGivenCount = ((feedbackSentResult.data || []) as Array<{ id: string }>).length
        const feedbackReceivedCount = 0
        const likesSentCount = ((votesResult.data || []) as Array<{ points: number | null }>).length
        const likesReceivedCount = postedRows.reduce((sum, track) => sum + Number(track.likes || 0), 0)
        const shareCount = postedRows.length
        const arenaGamesVisited = [
          stats.coffreAttemptsTotal > 0,
          stats.throneVotesTotal > 0,
          stats.playlistVotesTotal > 0 || stats.playlistSuggestionsTotal > 0 || stats.playlistBestDurationDays > 0,
          stats.betCount > 0,
          stats.bottleSentCount > 0,
          stats.vueGamesPlayed > 0 || stats.vueBestScore > 0 || stats.vueWarmupPerfectCount > 0,
        ].filter(Boolean).length

        const questCards = buildQuestCards({
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
          leaderboardRanks: ranks,
        })

        const statusMap = new Map((questStatuses as UserQuestStatus[]).map((status) => [status.quest_id, status]))

        if (!cancelled) {
          setCompletedQuests(
            questCards
              .filter((quest) => quest.completed)
              .map((quest) => ({
                ...quest,
                claimed: Boolean(statusMap.get(quest.id)?.claimed_at),
                rewardLabel: statusMap.get(quest.id)?.claimed_at ? `${quest.rewardLabel} • recue` : quest.rewardLabel,
              }))
              .sort((left, right) => Number(left.claimed) - Number(right.claimed))
          )
          setNearFinishedQuests(
            questCards
              .filter((quest) => !quest.completed)
              .sort((left, right) => right.progressPercent - left.progressPercent)
              .slice(0, 6)
              .map((quest) => ({
                ...quest,
                rewardLabel: statusMap.get(quest.id)?.claimed_at ? `${quest.rewardLabel} • recue` : quest.rewardLabel,
              }))
          )
          setSnapshotLoadedAt(Date.now())
        }
      } catch (error) {
        console.error('Erreur chargement resume quetes:', error)
        if (!cancelled) {
          setCompletedQuests([])
          setNearFinishedQuests([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadQuestSnapshot()

    return () => {
      cancelled = true
    }
  }, [completedQuests.length, isOpen, nearFinishedQuests.length, snapshotLoadedAt])

  const completedCount = useMemo(() => completedQuests.length, [completedQuests])
  const claimableCompletedCount = useMemo(() => completedQuests.filter((quest) => !quest.claimed).length, [completedQuests])
  const highlightedCompletedQuests = useMemo(() => completedQuests.slice(0, 6), [completedQuests])
  const shouldHighlightTrigger = claimableCompletedCount > acknowledgedClaimableCount

  useEffect(() => {
    if (claimableCompletedCount === 0 && acknowledgedClaimableCount !== 0) {
      setAcknowledgedClaimableCount(0)
    }
  }, [acknowledgedClaimableCount, claimableCompletedCount])

  const handleClaimQuest = async (quest: QuestCard) => {
    if (!quest.completed || quest.claimed || claimingQuestIds.includes(quest.id)) return

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
      return
    }

    setCompletedQuests((current) =>
      current
        .map((entry) =>
          entry.id === quest.id
            ? { ...entry, claimed: true, rewardLabel: `${quest.pearlReward} perles • ${quest.xpReward} XP • recue` }
            : entry
        )
        .sort((left, right) => Number(left.claimed) - Number(right.claimed))
    )
      setSnapshotLoadedAt(Date.now())
  }
  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center overflow-y-auto bg-black/72 px-4 py-10 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-6xl max-h-[calc(100vh-4rem)] overflow-y-auto rounded-[34px] border border-[#7CFF00]/30 bg-[linear-gradient(180deg,#08110b_0%,#07110c_100%)] shadow-[0_0_70px_rgba(124,255,0,0.14)]" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-white/8 px-7 py-7 sm:px-10 sm:py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-4xl">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#7CFF00]/75">Quetes</p>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-4xl">Grand panneau de progression</h3>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400 sm:text-[15px]">Tu vois ici clairement ce que chaque quete demande, ou tu en es, et ce que tu gagnes en la terminant.</p>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 text-white/70 transition hover:border-[#7CFF00]/50 hover:text-[#7CFF00]">✕</button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5 text-left">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Quetes terminees</p>
                  <p className="mt-3 text-3xl font-black text-white">{completedCount}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-amber-200 px-2 py-1 text-[10px] text-black">
                    {claimableCompletedCount}
                  </span>
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-400">
                {claimableCompletedCount > 0
                  ? `${claimableCompletedCount} recompense${claimableCompletedCount > 1 ? 's' : ''} de quete attendent encore d etre empochee${claimableCompletedCount > 1 ? 's' : ''}.`
                  : 'Toutes les recompenses des quetes terminees ont deja ete validees.'}
              </p>
            </div>
            <div className="rounded-[22px] border border-cyan-400/18 bg-cyan-500/10 px-5 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/75">Proches de la fin</p>
              <p className="mt-3 text-3xl font-black text-white">{nearFinishedQuests.length}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-2">
          <section className="border-b border-white/8 px-7 py-7 xl:border-b-0 xl:border-r xl:border-white/8 sm:px-10 sm:py-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black uppercase tracking-[0.18em] text-white">Quetes terminees</h4>
                <p className="mt-2 text-sm text-gray-500">Les quetes deja bouclees avec leurs gains.</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">{completedCount}</span>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Chargement des quetes...</p>
            ) : completedQuests.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune quete terminee pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {highlightedCompletedQuests.map((quest) => (
                  <div key={quest.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          {quest.badgeFamily && quest.badgeLabel && quest.badgeTierLabel ? (
                            <QuestBadgePreview
                              family={quest.badgeFamily}
                              label={quest.badgeLabel}
                              tierLabel={quest.badgeTierLabel}
                              size="xs"
                            />
                          ) : null}
                          <p className="text-base font-black uppercase tracking-[0.08em] text-white">{quest.title}</p>
                        </div>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/75">{quest.categoryLabel}</p>
                        <p className="mt-3 text-sm leading-6 text-gray-400">{quest.progressLabel}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${quest.claimed ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-300/15 text-amber-100'}`}>
                        {quest.claimed ? 'Terminee' : 'A valider'}
                      </span>
                    </div>
                    <div className="mt-4 rounded-2xl border border-emerald-400/12 bg-emerald-500/8 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/65">Recompense</p>
                      <p className="mt-2 text-[12px] font-black uppercase tracking-[0.12em] text-amber-100/85">{quest.rewardLabel}</p>
                      {quest.badgeFamily && quest.badgeLabel && quest.badgeTierLabel ? (
                        <div className="mt-3 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/70">Badge inclus</p>
                          <div className="mt-3 flex justify-center">
                            <QuestBadgePreview
                              family={quest.badgeFamily}
                              label={quest.badgeLabel}
                              tierLabel={quest.badgeTierLabel}
                              size="sm"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {!quest.claimed ? (
                      <button
                        type="button"
                        onClick={() => handleClaimQuest(quest)}
                        disabled={claimingQuestIds.includes(quest.id)}
                        className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-amber-300/24 bg-amber-300/12 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-100 transition hover:border-amber-200/45 hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {claimingQuestIds.includes(quest.id) ? 'Validation...' : 'Valider la quete'}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="px-7 py-7 sm:px-10 sm:py-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black uppercase tracking-[0.18em] text-white">Quetes bientot finies</h4>
                <p className="mt-2 text-sm text-gray-500">Les objectifs sur lesquels tu peux avancer tout de suite.</p>
              </div>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Top progression</span>
            </div>
            {loading ? (
              <p className="text-sm text-gray-500">Chargement des quetes...</p>
            ) : nearFinishedQuests.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune quete proche de la fin pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {nearFinishedQuests.map((quest) => (
                  <div key={quest.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          {quest.badgeFamily && quest.badgeLabel && quest.badgeTierLabel ? (
                            <QuestBadgePreview
                              family={quest.badgeFamily}
                              label={quest.badgeLabel}
                              tierLabel={quest.badgeTierLabel}
                              size="xs"
                            />
                          ) : null}
                          <p className="text-base font-black uppercase tracking-[0.08em] text-white">{quest.title}</p>
                        </div>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200/75">{quest.categoryLabel}</p>
                        <p className="mt-3 text-sm leading-6 text-gray-400">{quest.progressLabel}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300">{quest.progressPercent}%</span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${quest.progressPercent}%` }} />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100/72">Progression visible</p>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-100/80">{quest.rewardLabel}</p>
                    </div>
                    {quest.badgeFamily && quest.badgeLabel && quest.badgeTierLabel ? (
                      <div className="mt-4 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-100/70">Badge en recompense</p>
                        <div className="mt-3 flex justify-center">
                          <QuestBadgePreview
                            family={quest.badgeFamily}
                            label={quest.badgeLabel}
                            tierLabel={quest.badgeTierLabel}
                            size="sm"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-white/8 px-7 py-6 sm:px-10">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              router.push('/profil?panel=progression&view=overview')
            }}
            className="inline-flex h-12 items-center justify-center rounded-full border border-[#7CFF00]/30 bg-[#7CFF00] px-6 text-[11px] font-black uppercase tracking-[0.18em] text-black transition hover:shadow-[0_0_28px_rgba(124,255,0,0.4)]"
          >
            Aller vers mon profil
          </button>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAcknowledgedClaimableCount(claimableCompletedCount)
          setIsOpen(true)
        }}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black transition-all hover:scale-105 ${shouldHighlightTrigger
          ? 'border-[#7CFF00]/70 text-[#7CFF00] shadow-[0_0_20px_rgba(124,255,0,0.22)] hover:border-[#96FF33] hover:shadow-[0_0_28px_rgba(124,255,0,0.4)]'
          : 'border-white/14 text-white/78 hover:border-white/26 hover:bg-white/6 hover:text-white'}`}
        aria-label="Ouvrir le resume des quetes"
        title="Resume des quetes"
      >
        ?
        {shouldHighlightTrigger ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-[#7CFF00]/55 bg-[#7CFF00] px-1.5 py-0.5 text-[9px] font-black leading-none text-black shadow-[0_0_16px_rgba(124,255,0,0.45)]">
            {claimableCompletedCount > 99 ? '99+' : claimableCompletedCount}
          </span>
        ) : null}
      </button>

      {portalReady && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  )
}
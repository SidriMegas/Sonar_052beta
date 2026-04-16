import { supabase } from './supabase'

export type UserQuestStatus = {
  quest_id: string
  notified_at: string | null
  claimed_at: string | null
  pearl_reward: number | null
  xp_reward: number | null
}

type MarkQuestNotifiedResponse = {
  success?: boolean
  notification_created?: boolean
  notified_at?: string | null
  claimed_at?: string | null
  error?: string
}

type ClaimQuestRewardResponse = {
  success?: boolean
  status?: string
  claimed_at?: string | null
  pearl_reward?: number | null
  xp_reward?: number | null
  badge_id?: string | null
  error?: string
}

export async function getUserQuestStatuses(userId: string) {
  const { data, error } = await supabase
    .from('user_quest_status')
    .select('quest_id, notified_at, claimed_at, pearl_reward, xp_reward')
    .eq('user_id', userId)

  if (error) {
    console.error('Erreur chargement user_quest_status:', error)
    return [] as UserQuestStatus[]
  }

  return (data || []) as UserQuestStatus[]
}

export async function markQuestNotified(questId: string, title: string, message: string) {
  const { data, error } = await supabase.rpc('fn_user_quest_mark_notified', {
    p_quest_id: questId,
    p_title: title,
    p_message: message,
  })

  if (error) {
    console.error('Erreur notification quete:', error)
    return { success: false, error: error.message } satisfies MarkQuestNotifiedResponse
  }

  const first = Array.isArray(data) ? data[0] : data
  return (first || { success: false }) as MarkQuestNotifiedResponse
}

export async function claimQuestReward(params: {
  questId: string
  pearlReward: number
  xpReward: number
  badgeId?: string | null
  badgeName?: string | null
  badgeDescription?: string | null
}) {
  const { data, error } = await supabase.rpc('fn_user_quest_claim', {
    p_quest_id: params.questId,
    p_pearl_reward: params.pearlReward,
    p_xp_reward: params.xpReward,
    p_badge_id: params.badgeId || null,
    p_badge_name: params.badgeName || null,
    p_badge_description: params.badgeDescription || null,
  })

  if (error) {
    console.error('Erreur validation quete:', error)
    return { success: false, error: error.message } satisfies ClaimQuestRewardResponse
  }

  const first = Array.isArray(data) ? data[0] : data
  return (first || { success: false }) as ClaimQuestRewardResponse
}
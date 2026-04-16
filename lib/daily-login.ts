import { supabase } from '@/lib/supabase'

export interface DailyLoginReward {
  day_number: number
  reward_label: string
  reward_points: number
  badge_id: string | null
  reward_payload: Record<string, unknown>
  is_active: boolean
}

export interface DailyLoginClaimResult {
  success: boolean
  already_claimed: boolean
  day_number: number
  reward_label: string
  reward_points: number
  badge_id: string | null
  reward_payload: Record<string, unknown>
  error?: string
}

export interface DailyLoginClaimEntry {
  day_number: number
  claim_date: string
  reward_label: string
  reward_points: number
  badge_id: string | null
  reward_payload: Record<string, unknown>
}

export interface DailyLoginState {
  success: boolean
  today: string
  streak_day: number
  current_day: number
  claimed_today: boolean
  claims: DailyLoginClaimEntry[]
  error?: string
}

export async function getDailyLoginRewards() {
  const { data, error } = await supabase.rpc('fn_daily_login_rewards')
  if (error && /fn_daily_login_rewards/i.test(error.message || '')) {
    const fallback = await supabase
      .from('daily_login_rewards')
      .select('day_number, reward_label, reward_points, badge_id, reward_payload, is_active')
      .eq('is_active', true)
      .order('day_number', { ascending: true })
    return { data: (fallback.data as DailyLoginReward[] | null) ?? [], error: fallback.error }
  }
  return { data: (data as DailyLoginReward[] | null) ?? [], error }
}

export async function claimDailyLogin(userId: string) {
  const { data, error } = await supabase.rpc('fn_daily_login_claim', {
    p_user_id: userId,
  })

  if (error) {
    return {
      data: {
        success: false,
        already_claimed: false,
        day_number: 0,
        reward_label: '',
        reward_points: 0,
        badge_id: null,
        reward_payload: {},
        error: error.message,
      } as DailyLoginClaimResult,
      error,
    }
  }

  const first = Array.isArray(data) ? data[0] : data
  return {
    data: (first as DailyLoginClaimResult) ?? null,
    error: null,
  }
}

export async function getDailyLoginState(userId: string) {
  const { data, error } = await supabase.rpc('fn_daily_login_state', {
    p_user_id: userId,
  })

  if (error && /fn_daily_login_state/i.test(error.message || '')) {
    const [streakRes, claimsRes] = await Promise.all([
      supabase
        .from('daily_login_streak')
        .select('streak_day, last_claim_date')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('daily_login_claims')
        .select('day_number, claim_date, reward_label, reward_points, badge_id, reward_payload')
        .eq('user_id', userId)
        .order('claim_date', { ascending: false })
        .limit(14),
    ])

    const today = new Date().toISOString().slice(0, 10)
    const lastClaim = streakRes.data?.last_claim_date || null
    const claimedToday = lastClaim === today
    const streakDay = Number(streakRes.data?.streak_day || 0)
    const currentDay = claimedToday ? (streakDay || 1) : ((streakDay % 14) + 1 || 1)

    return {
      data: {
        success: true,
        today,
        streak_day: streakDay,
        current_day: currentDay,
        claimed_today: claimedToday,
        claims: (claimsRes.data || []) as DailyLoginClaimEntry[],
      } as DailyLoginState,
      error: claimsRes.error || streakRes.error || null,
    }
  }

  if (error) {
    return {
      data: {
        success: false,
        today: '',
        streak_day: 0,
        current_day: 1,
        claimed_today: false,
        claims: [],
        error: error.message,
      } as DailyLoginState,
      error,
    }
  }

  const first = Array.isArray(data) ? data[0] : data
  return {
    data: (first as DailyLoginState) ?? null,
    error: null,
  }
}

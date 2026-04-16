import { supabase } from '@/lib/supabase'

export interface FollowState {
  is_following: boolean
  followers_count: number
  following_count: number
}

export async function getFollowState(viewerId: string | null, profileId: string) {
  const { data, error } = await supabase.rpc('fn_follow_state', {
    p_viewer_id: viewerId,
    p_profile_id: profileId,
  })

  if (error) {
    return {
      data: { is_following: false, followers_count: 0, following_count: 0 } as FollowState,
      error,
    }
  }

  const first = Array.isArray(data) ? data[0] : data
  return {
    data: (first as FollowState) ?? { is_following: false, followers_count: 0, following_count: 0 },
    error: null,
  }
}

export async function toggleFollow(followerId: string, followedId: string) {
  const { data, error } = await supabase.rpc('fn_toggle_follow', {
    p_follower_id: followerId,
    p_followed_id: followedId,
  })

  if (error) {
    return {
      data: {
        success: false,
        is_following: false,
        followers_count: 0,
        following_count: 0,
        error: error.message,
      },
      error,
    }
  }

  const first = Array.isArray(data) ? data[0] : data
  return { data: first, error: null }
}

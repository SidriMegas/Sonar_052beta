"use client"

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type UseAuthOptions = {
  redirectTo?: string
  redirectIfAuthenticated?: string
}

export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const applySession = (nextUser: User | null) => {
      if (!alive) return

      setUser(nextUser)
      setLoading(false)

      if (!nextUser && options.redirectTo) {
        router.push(options.redirectTo)
      }

      if (nextUser && options.redirectIfAuthenticated) {
        router.push(options.redirectIfAuthenticated)
      }
    }

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      applySession(session?.user ?? null)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [options.redirectIfAuthenticated, options.redirectTo, router])

  return { user, loading }
}
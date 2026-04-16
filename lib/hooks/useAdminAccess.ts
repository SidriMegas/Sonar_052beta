"use client"

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { isAdminRole } from '@/lib/admin'

type AdminProfile = {
  id: string
  username: string | null
  role: string | null
}

export function useAdminAccess() {
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setCheckingAccess(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        const nextUser = session?.user || null
        setUser(nextUser)

        if (!nextUser) {
          setProfile(null)
          setIsAdmin(false)
          return
        }

        const { data } = await supabase
          .from('digger')
          .select('id, username, role')
          .eq('id', nextUser.id)
          .single()

        if (!mounted) return

        const nextProfile = (data || null) as AdminProfile | null
        setProfile(nextProfile)
        setIsAdmin(isAdminRole(nextProfile?.role))
      } finally {
        if (mounted) {
          setCheckingAccess(false)
        }
      }
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    checkingAccess,
    isAdmin,
    user,
    profile,
  }
}
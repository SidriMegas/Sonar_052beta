"use client"

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const BottlesSend = dynamic(() => import('./bottlessend'), { ssr: false })
const DailyLoginRewardRunner = dynamic(() => import('./DailyLoginRewardRunner'), { ssr: false })

export default function GlobalClientServices() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const activate = () => {
      if (!cancelled) {
        setReady(true)
      }
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(activate, { timeout: 1500 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(idleId)
      }
    }

    const timer = globalThis.setTimeout(activate, 600)
    return () => {
      cancelled = true
      globalThis.clearTimeout(timer)
    }
  }, [])

  if (!ready) return null

  return (
    <>
      <DailyLoginRewardRunner />
      <BottlesSend />
    </>
  )
}
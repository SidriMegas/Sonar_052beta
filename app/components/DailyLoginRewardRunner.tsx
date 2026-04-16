'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { claimDailyLogin } from '@/lib/daily-login'

const formatDailyLoginError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack }
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      code?: unknown
      details?: unknown
      hint?: unknown
      message?: unknown
    }

    return {
      message: typeof candidate.message === 'string' ? candidate.message : '',
      code: typeof candidate.code === 'string' ? candidate.code : '',
      details: typeof candidate.details === 'string' ? candidate.details : '',
      hint: typeof candidate.hint === 'string' ? candidate.hint : '',
    }
  }

  return { message: String(error) }
}

/**
 * LOGIQUE (Le "Hook" intégré)
 * On place la fonction de communication avec Supabase directement ici.
 */
async function claimDailyReward(userId: string) {
  try {
    const { data, error } = await claimDailyLogin(userId)

    if (error || !data) {
      console.error('Erreur lors de la récupération de la récompense:', formatDailyLoginError(error || data))
      return null
    }
    
    if (!data.success) {
      console.error('Erreur lors de la récupération de la récompense:', {
        message: data.error || 'Réponse daily login invalide',
      })
      return null
    }

    // Si rien n'est retourné ou si déjà réclamé
    if (data.already_claimed) return null

    return {
      key: Date.now(),
      fromDay: data.day_number > 1 ? data.day_number - 1 : 1,
      toDay: data.day_number,
      rewardLabel: data.reward_label,
      rewardPoints: data.reward_points,
      badgeId: data.badge_id
    }
  } catch (err) {
    console.error('Erreur lors de la récupération de la récompense:', formatDailyLoginError(err))
    return null
  }
}

/**
 * VISUEL (Le Composant)
 */
export default function DailyLoginRewardRunner() {
  const [toast, setToast] = useState<any>(null)

  // On prépare les 14 barres de progression
  const depthPalette = useMemo(() => 
    Array.from({ length: 14 }, (_, i) => ({
      day: i + 1,
      background: `hsl(202, 65%, ${Math.max(18, 46 - i * 2)}%)`,
    })), []
  )

  useEffect(() => {
    let isMounted = true

    async function checkAction(userId: string) {
      const result = await claimDailyReward(userId)
      if (result && isMounted) {
        setToast(result)
      }
    }

    // Vérification initiale
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) checkAction(data.user.id)
    })

    // Écouteur de connexion/déconnexion
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        checkAction(session.user.id)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Auto-fermeture du toast
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 7000)
    return () => clearTimeout(timer)
  }, [toast])

  if (!toast) return null

  return (
    <>
      <div className="daily-login-toast">
        <div className="daily-login-header">RÉCOMPENSE QUOTIDIENNE</div>
        
        <div className="daily-login-row">
          <span className="label">Jour</span>
          <div className="day-number-box">
            <span className="number">{toast.toDay}</span>
          </div>
          <span className="total">/ 14</span>
        </div>

        <div className="progress-steps">
          {depthPalette.map((item) => (
            <div
              key={item.day}
              className={`step-bar ${item.day <= toast.toDay ? 'active' : ''}`}
              style={{
                background: item.background,
                height: `${15 + item.day * 2}px`,
              }}
            />
          ))}
        </div>

        <div className="reward-info">
          <div className="reward-name">{toast.rewardLabel}</div>
          <div className="reward-value">+{toast.rewardPoints} perles</div>
        </div>
      </div>

      <style jsx>{`
        .daily-login-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 300px;
          background: #02121a;
          border: 1px solid #3eb5e5;
          border-radius: 12px;
          padding: 20px;
          color: white;
          z-index: 10000;
          box-shadow: 0 15px 40px rgba(0,0,0,0.6);
          animation: slideIn 0.5s ease-out;
        }
        .daily-login-header {
          font-size: 10px;
          letter-spacing: 2px;
          color: #7cdbff;
          margin-bottom: 12px;
        }
        .daily-login-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
        }
        .day-number-box {
          background: #000;
          border: 1px solid #7cdbff;
          padding: 2px 8px;
          border-radius: 4px;
          color: #9df0ff;
        }
        .progress-steps {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 50px;
          margin: 15px 0;
        }
        .step-bar {
          flex: 1;
          border-radius: 2px 2px 0 0;
          opacity: 0.15;
          transition: all 0.5s ease;
        }
        .step-bar.active {
          opacity: 1;
          box-shadow: 0 0 8px rgba(124, 219, 255, 0.4);
        }
        .reward-info {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 12px;
        }
        .reward-name { font-weight: bold; font-size: 14px; }
        .reward-value { color: #7cdbff; font-size: 13px; }

        @keyframes slideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
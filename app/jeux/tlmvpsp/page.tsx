"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getTrackEmbedId } from '@/lib/youtube'

type ModeKey = 'global' | 'autopromo'
type VoteChoice = 'king' | 'challenger'

type TrackCard = {
	id: string
	userId: string | null
	artist: string
	title: string
	youtubeUrl: string | null
	youtubeId: string | null
	views: number
	likes: number
	points: number
	autopromo: boolean
}

type RoundCard = {
	id: string
	mode: ModeKey
	startsAt: string
	endsAt: string
	kingDays: number
	king: TrackCard
	challenger: TrackCard
}

type MyTitle = {
	id: string
	artist: string
	title: string
	autopromo: boolean
}

type PagePayload = {
	generatedAt: string
	modes: Record<ModeKey, RoundCard>
	me: {
		userId: string | null
		points: number
		titles: MyTitle[]
		votes: Record<string, VoteChoice>
		queuedAutopromo: {
			id: string
			titre_id: string
			created_at: string
		} | null
	}
}

const formatCountdown = (endAt: string, now: number) => {
	const totalSeconds = Math.max(0, Math.floor((new Date(endAt).getTime() - now) / 1000))
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

const formatCompactNumber = (value: number) => {
	return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

const formatThroneDate = (startsAt: string, kingDays: number) => {
	const throneDate = new Date(startsAt)
	throneDate.setDate(throneDate.getDate() - Math.max(kingDays - 1, 0))
	return throneDate.toLocaleDateString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})
}

function TimelineDivider() {
	return (
		<div className="relative h-44 w-full overflow-visible">
			<div className="absolute right-0 top-0 z-20">
				<Link
					href="/jeux/tlmvpsp/frise"
					className="inline-flex items-center gap-2 rounded-full border border-[#d8c68f]/30 bg-black/25 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#e8d7a5] transition hover:border-[#d8c68f]/55 hover:text-white"
				>
					Voir la fresque
				</Link>
			</div>
			<div className="absolute left-1/2 top-[8%] h-56 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(255,254,250,0.99)_18%,rgba(251,240,213,0.92)_34%,rgba(207,163,71,0.38)_54%,rgba(41,82,99,0.16)_74%,rgba(16,34,42,0)_100%)] blur-3xl" />
			<div className="absolute left-1/2 top-[8%] h-40 w-[21rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.98)_0%,rgba(255,250,241,0.92)_34%,rgba(187,132,40,0.32)_68%,rgba(21,50,61,0)_100%)] blur-2xl" />
			<div className="absolute inset-x-0 top-[56%] h-[3px] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(116,69,16,0),rgba(144,92,25,0.88),rgba(167,108,30,1),rgba(144,92,25,0.88),rgba(116,69,16,0))] shadow-[0_0_14px_rgba(167,108,30,0.28)]" />
			<div className="absolute left-1/2 top-[9%] z-10 -translate-x-1/2 -translate-y-1/2">
				<Link
					href="/jeux/tlmvpsp/frise"
					aria-label="Ouvrir la fresque"
					className="group flex h-[82px] w-[82px] items-center justify-center rounded-full transition-transform duration-300 hover:scale-110 focus:scale-110"
				>
					<svg viewBox="0 0 72 72" className="h-full w-full drop-shadow-[0_0_24px_rgba(167,108,30,0.4)] text-[#8c5517]" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="36" cy="36" r="27" className="opacity-25" />
						<circle cx="36" cy="36" r="15" className="opacity-45" />
						<circle cx="36" cy="36" r="5" fill="currentColor" stroke="none" />
						<path d="M36 10v6m0 40v6M10 36h6m40 0h6" strokeLinecap="round" opacity="0.6" />
					</svg>
				</Link>
			</div>
			<div className="absolute right-0 top-[56%] -translate-y-1/2 text-[#c9b278]">
				<svg viewBox="0 0 50 18" className="h-5 w-14" fill="none" stroke="currentColor" strokeWidth="1.4">
					<path d="M1 9H43" strokeLinecap="round" />
					<path d="M34 2l9 7-9 7" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
		</div>
	)
}

function DuelTrackCard({
	track,
	label,
	accentClass,
	subtitle,
	artistSuffix,
}: {
	track: TrackCard
	label: string
	accentClass: string
	subtitle: string
	artistSuffix?: string
}) {
	const embedId = getTrackEmbedId({ youtube_id: track.youtubeId, youtube_url: track.youtubeUrl })
	const [playerActive, setPlayerActive] = useState(false)

	return (
		<article className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0b1620]/88 shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur-sm">
			<div className={`flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 ${accentClass}`}>
				<div>
					<p className="text-[11px] uppercase tracking-[0.35em] text-white/75">{label}</p>
					{subtitle ? <p className="mt-1 text-xs font-semibold text-white/90 md:text-sm">{subtitle}</p> : null}
				</div>
				<div className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/80">
					{track.autopromo ? 'Autopromo' : 'Global'}
				</div>
			</div>

			<div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_268px] md:items-start xl:grid-cols-[minmax(0,1fr)_248px]">
				<div>
					<h3 className="text-lg font-black uppercase leading-tight text-white md:text-xl">{track.title}</h3>
					<p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-[#f4d8aa] md:text-xs">
						{track.artist}
						{artistSuffix ? <span className="ml-2 text-white/92">{artistSuffix}</span> : null}
					</p>

					<div className="mt-4 grid grid-cols-3 gap-2 text-sm">
						<div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
							<p className="text-[10px] uppercase tracking-[0.25em] text-white/55">Vues</p>
							<p className="mt-1 text-sm font-bold text-white md:text-base">{formatCompactNumber(track.views)}</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
							<p className="text-[10px] uppercase tracking-[0.25em] text-white/55">Likes</p>
							<p className="mt-1 text-sm font-bold text-white md:text-base">{formatCompactNumber(track.likes)}</p>
						</div>
						<div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
							<p className="text-[10px] uppercase tracking-[0.25em] text-white/55">Perles</p>
							<p className="mt-1 text-sm font-bold text-white md:text-base">{formatCompactNumber(track.points)}</p>
						</div>
					</div>
				</div>

				<div className="overflow-hidden rounded-[18px] border border-white/10 bg-black/30 aspect-video min-h-[176px] md:min-h-[164px] xl:min-h-[156px]">
					{embedId ? (
						playerActive ? (
							<iframe
								className="h-full w-full"
								src={`https://www.youtube.com/embed/${embedId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
								title={`${track.artist} - ${track.title}`}
								allow="autoplay; encrypted-media"
								allowFullScreen
								loading="lazy"
							/>
						) : (
							<button
								type="button"
								onClick={() => setPlayerActive(true)}
								className="group relative h-full w-full overflow-hidden bg-[#081119]"
								aria-label={`Lancer ${track.artist} - ${track.title}`}
							>
								<img
									src={`https://img.youtube.com/vi/${embedId}/hqdefault.jpg`}
									alt=""
									className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
									draggable={false}
								/>
								<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,12,0.1),rgba(4,8,12,0.45))]" />
								<div className="absolute inset-0 flex items-center justify-center">
									<span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#c81d25] shadow-[0_0_24px_rgba(200,29,37,0.35)] transition duration-300 group-hover:scale-110 group-hover:bg-[#dc262f]">
										<svg viewBox="0 0 24 24" className="h-7 w-7 translate-x-[1px] text-white" fill="currentColor" aria-hidden="true">
											<path d="M8 6.5v11l9-5.5-9-5.5Z" />
										</svg>
									</span>
								</div>
							</button>
						)
					) : (
						<div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/55">
							Aucun embed YouTube disponible pour ce morceau.
						</div>
					)}
				</div>
			</div>
		</article>
	)
}

function ArenaSection({
	mode,
	round,
	currentVote,
	now,
	onVote,
	busyVote,
	userId,
}: {
	mode: ModeKey
	round: RoundCard
	currentVote?: VoteChoice
	now: number
	onVote: (mode: ModeKey, roundId: string, choice: VoteChoice) => void
	busyVote: string | null
	userId: string | null
}) {
	const voteLocked = Boolean(currentVote)
	const countdown = formatCountdown(round.endsAt, now)
	const sectionLabel = mode === 'global' ? 'Global' : 'Autopromo'
	const gradient =
		mode === 'global'
			? 'bg-[linear-gradient(135deg,rgba(15,118,110,0.85),rgba(11,33,49,0.9))]'
			: 'bg-[linear-gradient(135deg,rgba(194,65,12,0.88),rgba(66,32,6,0.92))]'

	return (
		<section className="flex h-full flex-col rounded-[26px] border border-white/10 bg-[#071018]/78 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur md:p-5">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p className="text-[11px] uppercase tracking-[0.4em] text-[#9fd9d0]">{sectionLabel}</p>
					<h2 className="mt-2 whitespace-nowrap text-[clamp(1.2rem,2vw,1.9rem)] font-black uppercase text-white md:text-[clamp(1.35rem,1.8vw,2rem)]">
						{mode === 'global' ? 'Le roi des oceans' : 'Le roi des autopromos'}
					</h2>
				</div>

				<div className={`rounded-[18px] border border-white/12 px-4 py-3 text-white ${gradient}`}>
					<p className="text-[10px] uppercase tracking-[0.28em] text-white/70">Fin du duel</p>
					<p className="mt-1 text-xl font-black">{countdown}</p>
					<p className="mt-1 text-[11px] text-white/70">Votes caches.</p>
				</div>
			</div>

			<div className="mt-4 space-y-4">
				<DuelTrackCard
					track={round.king}
					label="Roi"
					subtitle=""
					artistSuffix={`👑 depuis le ${formatThroneDate(round.startsAt, round.kingDays)}`}
					accentClass={mode === 'global' ? 'bg-[#0f766e]/70' : 'bg-[#c2410c]/80'}
				/>

				<DuelTrackCard
					track={round.challenger}
					label="Challenger"
					subtitle=""
					accentClass={mode === 'global' ? 'bg-[#164e63]/80' : 'bg-[#7c2d12]/85'}
				/>
			</div>

			<div className="mt-4 mt-auto rounded-[18px] border border-white/8 bg-black/14 p-3">
				<div className="mb-3 flex justify-end">
					{voteLocked ? (
						<div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
							Ton vote: {currentVote === 'king' ? 'Je garde le roi' : 'Je veux le challenger'}
						</div>
					) : (
						<div className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/60">
							{userId ? '1 vote par duel' : 'Connecte-toi pour voter'}
						</div>
					)}
				</div>

				<div className="grid gap-2.5 md:grid-cols-2">
					<button
						onClick={() => onVote(mode, round.id, 'king')}
						disabled={!userId || voteLocked || busyVote === `${mode}:king`}
						className="rounded-[12px] border border-white/10 bg-[#0d2430]/92 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-[#a7f3d0]/35 hover:bg-[#133041] disabled:cursor-not-allowed disabled:opacity-50"
					>
						<p className="text-[10px] uppercase tracking-[0.32em] text-[#9bded6]">Conserver</p>
						<p className="mt-1.5 text-sm font-black uppercase text-white md:text-[15px]">Je garde le roi</p>
						<p className="mt-1 text-[11px] text-white/58 md:text-xs">Le morceau en place continue sa serie.</p>
					</button>

					<button
						onClick={() => onVote(mode, round.id, 'challenger')}
						disabled={!userId || voteLocked || busyVote === `${mode}:challenger`}
						className="rounded-[12px] border border-white/10 bg-[#2a140c]/92 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-[#fdba74]/35 hover:bg-[#3a1b11] disabled:cursor-not-allowed disabled:opacity-50"
					>
						<p className="text-[10px] uppercase tracking-[0.32em] text-[#fdba74]">Renverser</p>
						<p className="mt-1.5 text-sm font-black uppercase text-white md:text-[15px]">Je veux le challenger</p>
						<p className="mt-1 text-[11px] text-white/58 md:text-xs">Le challenger prend la place s il passe devant.</p>
					</button>
				</div>
			</div>
		</section>
	)
}

export default function TlmvpspPage() {
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const [payload, setPayload] = useState<PagePayload | null>(null)
	const [busyVote, setBusyVote] = useState<string | null>(null)
	const [busyAutopromo, setBusyAutopromo] = useState(false)
	const [selectedAutopromoId, setSelectedAutopromoId] = useState('')
	const [now, setNow] = useState(Date.now())

	const fetchState = useCallback(async (showLoader = false) => {
		if (showLoader) setLoading(true)
		setError('')

		const {
			data: { session },
		} = await supabase.auth.getSession()

		const headers: HeadersInit = {}
		if (session?.access_token) {
			headers.Authorization = `Bearer ${session.access_token}`
		}

		const res = await fetch('/api/tlmvpsp/state', {
			headers,
			cache: 'no-store',
		})

		const json = await res.json().catch(() => null)

		if (!res.ok) {
			setPayload(null)
			setError(json?.error || 'Impossible de charger TLMVPSP.')
			setLoading(false)
			return
		}

		setPayload(json)

		setLoading(false)
	}, [])

	useEffect(() => {
		if (selectedAutopromoId || !payload) return

		const firstAutopromo = payload.me.titles.find((title) => title.autopromo)
		if (firstAutopromo) {
			setSelectedAutopromoId(firstAutopromo.id)
		}
	}, [payload, selectedAutopromoId])

	useEffect(() => {
		fetchState(true)

		const refreshTimer = setInterval(() => {
			fetchState(false)
		}, 30000)

		const clockTimer = setInterval(() => {
			setNow(Date.now())
		}, 1000)

		return () => {
			clearInterval(refreshTimer)
			clearInterval(clockTimer)
		}
	}, [fetchState])

	const handleVote = async (mode: ModeKey, roundId: string, choice: VoteChoice) => {
		setError('')
		setSuccess('')
		setBusyVote(`${mode}:${choice}`)

		try {
			const {
				data: { session },
			} = await supabase.auth.getSession()

			if (!session?.access_token) {
				setError('Connecte-toi pour voter.')
				return
			}

			const res = await fetch('/api/tlmvpsp/vote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ mode, roundId, choice }),
			})

			const json = await res.json().catch(() => null)
			if (!res.ok) {
				setError(json?.error || 'Vote refuse.')
				return
			}

			setSuccess(choice === 'king' ? 'Vote enregistre: tu gardes le roi.' : 'Vote enregistre: tu soutiens le challenger.')
			await fetchState(false)
		} finally {
			setBusyVote(null)
		}
	}

	const handleAutopromoEntry = async () => {
		setError('')
		setSuccess('')

		if (!selectedAutopromoId) {
			setError('Choisis un morceau autopromo avant de valider.')
			return
		}

		setBusyAutopromo(true)
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession()

			if (!session?.access_token) {
				setError('Connecte-toi pour engager un challenger autopromo.')
				return
			}

			const res = await fetch('/api/tlmvpsp/autopromo/enter', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ titreId: selectedAutopromoId }),
			})

			const json = await res.json().catch(() => null)
			if (!res.ok) {
				setError(json?.error || 'Impossible d envoyer ce challenger.')
				return
			}

			setSuccess('Challenger autopromo envoye. 200 perles debitees et file d attente mise a jour.')
			await fetchState(false)
		} finally {
			setBusyAutopromo(false)
		}
	}

	const autopromoTitles = payload?.me.titles.filter((title) => title.autopromo) || []

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98)_0%,rgba(250,241,214,0.7)_16%,rgba(178,129,47,0.22)_30%,rgba(30,75,94,0.2)_52%,#091722_72%,#04070b_100%)] px-4 py-8 text-white md:px-8 lg:px-10">
			<div className="mx-auto max-w-[1500px]">
				{error ? (
					<div className="mt-6 rounded-[24px] border border-rose-500/35 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">{error}</div>
				) : null}
				{success ? (
					<div className="mt-6 rounded-[24px] border border-emerald-500/35 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">{success}</div>
				) : null}

				{loading || !payload ? (
					<div className="mt-8 rounded-[30px] border border-white/12 bg-[#09131a]/70 px-6 py-16 text-center text-white/62">
						Chargement de la salle TLMVPSP...
					</div>
				) : (
					<div className="mt-8 grid gap-8">
						<div className="relative">
							<TimelineDivider />
							<div className="pointer-events-none absolute bottom-0 left-1/2 top-[66px] hidden -translate-x-1/2 xl:flex xl:flex-col xl:items-center">
								<div className="w-[4px] flex-1 rounded-full bg-[linear-gradient(180deg,rgba(181,119,32,0.95),rgba(140,85,23,0.98),rgba(109,63,17,0.98))] shadow-[0_0_14px_rgba(167,108,30,0.22)]" />
							</div>
							<div className="grid gap-10 xl:grid-cols-2 xl:items-start xl:gap-14 2xl:gap-16">
								<ArenaSection
									mode="global"
									round={payload.modes.global}
									currentVote={payload.me.votes[payload.modes.global.id]}
									now={now}
									onVote={handleVote}
									busyVote={busyVote}
									userId={payload.me.userId}
								/>

								<ArenaSection
									mode="autopromo"
									round={payload.modes.autopromo}
									currentVote={payload.me.votes[payload.modes.autopromo.id]}
									now={now}
									onVote={handleVote}
									busyVote={busyVote}
									userId={payload.me.userId}
								/>
							</div>
						</div>

						<div className="rounded-[30px] border border-white/12 bg-[#09131a]/80 p-5 backdrop-blur md:p-6">
							<div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
								<div>
									<p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Zone artiste</p>
									<h2 className="mt-2 text-2xl font-black uppercase text-white">Entrer dans l arene autopromo</h2>
									<p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
										Choisis un de tes morceaux marques en autopromo, paie 200 perles, puis attends qu il soit selectionne comme prochain challenger.
									</p>
								</div>

								<div className="rounded-[22px] border border-white/12 bg-black/25 px-5 py-4 text-sm text-white/78">
									<p>Solde actuel: <span className="font-black text-[#f4d8aa]">{payload.me.points} perles</span></p>
									<p className="mt-1">Statut file: <span className="font-semibold text-white">{payload.me.queuedAutopromo ? '1 morceau en attente' : 'aucun morceau en attente'}</span></p>
								</div>
							</div>

							<div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
								<select
									value={selectedAutopromoId}
									onChange={(event) => setSelectedAutopromoId(event.target.value)}
									className="w-full rounded-[20px] border border-white/12 bg-[#081018] px-4 py-4 text-sm text-white outline-none transition focus:border-[#fdba74]/45"
								>
									<option value="">Choisis un morceau autopromo</option>
									{autopromoTitles.map((title) => (
										<option key={title.id} value={title.id}>
											{title.artist} - {title.title}
										</option>
									))}
								</select>

								<button
									onClick={handleAutopromoEntry}
									disabled={busyAutopromo || !payload.me.userId || Boolean(payload.me.queuedAutopromo) || autopromoTitles.length === 0}
									className="rounded-[20px] bg-[#d97706] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-[#180b02] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
								>
									{busyAutopromo ? 'Validation...' : 'Valider 200 perles'}
								</button>
							</div>

							<div className="mt-3 flex flex-col gap-2 text-xs text-white/58 md:flex-row md:items-center md:justify-between">
								<p>Seuls tes morceaux autopromo apparaissent dans cette selection.</p>
								{payload.me.queuedAutopromo ? (
									<p className="text-[#fdba74]">Un challenger est deja en file d attente pour ton compte.</p>
								) : autopromoTitles.length === 0 ? (
									<p className="text-[#fdba74]">Aucun morceau autopromo detecte sur ton compte.</p>
								) : (
									<p>Le nombre de votes reste cache pour tout le monde.</p>
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

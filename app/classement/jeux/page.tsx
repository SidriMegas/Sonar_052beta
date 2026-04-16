"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import EquippedBadgesInline from '@/app/components/EquippedBadgesInline'

type VueScoreRow = {
	user_id: string
	username: string
	best_score: number
	times_played?: number | null
	equipped_badge_1?: string | null
	equipped_badge_2?: string | null
}

type ParisGainRow = {
	userId: string
	username: string
	totalWon: number
	winsCount: number
	equipped_badge_1?: string | null
	equipped_badge_2?: string | null
}

type PlaylistDurationRow = {
	id: string
	source: 'admin' | 'suggestion' | string
	startedAt: string
	endedAt: string
	durationHours: number
	titre: {
		nom_artiste: string
		nom_titre: string
	}
}

const toDurationLabel = (hours: number) => {
	const safe = Math.max(0, Math.floor(hours * 60))
	const h = Math.floor(safe / 60)
	const m = safe % 60
	return `${h}h ${m}m`
}

export default function ClassementJeuxPage() {
	const [loading, setLoading] = useState(true)
	const [vueRanking, setVueRanking] = useState<VueScoreRow[]>([])
	const [parisRanking, setParisRanking] = useState<ParisGainRow[]>([])
	const [playlistLongest, setPlaylistLongest] = useState<PlaylistDurationRow[]>([])
	const [error, setError] = useState('')
	const [activeTab, setActiveTab] = useState<'vue' | 'paris' | 'playlist'>('vue')
	const [loadedTabs, setLoadedTabs] = useState<Record<'vue' | 'paris' | 'playlist', boolean>>({
		vue: false,
		paris: false,
		playlist: false,
	})

	useEffect(() => {
		let cancelled = false

		const fetchData = async () => {
			if (loadedTabs[activeTab]) return
			setLoading(true)
			if (!loadedTabs[activeTab]) setError('')

			try {
				if (activeTab === 'vue') {
					const vueRes = await supabase
						.from('vue_score')
						.select('user_id, username, best_score, times_played')
						.order('best_score', { ascending: false })
						.limit(200)

					if (vueRes.error) throw new Error(vueRes.error.message)
					if (cancelled) return

					const vueUserIds = Array.from(new Set((vueRes.data || []).map((row) => row.user_id).filter(Boolean)))
					const { data: vueUsers } = vueUserIds.length
						? await supabase.from('digger').select('id, equipped_badge_1, equipped_badge_2').in('id', vueUserIds)
						: { data: [] as Array<{ id: string; equipped_badge_1?: string | null; equipped_badge_2?: string | null }> }
					const vueUserMap = new Map((vueUsers || []).map((row) => [row.id, row]))

					setVueRanking((vueRes.data || []).map((row) => ({
						user_id: row.user_id,
						username: row.username || 'Anonyme',
						best_score: Number(row.best_score || 0),
						times_played: row.times_played,
						equipped_badge_1: vueUserMap.get(row.user_id)?.equipped_badge_1 || null,
						equipped_badge_2: vueUserMap.get(row.user_id)?.equipped_badge_2 || null,
					})))
				}

				if (activeTab === 'paris') {
					const pointsRes = await supabase
						.from('points_history')
						.select('user_id, amount')
						.eq('type', 'bet')
						.gt('amount', 0)
						.limit(1500)

					if (pointsRes.error) throw new Error(pointsRes.error.message)

					const pointsRows = pointsRes.data || []
					const pointsUserIds = Array.from(new Set(pointsRows.map((r) => r.user_id).filter(Boolean)))
					const { data: pointsUsers } = pointsUserIds.length
						? await supabase.from('digger').select('id, username, equipped_badge_1, equipped_badge_2').in('id', pointsUserIds)
						: { data: [] as Array<{ id: string; username: string | null; equipped_badge_1?: string | null; equipped_badge_2?: string | null }> }

					const pointsUserMap = new Map((pointsUsers || []).map((u) => [u.id, u]))
					const gainsMap = new Map<string, ParisGainRow>()
					for (const row of pointsRows) {
						const userId = row.user_id as string
						const digger = pointsUserMap.get(userId)
						const current = gainsMap.get(userId) || {
							userId,
							username: digger?.username || 'Anonyme',
							totalWon: 0,
							winsCount: 0,
							equipped_badge_1: digger?.equipped_badge_1 || null,
							equipped_badge_2: digger?.equipped_badge_2 || null,
						}
						current.totalWon += Number(row.amount || 0)
						current.winsCount += 1
						gainsMap.set(userId, current)
					}

					if (cancelled) return
					setParisRanking(Array.from(gainsMap.values()).sort((a, b) => b.totalWon - a.totalWon).slice(0, 50))
				}

				if (activeTab === 'playlist') {
					const playlistRes = await supabase
						.from('playlist_tracks')
						.select('id, source, created_at, removed_at, expires_at, titre:titre_id(nom_artiste, nom_titre)')
						.order('created_at', { ascending: false })
						.limit(300)

					if (playlistRes.error) throw new Error(playlistRes.error.message)

					const nowTs = Date.now()
					const playlistData: PlaylistDurationRow[] = (playlistRes.data || [])
						.map((row) => {
							const startedTs = new Date(row.created_at).getTime()
							const endedTs = row.removed_at
								? new Date(row.removed_at).getTime()
								: row.expires_at
									? new Date(row.expires_at).getTime()
									: nowTs

							const titreData = Array.isArray(row.titre) ? row.titre[0] : row.titre

							return {
								id: row.id,
								source: row.source,
								startedAt: row.created_at,
								endedAt: row.removed_at || row.expires_at || new Date(nowTs).toISOString(),
								durationHours: Math.max(0, (endedTs - startedTs) / 1000 / 3600),
								titre: {
									nom_artiste: titreData?.nom_artiste || 'Artiste inconnu',
									nom_titre: titreData?.nom_titre || 'Sans titre',
								},
							}
						})
						.sort((a, b) => b.durationHours - a.durationHours)
						.slice(0, 30)

					if (cancelled) return
					setPlaylistLongest(playlistData)
				}

				if (!cancelled) {
					setLoadedTabs((current) => ({ ...current, [activeTab]: true }))
				}
			} catch (err) {
				if (cancelled) return
				const message = err instanceof Error ? err.message : 'Erreur de chargement.'
				setError(message)
			} finally {
				if (!cancelled) {
					setLoading(false)
				}
			}
		}

		fetchData()

		return () => {
			cancelled = true
		}
	}, [activeTab, loadedTabs])

	const stats = useMemo(() => {
		return {
			vuePlayers: vueRanking.length,
			parisPlayers: parisRanking.length,
			playlistEntries: playlistLongest.length,
		}
	}, [vueRanking, parisRanking, playlistLongest])

	return (
		<div className="min-h-screen bg-gradient-to-b from-[#001524] via-[#000814] to-black text-white px-4 pt-28 pb-16 md:px-10">
			<div className="max-w-7xl mx-auto">
				<div className="mb-8">
					<h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">Classement Jeux</h1>
					<p className="text-cyan-200/70 mt-2 text-sm">Vue, Paris, et Playlistoartager dans un seul radar.</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
					<div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-4">
						<p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">Joueurs Vue</p>
						<p className="text-2xl font-black text-cyan-100">{stats.vuePlayers}</p>
					</div>
					<div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
						<p className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70">Parieurs Gagnants</p>
						<p className="text-2xl font-black text-emerald-100">{stats.parisPlayers}</p>
					</div>
					<div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
						<p className="text-[10px] uppercase tracking-[0.2em] text-violet-200/70">Titres Playlist Classement</p>
						<p className="text-2xl font-black text-violet-100">{stats.playlistEntries}</p>
					</div>
				</div>

				{error && <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}

				<div className="flex gap-3 mb-8">
					{(['vue', 'paris', 'playlist'] as const).map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border ${
								activeTab === tab
									? tab === 'vue' ? 'bg-cyan-500 border-cyan-500 text-black' : tab === 'paris' ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-violet-500 border-violet-500 text-black'
									: 'bg-transparent border-white/20 text-white/60 hover:border-white/40'
							}`}
						>
							{tab === 'vue' ? 'Jeu Vue' : tab === 'paris' ? 'Gains Paris' : 'Playlist'}
						</button>
					))}
				</div>

				<div>
					{activeTab === 'vue' && <section className="table-shell rounded-2xl border border-white/10 bg-transparent overflow-hidden">
						<div className="px-5 py-4 border-b border-white/10">
							<h2 className="text-lg font-black uppercase">Top Jeu Vue</h2>
							<p className="text-xs text-slate-400 mt-1">Meilleurs scores sur jeux/vue.</p>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-[760px] w-full text-sm">
								<thead className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
									<tr>
										<th className="p-4 text-left">#</th>
										<th className="p-4 text-left">Joueur</th>
										<th className="p-4 text-center">Best Score</th>
										<th className="p-4 text-center">Parties</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{loading ? (
										<tr><td colSpan={4} className="p-8 text-center text-slate-400">Chargement...</td></tr>
									) : vueRanking.length === 0 ? (
										<tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucun score disponible.</td></tr>
									) : (
										vueRanking.map((row, idx) => (
											<tr key={`${row.user_id}-${idx}`} className="hover:bg-cyan-500/5">
												<td className="p-4 font-black text-cyan-300">#{idx + 1}</td>
												<td className="p-4 font-bold"><span className="inline-flex items-center gap-2">@{row.username}<EquippedBadgesInline badgeIds={[row.equipped_badge_1, row.equipped_badge_2]} size="xs" /></span></td>
												<td className="p-4 text-center font-black text-cyan-200">{row.best_score}</td>
												<td className="p-4 text-center text-slate-300">{row.times_played || 0}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</section>}

					{activeTab === 'paris' && <section className="table-shell rounded-2xl border border-white/10 bg-transparent overflow-hidden">
						<div className="px-5 py-4 border-b border-white/10">
							<h2 className="text-lg font-black uppercase">Top Gains Paris</h2>
							<p className="text-xs text-slate-400 mt-1">Utilisateurs ayant gagne le plus de perles avec jeux/paris.</p>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-[760px] w-full text-sm">
								<thead className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
									<tr>
										<th className="p-4 text-left">#</th>
										<th className="p-4 text-left">Parieur</th>
										<th className="p-4 text-center">Perles gagnees</th>
										<th className="p-4 text-center">Paris gagnants</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{loading ? (
										<tr><td colSpan={4} className="p-8 text-center text-slate-400">Chargement...</td></tr>
									) : parisRanking.length === 0 ? (
										<tr><td colSpan={4} className="p-8 text-center text-slate-400">Aucun gain enregistre.</td></tr>
									) : (
										parisRanking.map((row, idx) => (
											<tr key={`${row.userId}-${idx}`} className="hover:bg-emerald-500/5">
												<td className="p-4 font-black text-emerald-300">#{idx + 1}</td>
												<td className="p-4 font-bold"><span className="inline-flex items-center gap-2">@{row.username}<EquippedBadgesInline badgeIds={[row.equipped_badge_1, row.equipped_badge_2]} size="xs" /></span></td>
												<td className="p-4 text-center font-black text-emerald-200">{row.totalWon.toLocaleString('fr-FR')}</td>
												<td className="p-4 text-center text-slate-300">{row.winsCount}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</section>}

					{activeTab === 'playlist' && <section className="table-shell rounded-2xl border border-white/10 bg-transparent overflow-hidden">
						<div className="px-5 py-4 border-b border-white/10">
							<h2 className="text-lg font-black uppercase">Playlistoartager - Plus longue presence</h2>
							<p className="text-xs text-slate-400 mt-1">Titres restes le plus longtemps dans jeux/playlistoartager.</p>
						</div>
						<div className="overflow-x-auto">
							<table className="min-w-[920px] w-full text-sm">
								<thead className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
									<tr>
										<th className="p-4 text-left">#</th>
										<th className="p-4 text-left">Artiste</th>
										<th className="p-4 text-left">Titre</th>
										<th className="p-4 text-center">Duree</th>
										<th className="p-4 text-center">Source</th>
										<th className="p-4 text-center">Debut</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-white/5">
									{loading ? (
										<tr><td colSpan={6} className="p-8 text-center text-slate-400">Chargement...</td></tr>
									) : playlistLongest.length === 0 ? (
										<tr><td colSpan={6} className="p-8 text-center text-slate-400">Aucune entree playlist.</td></tr>
									) : (
										playlistLongest.map((row, idx) => (
											<tr key={row.id} className="hover:bg-violet-500/5">
												<td className="p-4 font-black text-violet-300">#{idx + 1}</td>
												<td className="p-4 font-bold">{row.titre.nom_artiste}</td>
												<td className="p-4 text-slate-200">{row.titre.nom_titre}</td>
												<td className="p-4 text-center font-black text-violet-200">{toDurationLabel(row.durationHours)}</td>
												<td className="p-4 text-center text-[11px] uppercase tracking-[0.14em] text-violet-100">{row.source}</td>
												<td className="p-4 text-center text-slate-300">{new Date(row.startedAt).toLocaleDateString('fr-FR')}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</section>}
				</div>
			</div>
		</div>
	)
}

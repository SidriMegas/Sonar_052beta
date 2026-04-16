"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAdminAccess } from '@/lib/hooks/useAdminAccess'

type AdminUserResult = {
	id: string
	username: string | null
	email: string | null
	role: string | null
	created_at: string | null
}

type AdminTrackResult = {
	id: string
	nom_titre: string | null
	nom_artiste: string | null
	youtube_id: string | null
	user_id: string | null
	likes: number | null
	points: number | null
	created_at: string | null
}

type SearchPayload = {
	users: AdminUserResult[]
	titres: AdminTrackResult[]
	prods: AdminTrackResult[]
}

const adminLinks = [
	{
		href: '/admin/coffrefort',
		title: 'Coffrefort',
		description: 'Piloter le coffre actif, les indices et le suivi des tentatives.',
	},
	{
		href: '/admin/paris',
		title: 'Paris',
		description: 'Creer, cloturer et moderer les paris de la plateforme.',
	},
	{
		href: '/admin/playlistoartager',
		title: 'Playlistoartager',
		description: 'GerER les cycles, les propositions et les rotations admin.',
	},
] as const

export default function AdminPage() {
	const { checkingAccess, isAdmin, profile } = useAdminAccess()
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<SearchPayload>({ users: [], titres: [], prods: [] })
	const [searching, setSearching] = useState(false)
	const [actionBusy, setActionBusy] = useState<string | null>(null)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	const getAccessToken = async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession()

		return session?.access_token || null
	}

	const runSearch = async (value = query) => {
		const trimmed = value.trim()
		setError('')
		setSuccess('')

		if (trimmed.length < 2) {
			setResults({ users: [], titres: [], prods: [] })
			return
		}

		const token = await getAccessToken()
		if (!token) {
			setError('Session admin introuvable.')
			return
		}

		setSearching(true)

		try {
			const response = await fetch(`/api/admin/control?q=${encodeURIComponent(trimmed)}`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const payload = await response.json().catch(() => null)

			if (!response.ok) {
				setResults({ users: [], titres: [], prods: [] })
				setError(typeof payload?.error === 'string' ? payload.error : 'Recherche admin impossible.')
				return
			}

			setResults({
				users: Array.isArray(payload?.users) ? payload.users : [],
				titres: Array.isArray(payload?.titres) ? payload.titres : [],
				prods: Array.isArray(payload?.prods) ? payload.prods : [],
			})
		} catch (err) {
			console.error('Erreur recherche admin:', err)
			setError('Erreur reseau pendant la recherche.')
		} finally {
			setSearching(false)
		}
	}

	const runAction = async (action: 'suspend-user' | 'delete-user' | 'delete-titre' | 'delete-prod', id: string, label: string) => {
		const token = await getAccessToken()
		if (!token) {
			setError('Session admin introuvable.')
			return
		}

		const confirmMessage =
			action === 'suspend-user'
				? `Suspendre ${label} ?`
				: `Confirmer l action ${action} sur ${label} ?`

		if (!window.confirm(confirmMessage)) return

		setActionBusy(`${action}:${id}`)
		setError('')
		setSuccess('')

		try {
			const response = await fetch('/api/admin/control', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ action, id }),
			})

			const payload = await response.json().catch(() => null)

			if (!response.ok) {
				setError(typeof payload?.details === 'string' ? payload.details : typeof payload?.error === 'string' ? payload.error : 'Action admin impossible.')
				return
			}

			setSuccess(typeof payload?.message === 'string' ? payload.message : 'Action admin executee.')
			await runSearch(query)
		} catch (err) {
			console.error('Erreur action admin:', err)
			setError('Erreur reseau pendant l action admin.')
		} finally {
			setActionBusy(null)
		}
	}

	useEffect(() => {
		if (query.trim().length < 2) {
			setResults({ users: [], titres: [], prods: [] })
		}
	}, [query])

	if (checkingAccess) {
		return <div className="min-h-screen bg-[#041019] px-6 pt-32 text-white">Verification de l acces admin...</div>
	}

	if (!isAdmin) {
		return (
			<div className="min-h-screen bg-[#041019] px-6 pt-32 text-white">
				<div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-black/30 p-8">
					<p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">Acces refuse</p>
					<p className="mt-4 text-sm text-white/70">Cette zone est reservee aux administrateurs.</p>
				</div>
			</div>
		)
	}

	return (
		<main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,255,148,0.12),transparent_30%),linear-gradient(180deg,#031019_0%,#02060a_100%)] px-6 pb-16 pt-28 text-white">
			<div className="mx-auto max-w-7xl space-y-8">
				<section className="rounded-[30px] border border-emerald-300/12 bg-black/35 p-8 shadow-[0_0_60px_rgba(16,185,129,0.08)] backdrop-blur">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
						<div>
							<p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300/70">Admin Control</p>
							<h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">Panneau de controle</h1>
							<p className="mt-3 max-w-2xl text-sm text-white/64">
								Navigation rapide vers les modules admin, recherche transverse utilisateurs et musiques, et actions de moderation.
							</p>
						</div>

						<div className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-right">
							<p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Session</p>
							<p className="mt-2 text-lg font-black text-emerald-200">{profile?.username || 'admin'}</p>
							<p className="text-xs uppercase tracking-[0.18em] text-emerald-300/70">role {profile?.role || 'admin'}</p>
						</div>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-3">
					{adminLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="group rounded-[26px] border border-emerald-300/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 transition hover:-translate-y-1 hover:border-emerald-300/30 hover:shadow-[0_18px_50px_rgba(16,185,129,0.14)]"
						>
							<p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300/60">admin dossier</p>
							<h2 className="mt-3 text-xl font-black uppercase tracking-[0.08em] text-white group-hover:text-emerald-200">{link.title}</h2>
							<p className="mt-3 text-sm text-white/60">{link.description}</p>
						</Link>
					))}
				</section>

				<section className="rounded-[30px] border border-white/10 bg-black/30 p-8">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/70">Recherche admin</p>
							<h2 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">Trouver un utilisateur ou une musique</h2>
						</div>

						<form
							onSubmit={(event) => {
								event.preventDefault()
								void runSearch()
							}}
							className="flex w-full max-w-3xl gap-3"
						>
							<input
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Pseudo, email, titre, artiste, YouTube ID"
								className="min-w-0 flex-1 rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-emerald-300/35"
							/>
							<button
								type="submit"
								disabled={searching || query.trim().length < 2}
								className="rounded-full border border-emerald-400/40 bg-emerald-400/14 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-emerald-200 transition hover:bg-emerald-400/22 disabled:cursor-not-allowed disabled:opacity-45"
							>
								{searching ? 'Recherche...' : 'Chercher'}
							</button>
						</form>
					</div>

					{error ? <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
					{success ? <p className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{success}</p> : null}

					<div className="mt-8 grid gap-6 xl:grid-cols-3">
						<div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Utilisateurs</h3>
								<span className="text-xs text-white/40">{results.users.length}</span>
							</div>
							<div className="mt-4 space-y-3">
								{results.users.length === 0 ? <p className="text-sm text-white/38">Aucun utilisateur charge.</p> : null}
								{results.users.map((user) => {
									const suspendBusy = actionBusy === `suspend-user:${user.id}`
									const deleteBusy = actionBusy === `delete-user:${user.id}`
									const protectedAdmin = user.role === 'admin'
									return (
										<article key={user.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
											<p className="truncate text-sm font-black text-white">{user.username || 'Sans pseudo'}</p>
											<p className="mt-1 truncate text-xs text-white/48">{user.email || 'Email indisponible'}</p>
											<div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/45">
												<span>{user.role || 'digger'}</span>
												<span>{user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-'}</span>
											</div>
											<div className="mt-4 flex gap-2">
												<button
													onClick={() => void runAction('suspend-user', user.id, user.username || user.id)}
													disabled={suspendBusy || protectedAdmin}
													className="flex-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
												>
													{suspendBusy ? '...' : 'Suspendre'}
												</button>
												<button
													onClick={() => void runAction('delete-user', user.id, user.username || user.id)}
													disabled={deleteBusy || protectedAdmin}
													className="flex-1 rounded-full border border-red-300/30 bg-red-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
												>
													{deleteBusy ? '...' : 'Supprimer'}
												</button>
											</div>
										</article>
									)
								})}
							</div>
						</div>

						<div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Titres</h3>
								<span className="text-xs text-white/40">{results.titres.length}</span>
							</div>
							<div className="mt-4 space-y-3">
								{results.titres.length === 0 ? <p className="text-sm text-white/38">Aucun titre charge.</p> : null}
								{results.titres.map((track) => {
									const busy = actionBusy === `delete-titre:${track.id}`
									return (
										<article key={track.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
											<p className="truncate text-sm font-black text-white">{track.nom_artiste || 'Artiste'} - {track.nom_titre || 'Titre'}</p>
											<p className="mt-1 truncate text-xs text-white/45">YouTube {track.youtube_id || 'n/a'}</p>
											<div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/45">
												<span>{Number(track.likes || 0)} likes</span>
												<span>{Number(track.points || 0)} points</span>
											</div>
											<div className="mt-4 flex gap-2">
												<Link href={`/track/${track.id}`} className="flex-1 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
													Ouvrir
												</Link>
												<button
													onClick={() => void runAction('delete-titre', track.id, `${track.nom_artiste || ''} - ${track.nom_titre || ''}`)}
													disabled={busy}
													className="flex-1 rounded-full border border-red-300/30 bg-red-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
												>
													{busy ? '...' : 'Supprimer'}
												</button>
											</div>
										</article>
									)
								})}
							</div>
						</div>

						<div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Prods</h3>
								<span className="text-xs text-white/40">{results.prods.length}</span>
							</div>
							<div className="mt-4 space-y-3">
								{results.prods.length === 0 ? <p className="text-sm text-white/38">Aucune prod chargee.</p> : null}
								{results.prods.map((track) => {
									const busy = actionBusy === `delete-prod:${track.id}`
									return (
										<article key={track.id} className="rounded-[22px] border border-white/8 bg-black/30 p-4">
											<p className="truncate text-sm font-black text-white">{track.nom_artiste || 'Beatmaker'} - {track.nom_titre || 'Prod'}</p>
											<p className="mt-1 truncate text-xs text-white/45">YouTube {track.youtube_id || 'n/a'}</p>
											<div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/45">
												<span>{Number(track.likes || 0)} likes</span>
												<span>{Number(track.points || 0)} points</span>
											</div>
											<div className="mt-4 flex gap-2">
												<Link href={`/prod/${track.id}`} className="flex-1 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
													Ouvrir
												</Link>
												<button
													onClick={() => void runAction('delete-prod', track.id, `${track.nom_artiste || ''} - ${track.nom_titre || ''}`)}
													disabled={busy}
													className="flex-1 rounded-full border border-red-300/30 bg-red-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
												>
													{busy ? '...' : 'Supprimer'}
												</button>
											</div>
										</article>
									)
								})}
							</div>
						</div>
					</div>
				</section>
			</div>
		</main>
	)
}

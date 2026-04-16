"use client"
import Link from 'next/link'

export default function BoutiquePage() {
  return (
    <div className="bg-black min-h-screen text-white overflow-hidden relative pt-[120px]">
      {/* FOND ANIMÉ */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-950/20 via-black to-blue-950/20 pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(168,85,247,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
        
        {/* ICÔNE PRINCIPALE */}
        <div className="mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-3xl opacity-30 animate-pulse" />
          <div className="relative bg-gradient-to-br from-purple-900 to-pink-900 p-8 rounded-full border-2 border-purple-500/50">
            <span className="text-7xl">🛍️</span>
          </div>
        </div>

        {/* TITRE */}
        <h1 className="text-7xl md:text-8xl font-black uppercase text-center mb-6 tracking-tighter leading-none">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            BOUTIQUE
          </span>
        </h1>

        {/* SOUS-TITRE */}
        <p className="text-2xl md:text-3xl font-black uppercase text-gray-400 mb-12 text-center tracking-widest">
          EN TRAVAUX 🚧
        </p>

        {/* DESCRIPTION */}
        <div className="max-w-2xl text-center mb-16">
          <p className="text-lg text-gray-300 mb-4 leading-relaxed">
            La boutique Sonar arrive bientôt avec des <span className="text-purple-400 font-bold">exclusivités</span> inédites : 
          </p>
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-2xl p-8 mb-8">
            <ul className="space-y-3 text-left text-gray-300">
              <li className="flex items-center gap-3">
                <span className="text-purple-400 font-black">🎵</span>
                <span>NFTs de pépites rares</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-purple-400 font-black">👕</span>
                <span>Merch officiel Sonar</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-purple-400 font-black">🏆</span>
                <span>Badges & accès VIP</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-purple-400 font-black">🎁</span>
                <span>Packages premium</span>
              </li>
            </ul>
          </div>
        </div>

        {/* COMPTEUR */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">Reste patient... la magie arrive 🌊</p>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-4xl font-black text-purple-400">∞</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Possibilités</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-pink-400">🚀</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Bientôt</p>
            </div>
          </div>
        </div>

        {/* RETOUR */}
        <div className="mt-16">
          <Link
            href="/profil"
            className="text-gray-400 hover:text-white text-sm uppercase font-bold tracking-widest transition-colors"
          >
            ← Retour au profil
          </Link>
        </div>
      </div>
    </div>
  )
}
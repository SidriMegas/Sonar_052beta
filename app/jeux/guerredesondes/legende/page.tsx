"use client"

import { getGenreColor, getGenresList, getSousGenresList } from "@/lib/colors"
import { useState } from "react"

export default function OndesColorLegendPage() {
  const genres = getGenresList()
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null)

  const toggleGenre = (genre: string) => {
    setExpandedGenre(expandedGenre === genre ? null : genre)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030711] via-[#02050b] to-black text-white px-4 pt-28 pb-16 md:px-8">
      <div className="max-w-[800px] mx-auto">
        <div className="rounded-3xl border border-cyan-500/20 bg-[#071223]/60 backdrop-blur-sm p-6 md:p-8 mb-8">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight mb-2">
            Légende Des Couleurs
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/80">
            Système de couleurs par genre et sous-genre
          </p>
        </div>

        <div className="space-y-3">
          {genres.map((genre) => {
            const sousGenres = getSousGenresList(genre)
            const isExpanded = expandedGenre === genre

            return (
              <div
                key={genre}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleGenre(genre)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg border border-white/20 shadow-lg"
                      style={{
                        backgroundColor: getGenreColor(genre, sousGenres[0]),
                      }}
                    />
                    <div className="text-left">
                      <p className="font-black text-sm">{genre}</p>
                      <p className="text-xs text-slate-400">
                        {sousGenres.length} sous-genres
                      </p>
                    </div>
                  </div>
                  <p className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    ▼
                  </p>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/10 px-5 py-4 bg-black/20 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sousGenres.map((sousGenre, index) => (
                        <div
                          key={sousGenre}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5"
                        >
                          <div
                            className="w-6 h-6 rounded-md border border-white/20 flex-shrink-0"
                            style={{
                              backgroundColor: getGenreColor(genre, sousGenre),
                            }}
                          />
                          <span className="text-xs flex-1">{sousGenre}</span>
                          <span className="text-[10px] text-slate-500">
                            {index + 1}/{sousGenres.length}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 font-black mb-3">
            💡 Comment ça marche
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              🎨 <span className="font-semibold">Chaque genre</span> a une teinte de base (exemple: Rap = Vert,
              Pop = Orange)
            </li>
            <li>
              🌈 <span className="font-semibold">Chaque sous-genre</span> a une variation
              de luminosité (du clair au foncé)
            </li>
            <li>
              🎯 Quand tu places une musique sur le plateau, sa couleur correspond au
              genre ET au sous-genre
            </li>
            <li>
              👀 Tu peux directement identifier le genre d'une case en regardant sa couleur
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

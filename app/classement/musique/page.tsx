import MusiqueRankingTable from '@/app/components/MusiqueRankingTable'

export default function ClassementMusiquePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#001524] via-[#000814] to-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-2%] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[-8%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-lime-400/10 blur-3xl" />
        <div className="absolute left-[10%] top-[18%] h-5 w-5 rounded-full border border-cyan-100/20 bg-cyan-100/10" />
        <div className="absolute right-[18%] top-[24%] h-3.5 w-3.5 rounded-full border border-white/10 bg-white/10" />
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_62%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[32rem] bg-[linear-gradient(to_top,rgba(0,0,0,0.92),rgba(0,8,20,0.68),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-20 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        <section className="flex min-h-[calc(100vh-220px)] flex-col justify-center">
          <div className="mb-4 flex flex-col gap-2 rounded-[28px] border border-lime-300/34 bg-[linear-gradient(180deg,rgba(0,0,0,0.88),rgba(3,6,4,0.96))] px-5 py-3 shadow-[0_0_28px_rgba(163,230,53,0.12)] sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.34em] text-lime-200/58">Classement musique</p>
              <h1 className="mt-1 text-3xl font-black uppercase italic text-white sm:text-4xl">Top Radar</h1>
            </div>
            <p className="max-w-xl text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/52 sm:text-right">
              Premiere partie: filtres et podium. Deuxieme partie: le tableau complet.
            </p>
          </div>

          <MusiqueRankingTable />
        </section>
      </div>
    </div>
  )
}
import TlmvpspTimeline from '@/app/components/TlmvpspTimeline'

export default function TlmvpspFrisePage() {
  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto max-w-none">
        <TlmvpspTimeline initialMode="global" />
      </div>
    </div>
  )
}
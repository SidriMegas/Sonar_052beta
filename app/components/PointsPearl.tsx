"use client"

type PointsPearlProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function PointsPearl({ className = '', size = 'md' }: PointsPearlProps) {
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'

  return (
    <span
      className={`inline-block rounded-full bg-gradient-to-br from-cyan-100 via-sky-300 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.7)] relative ${sizeClass} ${className}`}
      aria-hidden="true"
    >
      <span className="absolute top-[1px] left-[1px] w-1.5 h-1.5 rounded-full bg-white/80" />
    </span>
  )
}

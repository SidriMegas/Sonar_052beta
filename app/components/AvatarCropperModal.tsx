"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'

type AvatarCropperModalProps = {
  isOpen: boolean
  imageSrc: string
  onCancel: () => void
  onApply: (blob: Blob) => void
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Impossible de charger l image.'))
    image.src = src
  })
}

async function createAvatarBlob(imageSrc: string, croppedAreaPixels: Area) {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  const size = 480
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Impossible de generer l apercu de l avatar.')
  }

  context.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    size,
    size,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Impossible de creer le fichier avatar.'))
        return
      }

      resolve(blob)
    }, 'image/jpeg', 0.92)
  })
}

export default function AvatarCropperModal({ isOpen, imageSrc, onCancel, onApply }: AvatarCropperModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [localMessage, setLocalMessage] = useState('')

  useEffect(() => {
    if (!isOpen) return

    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setPreviewBlob(null)
    setLocalMessage('')
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
  }, [imageSrc, isOpen])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!isOpen || !imageSrc) return null

  const handleGeneratePreview = async () => {
    if (!croppedAreaPixels) {
      setLocalMessage('Selectionne une zone de profil avant de continuer.')
      return
    }

    setIsGenerating(true)
    setLocalMessage('')

    try {
      const blob = await createAvatarBlob(imageSrc, croppedAreaPixels)
      const nextPreviewUrl = URL.createObjectURL(blob)
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return nextPreviewUrl
      })
      setPreviewBlob(blob)
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : 'Erreur de recadrage.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (!previewBlob) {
      setLocalMessage('Genere d abord un apercu avant de valider.')
      return
    }

    onApply(previewBlob)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/94 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-cyan-300/30 bg-[#090b10] p-5 shadow-[0_0_60px_rgba(34,211,238,0.12)] sm:p-6">
        {!previewUrl ? (
          <>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/70">Avatar</p>
              <h2 className="mt-2 text-xl font-black uppercase text-white">Cadre ta photo</h2>
              <p className="mt-3 text-sm text-gray-400">Deplace l image, zoome ou dezoome. Sur mobile tu peux pincer comme sur un ecran tactile.</p>
            </div>

            <div className="relative mt-5 aspect-square w-full overflow-hidden rounded-[28px] bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                objectFit="contain"
                minZoom={1}
                maxZoom={4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
              <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.64)]" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-cyan-300/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-300">
                <span className="font-black uppercase tracking-[0.18em]">Zoom</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-cyan-300"
              />
            </div>

            {localMessage ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
                {localMessage}
              </div>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button onClick={onCancel} className="flex-1 rounded-full border border-white/12 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6">
                Annuler
              </button>
              <button onClick={handleGeneratePreview} disabled={isGenerating} className="flex-1 rounded-full bg-cyan-400 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-cyan-300 disabled:opacity-60">
                {isGenerating ? 'Generation...' : 'Voir l apercu'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/70">Apercu final</p>
              <h2 className="mt-2 text-xl font-black uppercase text-white">Ta future photo de profil</h2>
              <p className="mt-3 text-sm text-gray-400">Verifie le rendu rond avant de l appliquer au profil.</p>
            </div>

            <div className="mt-6 flex justify-center">
              <div className="h-52 w-52 overflow-hidden rounded-full border border-cyan-300/30 bg-black shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                {previewUrl && (
                  <Image
                    src={previewUrl}
                    alt="Apercu avatar"
                    className="h-full w-full object-cover"
                    width={208}
                    height={208}
                    style={{ objectFit: 'cover', height: '100%', width: '100%' }}
                    unoptimized
                  />
                )}
              </div>
            </div>

            {localMessage ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
                {localMessage}
              </div>
            ) : null}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setPreviewBlob(null)
                  setPreviewUrl((current) => {
                    if (current) URL.revokeObjectURL(current)
                    return ''
                  })
                }}
                className="flex-1 rounded-full border border-white/12 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/6"
              >
                Reprendre
              </button>
              <button onClick={handleApply} className="flex-1 rounded-full bg-emerald-400 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition hover:bg-emerald-300">
                Utiliser cette photo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
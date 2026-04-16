export function extractYoutubeId(url?: string | null): string {
  if (!url) return ''

  const match = url.match(
    /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11}).*/
  )

  return match?.[1] || ''
}

export function getEmbedUrl(url?: string | null): string {
  return extractYoutubeId(url)
}

export function getTrackEmbedId(track?: { youtube_id?: string | null; youtube_url?: string | null } | null): string {
  if (!track) return ''
  if (track.youtube_id && track.youtube_id.length === 11) return track.youtube_id
  return extractYoutubeId(track.youtube_url)
}
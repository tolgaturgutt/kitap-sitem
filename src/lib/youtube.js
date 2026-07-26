const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeVideoId(value) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let videoId = '';

    if (hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (
      hostname === 'youtube.com'
      || hostname === 'm.youtube.com'
      || hostname === 'music.youtube.com'
      || hostname === 'youtube-nocookie.com'
    ) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') || '';
      } else {
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(pathParts[0])) {
          videoId = pathParts[1] || '';
        }
      }
    }

    return YOUTUBE_VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function normalizeYouTubeUrl(value) {
  if (!value?.trim()) return null;

  const videoId = getYouTubeVideoId(value);
  return videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : null;
}

export function getYouTubeEmbedUrl(value) {
  const videoId = getYouTubeVideoId(value);
  return videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
    : null;
}

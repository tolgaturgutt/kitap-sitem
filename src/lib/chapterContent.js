const ALLOWED_TEXT_TAGS = new Set([
  'A',
  'B',
  'BR',
  'DIV',
  'EM',
  'I',
  'P',
  'STRONG',
  'U',
]);

function isAllowedChapterImageUrl(src) {
  if (!src || typeof window === 'undefined') return false;

  try {
    const imageUrl = new URL(src, window.location.origin);
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);

    return (
      imageUrl.origin === supabaseUrl.origin &&
      imageUrl.pathname.startsWith(
        '/storage/v1/object/public/images/chapter-images/'
      )
    );
  } catch {
    return false;
  }
}

function isAllowedChapterAudioUrl(src) {
  if (!src || typeof window === 'undefined') return false;

  try {
    const audioUrl = new URL(src, window.location.origin);
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);

    return (
      audioUrl.origin === supabaseUrl.origin
      && audioUrl.pathname.startsWith(
        '/storage/v1/object/public/images/chapter-audio/'
      )
    );
  } catch {
    return false;
  }
}

function unwrapElement(element) {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
}

export function sanitizeChapterHtml(html) {
  if (!html || typeof document === 'undefined') return '';

  const template = document.createElement('template');
  template.innerHTML = html;

  template.content
    .querySelectorAll('script, style, iframe, object, embed, svg, form, input, button, video, source')
    .forEach(element => element.remove());

  Array.from(template.content.querySelectorAll('*')).forEach(element => {
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') || '';
      if (!isAllowedChapterImageUrl(src)) {
        element.remove();
        return;
      }

      const alt = (element.getAttribute('alt') || 'Bölüm görseli').slice(0, 160);
      Array.from(element.attributes).forEach(attribute => {
        element.removeAttribute(attribute.name);
      });
      element.setAttribute('src', src);
      element.setAttribute('alt', alt);
      element.setAttribute('data-chapter-image', 'true');
      element.setAttribute('loading', 'lazy');
      return;
    }

    if (element.tagName === 'AUDIO') {
      const src = element.getAttribute('src') || '';
      if (!isAllowedChapterAudioUrl(src)) {
        element.remove();
        return;
      }

      Array.from(element.attributes).forEach(attribute => {
        element.removeAttribute(attribute.name);
      });
      element.setAttribute('src', src);
      element.setAttribute('controls', '');
      element.setAttribute('preload', 'metadata');
      element.setAttribute('data-chapter-audio', 'true');
      element.setAttribute('aria-label', 'Bölüm ses kaydı');
      return;
    }

    if (!ALLOWED_TEXT_TAGS.has(element.tagName)) {
      unwrapElement(element);
      return;
    }

    if (element.tagName === 'A') {
      const href = element.getAttribute('href') || '';
      let safeHref = '';
      try {
        const url = new URL(href, window.location.origin);
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          safeHref = url.href;
        }
      } catch {
        safeHref = '';
      }

      Array.from(element.attributes).forEach(attribute => {
        element.removeAttribute(attribute.name);
      });

      if (!safeHref) {
        unwrapElement(element);
        return;
      }

      element.setAttribute('href', safeHref);
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer nofollow');
      return;
    }

    Array.from(element.attributes).forEach(attribute => {
      element.removeAttribute(attribute.name);
    });
  });

  return template.innerHTML
    .replace(/<div>/gi, '<br>')
    .replace(/<\/div>/gi, '');
}

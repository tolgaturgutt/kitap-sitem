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
      const width = Number.parseInt(element.getAttribute('width') || '', 10);
      const height = Number.parseInt(element.getAttribute('height') || '', 10);
      Array.from(element.attributes).forEach(attribute => {
        element.removeAttribute(attribute.name);
      });
      element.setAttribute('src', src);
      element.setAttribute('alt', alt);
      element.setAttribute('data-chapter-image', 'true');
      element.setAttribute('loading', 'lazy');
      if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
        element.setAttribute('width', `${width}`);
        element.setAttribute('height', `${height}`);
      }
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

export function splitChapterParagraphs(content) {
  if (!content) return [];

  const hasHTML = /<br|<p|<\/p/i.test(content);

  if (hasHTML) {
    return content
      .split(/<br\s*\/?>|<\/p>/i)
      .map(paragraph => {
        let cleaned = paragraph.replace(/<p[^>]*>/gi, '').trim();
        cleaned = cleaned.replace(/\s*style=""\s*/gi, '');
        return sanitizeChapterHtml(cleaned);
      })
      .filter(paragraph => (
        paragraph !== ''
        && paragraph !== '<br>'
        && paragraph !== '<br/>'
      ));
  }

  return content
    .split(/\n\n+/)
    .map(paragraph => sanitizeChapterHtml(paragraph.trim()))
    .filter(Boolean);
}

export function createParagraphKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
}

export function normalizeParagraphKeys(paragraphKeys, paragraphCount) {
  const normalized = Array.isArray(paragraphKeys)
    ? paragraphKeys.slice(0, paragraphCount)
    : [];

  while (normalized.length < paragraphCount) {
    normalized.push(createParagraphKey());
  }

  return normalized;
}

function paragraphText(html) {
  if (typeof document === 'undefined') {
    return `${html || ''}`
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('tr-TR');
  }

  const container = document.createElement('div');
  container.innerHTML = html || '';
  return (container.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('tr-TR');
}

function paragraphSimilarity(left, right) {
  if (left === right) return 1;
  if (!left || !right) return 0;

  const leftWords = new Set(left.split(/\s+/));
  const rightWords = new Set(right.split(/\s+/));
  let intersection = 0;

  leftWords.forEach(word => {
    if (rightWords.has(word)) intersection += 1;
  });

  const union = new Set([...leftWords, ...rightWords]).size;
  return union ? intersection / union : 0;
}

export function reconcileParagraphKeys(
  previousParagraphs,
  previousKeys,
  nextParagraphs
) {
  const oldParagraphs = previousParagraphs || [];
  const oldKeys = normalizeParagraphKeys(previousKeys, oldParagraphs.length);
  const nextKeys = new Array(nextParagraphs.length).fill(null);
  const oldTexts = oldParagraphs.map(paragraphText);
  const nextTexts = nextParagraphs.map(paragraphText);
  const unusedOldIndexes = new Set(oldParagraphs.map((_, index) => index));

  // Önce metni değişmeyen paragrafları yakala. Böylece araya paragraf
  // eklenmesi, silinmesi ve paragrafın taşınması kimliği değiştirmez.
  nextTexts.forEach((text, nextIndex) => {
    let bestOldIndex = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    unusedOldIndexes.forEach(oldIndex => {
      if (oldTexts[oldIndex] !== text) return;
      const distance = Math.abs(oldIndex - nextIndex);
      if (distance < bestDistance) {
        bestOldIndex = oldIndex;
        bestDistance = distance;
      }
    });

    if (bestOldIndex !== null) {
      nextKeys[nextIndex] = oldKeys[bestOldIndex];
      unusedOldIndexes.delete(bestOldIndex);
    }
  });

  // Metni düzenlenen paragrafları kelime benzerliğiyle eşleştir.
  nextTexts.forEach((text, nextIndex) => {
    if (nextKeys[nextIndex]) return;

    let bestOldIndex = null;
    let bestScore = 0;

    unusedOldIndexes.forEach(oldIndex => {
      const similarity = paragraphSimilarity(oldTexts[oldIndex], text);
      const distancePenalty = Math.abs(oldIndex - nextIndex) * 0.01;
      const score = similarity - distancePenalty;

      if (score > bestScore) {
        bestOldIndex = oldIndex;
        bestScore = score;
      }
    });

    if (bestOldIndex !== null && bestScore >= 0.3) {
      nextKeys[nextIndex] = oldKeys[bestOldIndex];
      unusedOldIndexes.delete(bestOldIndex);
    }
  });

  // Sadece metinleri tamamen değişmiş ama paragraf sayısı aynı kalmışsa,
  // kalanları sırasıyla eşleştirmek paragraf kimliğini korur.
  const remainingNextIndexes = nextKeys
    .map((key, index) => key ? null : index)
    .filter(index => index !== null);
  const remainingOldIndexes = [...unusedOldIndexes].sort((a, b) => a - b);

  if (remainingNextIndexes.length === remainingOldIndexes.length) {
    remainingNextIndexes.forEach((nextIndex, position) => {
      nextKeys[nextIndex] = oldKeys[remainingOldIndexes[position]];
    });
  }

  return nextKeys.map(key => key || createParagraphKey());
}

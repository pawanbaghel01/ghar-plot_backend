/**
 * commentHelper.js
 * Utility to extract only the latest / last comment from a composite history note.
 */

export const extractLatestComment = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();

  // 1. Remove all client / category headers at start or throughout lines
  str = str.replace(/^[👤\s]*Client:[^\n]+(?:\r?\n|$)/gim, '');
  str = str.replace(/^[🏷️\s]*Category:[^\n]+(?:\r?\n|$)/gim, '');
  str = str.replace(/^[📝\s]*Note:[^\n]+(?:\r?\n|$)/gim, '');

  // 2. Split by update/add markers like "[Update ...]:" or "[Added ...]:" or "📝 [Added ...]:"
  const markerRegex = /(?:^|\n)\s*(?:📝\s*)?\[(?:Update|Added)[^\]]*\]:?\s*/gi;
  const matches = [...str.matchAll(markerRegex)];

  if (matches.length > 0) {
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      let candidate = str.slice(match.index + match[0].length).trim();

      // Clean candidate of any subsequent markers or headers
      candidate = candidate.replace(/^[👤\s]*Client:[^\n]+(?:\r?\n|$)/gim, '');
      candidate = candidate.replace(/^[🏷️\s]*Category:[^\n]+(?:\r?\n|$)/gim, '');
      candidate = candidate.replace(/^[📝\s]*Note:[^\n]+(?:\r?\n|$)/gim, '');
      candidate = candidate.replace(/^(?:📝\s*)?\[(?:Update|Added)[^\]]*\]:?\s*/gim, '');
      candidate = candidate.replace(/^📝\s*/gim, '').trim();

      if (candidate.length > 0) {
        str = candidate;
        break;
      }
    }
  }

  // If there are still nested [Update ...] or [Added ...] markers inside str, recursively clean
  if (/(?:📝\s*)?\[(?:Update|Added)[^\]]*\]:?/i.test(str)) {
    return extractLatestComment(str);
  }

  // Clean leading emojis or prefixes
  str = str.replace(/^[👤\s]*Client:[^\n]+(?:\r?\n|$)/gim, '');
  str = str.replace(/^[🏷️\s]*Category:[^\n]+(?:\r?\n|$)/gim, '');
  str = str.replace(/^📝\s*/gim, '');

  // If there are double newlines, take the latest paragraph
  const paragraphs = str.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length > 1) {
    return paragraphs[paragraphs.length - 1].trim();
  }

  return str.trim();
};

export default {
  extractLatestComment,
};


/**
 * commentHelper.js
 * Utility to extract and clean comments from composite history notes.
 */

/**
 * Strips notification suffix (e.g. "⏰ Scheduled: ... 🔁 Next: ... ⏳ In ...")
 * while preserving the complete user message and all paragraphs.
 */
export const cleanNotificationSuffix = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();

  // Strip client / category headers if prepended to body
  str = str.replace(/^[👤\s]*Client:[^\n]+(?:\r?\n|$)/gim, '');
  str = str.replace(/^[🏷️\s]*Category:[^\n]+(?:\r?\n|$)/gim, '');

  // Strip inline or trailing FCM trailer
  str = str.replace(/\s*⏰\s*Scheduled:[^\n]*(?:\s*🔁\s*Next:[^\n]*)?(?:\s*⏳\s*In[^\n]*)?/gi, '');
  str = str.replace(/\s*🔁\s*Next:[^\n]*(?:\s*⏳\s*In[^\n]*)?/gi, '');
  str = str.replace(/\s*⏳\s*In\s+[^\n]*/gi, '');

  return str.trim();
};

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

  // Strip notification suffix if attached
  return cleanNotificationSuffix(str);
};

export default {
  extractLatestComment,
  cleanNotificationSuffix,
};


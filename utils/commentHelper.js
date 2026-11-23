/**
 * commentHelper.js
 * Utility to extract, parse, format, and clean comments from composite history notes.
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

/**
 * Formats a Date object or timestamp into DD-MM-YYYY HH:mm string
 */
export const formatCommentDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

/**
 * Safely parses date strings including DD-MM-YYYY and DD-MM-YYYY HH:mm
 */
export const parseCustomDateStr = (dateStr, fallbackDate = new Date()) => {
  if (!dateStr) return fallbackDate;
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmyMatch) {
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = dmyMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const standardParsed = new Date(str);
  return isNaN(standardParsed.getTime()) ? fallbackDate : standardParsed;
};

/**
 * Builds a threaded string with separator lines from an array of comment objects
 * e.g.
 * yyy
 * by: employee (pawan) date: 23-11-2026 12:30
 * --------------------------------------
 * Ttt
 * by: admin (pawan) date: 23-11-2026 12:39
 */
export const buildCommentThread = (commentHistory = []) => {
  if (!Array.isArray(commentHistory) || commentHistory.length === 0) return '';
  return commentHistory
    .filter(item => item && (item.text || '').trim())
    .map((item) => {
      const text = (item.text || '').trim();
      const role = (item.authorRole || 'employee').toLowerCase();
      const rawName = (item.authorName || '').trim();
      const name = rawName || (role === 'admin' ? 'Admin' : 'Employee');
      const dateStr = formatCommentDate(item.createdAt || new Date());
      const roleStr = role === 'admin' ? `admin (${name})` : `employee (${name})`;
      return `${text}\nby: ${roleStr} date: ${dateStr}`;
    })
    .join('\n--------------------------------------\n');
};

/**
 * Parses a threaded string or raw reason text into structured comment items
 */
export const parseCommentThread = (raw, defaultAuthor = 'Employee', defaultRole = 'employee', defaultDate = new Date()) => {
  if (!raw || typeof raw !== 'string') return [];
  const parts = raw.split(/(?:\r?\n)?-{3,}(?:\r?\n)?/).map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];

  return parts.map((part) => {
    const match = part.match(/^([\s\S]*?)(?:\r?\n)?by:\s*([^(:\n]+?)(?:\s*\(([^)]+)\))?\s*(?:date\s*:?\s*([^\n\r]+))?$/i);
    if (match) {
      const text = match[1].trim();
      const roleRaw = (match[2] || '').trim().toLowerCase();
      const role = roleRaw.includes('admin') ? 'admin' : 'employee';
      const name = (match[3] || match[2] || defaultAuthor).trim();
      const dateStr = (match[4] || '').trim();
      return {
        text,
        authorRole: role,
        authorName: name,
        createdAt: parseCustomDateStr(dateStr, defaultDate),
      };
    }
    return {
      text: part,
      authorRole: defaultRole,
      authorName: defaultAuthor,
      createdAt: defaultDate,
    };
  });
};

export const extractLatestComment = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();

  // If threaded by separator lines like "--------------------------------------"
  if (str.includes('---')) {
    const parts = str.split(/(?:\r?\n)?-{3,}(?:\r?\n)?/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      str = parts[parts.length - 1];
    }
  }

  // Strip by: role (name) date: ...
  str = str.replace(/(?:\r?\n)?by:\s*[^\n]+(?:\r?\n|$)/gim, '');

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
  formatCommentDate,
  buildCommentThread,
  parseCommentThread,
};

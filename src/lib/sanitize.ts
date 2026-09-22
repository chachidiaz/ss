/**
 * Cleanup for HTML that came out of a sent email.
 *
 * Two jobs, kept separate on purpose:
 *   - `sanitizeEmailHtml` runs once at ingest and is what we store on disk.
 *     It removes things that should never be in a public archive: scripts,
 *     inline event handlers, open-tracking pixels, and the subscriber-specific
 *     unsubscribe links (a reader clicking those would unsubscribe the archive
 *     mailbox, not themselves).
 *   - `prepareForFrame` runs at render and injects what the <iframe> needs.
 *     The stored file stays a faithful copy of the email.
 */

const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const BARE_SCRIPT = /<\/?script\b[^>]*>/gi;
const EVENT_HANDLER = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL = /\s(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi;
const IMG_TAG = /<img\b[^>]*>/gi;
const ANCHOR_TAG = /<a\b[^>]*>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;

/** Links that are personal to whichever mailbox received the archive copy. */
const SUBSCRIBER_LINK = /unsubscribe|\/preferences|manage[-_]?subscription|email[-_]?preferences/i;

/** A 1x1 image is an open-tracking beacon, not content. */
function isTrackingPixel(tag: string): boolean {
  if (/\b(width|height)\s*=\s*["']?(0|1)["']?/i.test(tag)) return true;
  if (/style\s*=\s*["'][^"']*\b(width|height)\s*:\s*(0|1)(px)?\b/i.test(tag)) return true;
  return /\/(open|track|beacon|pixel)\b/i.test(tag) && /\.(gif|png)\b/i.test(tag);
}

export function sanitizeEmailHtml(html: string): string {
  let out = html
    .replace(SCRIPT_BLOCK, '')
    .replace(BARE_SCRIPT, '')
    .replace(EVENT_HANDLER, '')
    .replace(JS_URL, '');

  out = out.replace(IMG_TAG, (tag) => (isTrackingPixel(tag) ? '' : tag));

  // Turn unsubscribe/preferences anchors into inert text, leaving the visible
  // label in place so the email still looks like the one that was sent.
  out = out.replace(ANCHOR_TAG, (tag) => {
    const href = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    const url = href?.[1] ?? href?.[2] ?? '';
    return SUBSCRIBER_LINK.test(url) ? '<span data-archive-stripped="link">' : tag;
  });
  // Close the spans we just opened: any </a> that no longer has an <a> is fine
  // to leave, so instead we only rewrite when we actually opened a span.
  out = balanceStrippedLinks(out);

  return out.trim();
}

/**
 * `sanitizeEmailHtml` replaces some `<a>` opens with `<span>` opens; their
 * matching `</a>` has to become `</span>` or the markup nests wrongly. Walk the
 * anchor tags in order and rewrite the closer that pairs with each stripped one.
 */
function balanceStrippedLinks(html: string): string {
  const tagPattern = /<span data-archive-stripped="link">|<a\b[^>]*>|<\/a\s*>/gi;
  const stack: boolean[] = [];
  return html.replace(tagPattern, (tag) => {
    if (tag.toLowerCase().startsWith('</a')) {
      return stack.pop() === true ? '</span>' : '</a>';
    }
    stack.push(tag.startsWith('<span'));
    return tag;
  });
}

/** Injects the bits the archive page needs, without touching the stored file. */
export function prepareForFrame(html: string): string {
  const injection = [
    '<base target="_blank">',
    '<style>body{margin:0}</style>',
    `<script>${HEIGHT_REPORTER}</script>`,
  ].join('');

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => m + injection);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (m) => m + injection);
  }
  return injection + html;
}

/**
 * Runs inside the sandboxed frame. The frame has `allow-scripts` but not
 * `allow-same-origin`, so it sits in an opaque origin and postMessage is the
 * only way to tell the parent how tall the email is.
 */
const HEIGHT_REPORTER = `
(function(){
  function send(){
    var d=document.documentElement,b=document.body;
    var h=Math.max(d?d.scrollHeight:0,b?b.scrollHeight:0,d?d.offsetHeight:0,b?b.offsetHeight:0);
    parent.postMessage({type:'archive:height',height:h},'*');
  }
  window.addEventListener('load',send);
  window.addEventListener('resize',send);
  if(window.ResizeObserver&&document.body){new ResizeObserver(send).observe(document.body);}
  setTimeout(send,80);setTimeout(send,400);setTimeout(send,1500);
})();
`;

/** The named entities that actually show up in newsletter copy. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  zwnj: '',
  zwj: '',
  shy: '',
  rsquo: '\u2019',
  lsquo: '\u2018',
  rdquo: '\u201d',
  ldquo: '\u201c',
  mdash: '\u2014',
  ndash: '\u2013',
  hellip: '\u2026',
  middot: '\u00b7',
  bull: '\u2022',
  trade: '\u2122',
  copy: '\u00a9',
  reg: '\u00ae',
  deg: '\u00b0',
  eacute: '\u00e9',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]{1,31});/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    const named = NAMED_ENTITIES[entity.toLowerCase()];
    return named === undefined ? match : named;
  });
}

/** Readable plain text, for excerpts and search. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(COMMENT, ' ')
      .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/tr|\/h[1-6]|\/li)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n')
    .trim();
}

/**
 * Flodesk renders preview text in a hidden block at the top of the body. It is
 * already shown as the card subtitle, so pull it out before building an excerpt
 * or the excerpt just repeats it.
 */
export function extractPreheader(html: string): { preheader: string; rest: string } {
  const hidden =
    /<(div|span|td|p)\b[^>]*(?:display\s*:\s*none|mso-hide\s*:\s*all|max-height\s*:\s*0)[^>]*>([\s\S]*?)<\/\1\s*>/i;
  const match = hidden.exec(html);
  if (!match) return { preheader: '', rest: html };

  const text = htmlToText(match[2]).replace(/\s+/g, ' ').trim();
  if (!text || text.length > 300) return { preheader: '', rest: html };

  return { preheader: text, rest: html.slice(0, match.index) + html.slice(match.index + match[0].length) };
}

export function buildExcerpt(html: string, limit = 240): string {
  const { rest } = extractPreheader(html);
  const text = htmlToText(rest).replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : limit).trim()}…`;
}

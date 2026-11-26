import * as cheerio from 'cheerio';

const USER_AGENT =
  'Mozilla/5.0 (compatible; StudioKontenDesaTobadak/1.0; +https://tobadak.desa.id)';

export function isBlockedInternalHost(hostname) {
  const h = (hostname || '').toLowerCase();
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.local') ||
    h.startsWith('10.') ||
    h.startsWith('192.168.') ||
    h.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)
  ) {
    return true;
  }
  return false;
}

function normalizeUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) throw new Error('URL website desa wajib diisi.');
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProto);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Protokol URL harus http atau https.');
  }
  if (isBlockedInternalHost(parsed.hostname)) {
    throw new Error('URL jaringan internal/lokal tidak diizinkan.');
  }
  return parsed.href;
}

function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $.text().replace(/\s+/g, ' ').trim();
}

function extractFirstImageFromHtml(html, baseUrl) {
  if (!html) return '';
  const $ = cheerio.load(html);
  const src =
    $('img').first().attr('data-src') ||
    $('img').first().attr('src') ||
    '';
  if (!src) return '';
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

async function fetchWithTimeout(url, timeoutMs = 10000, accept = '*/*') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: accept,
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function tryWordPressRestApi(origin) {
  const endpoints = [
    `${origin}/wp-json/wp/v2/posts?per_page=10&_embed`,
    `${origin}/index.php/wp-json/wp/v2/posts?per_page=10&_embed`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithTimeout(endpoint, 8000, 'application/json');
      if (!res.ok) continue;
      const posts = await res.json();
      if (!Array.isArray(posts) || posts.length === 0) continue;

      return {
        method: 'WordPress REST API',
        articles: posts.map((post) => {
          const featuredMedia =
            post?._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
          const fallbackImg = extractFirstImageFromHtml(
            post?.content?.rendered,
            origin
          );
          const contentText = stripHtml(post?.content?.rendered || post?.excerpt?.rendered);
          return {
            id: `wp-${post.id}`,
            title: stripHtml(post?.title?.rendered) || 'Tanpa Judul',
            date: post?.date || new Date().toISOString(),
            imageUrl: featuredMedia || fallbackImg || '',
            excerpt: stripHtml(post?.excerpt?.rendered).slice(0, 260),
            content: contentText,
            sourceUrl: post?.link || origin,
          };
        }),
      };
    } catch {
      // Try next endpoint
    }
  }
  return null;
}

async function tryRssFeed(origin, targetUrl) {
  const candidates = [
    `${origin}/feed`,
    `${origin}/rss.xml`,
    `${origin}/feed.xml`,
    `${origin}/rss`,
  ];

  // Also check if targetUrl itself is a feed or has alternate RSS link
  if (/feed|rss|atom|\.xml/i.test(targetUrl)) {
    candidates.unshift(targetUrl);
  }

  for (const feedUrl of candidates) {
    try {
      const res = await fetchWithTimeout(
        feedUrl,
        8000,
        'application/rss+xml, application/xml, text/xml'
      );
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<item')) {
        continue;
      }

      const $ = cheerio.load(xml, { xmlMode: true });
      const items = $('item').length ? $('item') : $('entry');
      if (!items.length) continue;

      const articles = [];
      items.slice(0, 10).each((idx, el) => {
        const $el = $(el);
        const title = $el.find('title').first().text().trim();
        const link =
          $el.find('link').first().text().trim() ||
          $el.find('link').first().attr('href') ||
          origin;
        const date =
          $el.find('pubDate').first().text().trim() ||
          $el.find('published').first().text().trim() ||
          $el.find('updated').first().text().trim() ||
          new Date().toISOString();
        const rawContent =
          $el.find('content\\:encoded').first().text() ||
          $el.find('content').first().text() ||
          $el.find('description').first().text() ||
          $el.find('summary').first().text() ||
          '';

        const enclosureImg =
          $el.find('enclosure[type^="image"]').attr('url') ||
          $el.find('media\\:content, media\\:thumbnail').attr('url') ||
          '';
        const img = enclosureImg || extractFirstImageFromHtml(rawContent, origin);
        const cleanText = stripHtml(rawContent);

        if (title) {
          articles.push({
            id: `rss-${idx}-${Date.now()}`,
            title,
            date,
            imageUrl: img,
            excerpt: cleanText.slice(0, 260),
            content: cleanText,
            sourceUrl: link,
          });
        }
      });

      if (articles.length > 0) {
        return { method: 'RSS / Atom Feed', articles };
      }
    } catch {
      // Continue
    }
  }
  return null;
}

async function tryHtmlScrape(targetUrl, origin) {
  const res = await fetchWithTimeout(targetUrl, 10000, 'text/html');
  if (!res.ok) {
    throw new Error(`Website merespons dengan status ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // Check if page advertises an RSS feed or WP API
  const rssHref = $('link[type="application/rss+xml"]').attr('href');
  if (rssHref) {
    try {
      const resolved = new URL(rssHref, origin).href;
      const rssResult = await tryRssFeed(origin, resolved);
      if (rssResult) return rssResult;
    } catch {
      // Ignore
    }
  }

  // Extract multiple article cards if present
  const articles = [];
  const seenTitles = new Set();

  $('article, .post, .berita-item, .news-item, .card').each((idx, el) => {
    if (articles.length >= 10) return;
    const $el = $(el);
    const title =
      $el.find('h1, h2, h3, .entry-title, .post-title').first().text().trim() ||
      $el.find('a').first().text().trim();
    if (!title || title.length < 10 || seenTitles.has(title)) return;
    seenTitles.add(title);

    const href = $el.find('a').first().attr('href') || targetUrl;
    let sourceUrl = targetUrl;
    try {
      sourceUrl = new URL(href, origin).href;
    } catch {
      sourceUrl = targetUrl;
    }

    const rawImg =
      $el.find('img').first().attr('data-src') ||
      $el.find('img').first().attr('src') ||
      '';
    let imageUrl = '';
    if (rawImg) {
      try {
        imageUrl = new URL(rawImg, origin).href;
      } catch {
        imageUrl = rawImg;
      }
    }

    const date =
      $el.find('time').attr('datetime') ||
      $el.find('time, .date, .post-date').first().text().trim() ||
      new Date().toISOString();

    const paragraphs = $el
      .find('p')
      .map((_, p) => $(p).text().trim())
      .get()
      .filter((t) => t.length > 20)
      .join('\n\n');

    articles.push({
      id: `html-${idx}-${Date.now()}`,
      title,
      date,
      imageUrl,
      excerpt: paragraphs.slice(0, 260) || title,
      content: paragraphs || title,
      sourceUrl,
    });
  });

  if (articles.length > 0) {
    return { method: 'HTML Article Extraction', articles };
  }

  // Single-page OpenGraph / main content fallback
  const ogTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim();
  const ogImage =
    $('meta[property="og:image"]').attr('content') ||
    extractFirstImageFromHtml(html, origin);
  const ogDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time').first().attr('datetime') ||
    new Date().toISOString();
  const mainParagraphs = $('main p, article p, .entry-content p, p')
    .map((_, p) => $(p).text().trim())
    .get()
    .filter((t) => t.length > 35)
    .slice(0, 12)
    .join('\n\n');

  if (ogTitle) {
    return {
      method: 'HTML Single Page / OpenGraph',
      articles: [
        {
          id: `page-${Date.now()}`,
          title: ogTitle,
          date: ogDate,
          imageUrl: ogImage || '',
          excerpt: mainParagraphs.slice(0, 260) || ogTitle,
          content: mainParagraphs || $('meta[name="description"]').attr('content') || ogTitle,
          sourceUrl: targetUrl,
        },
      ],
    };
  }

  throw new Error('Tidak ditemukan artikel pada URL tersebut.');
}

export async function crawlVillageWebsite(rawUrl) {
  const targetUrl = normalizeUrl(rawUrl);
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;

  // 1. WordPress REST API
  const wpResult = await tryWordPressRestApi(origin);
  if (wpResult) return wpResult;

  // 2. RSS / Atom Feed
  const rssResult = await tryRssFeed(origin, targetUrl);
  if (rssResult) return rssResult;

  // 3. HTML Scrape
  return await tryHtmlScrape(targetUrl, origin);
}

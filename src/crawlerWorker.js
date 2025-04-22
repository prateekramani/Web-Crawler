const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const cheerio = require('cheerio');

const DOMAIN_CONFIG = {
  'www.virgio.com': [/\/product/i, /\/item/i],
  'www.tatacliq.com': [/\/p\//i],
  'nykaafashion.com': [/\/product/i],
  'www.westside.com': [/\/product/i],
};

const MAX_DEPTH = 2; // keep it low initially

(async () => {
  const startUrl = workerData.domain;
  const domainHostname = new URL(startUrl).hostname;

  const visited = new Set();
  const productUrls = new Set();

  async function crawl(url, depth = 0) {
    if (depth > MAX_DEPTH) return;
    if (visited.has(url)) return;
    visited.add(url);

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WorkerCrawler/1.0)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(data);

      // Check if this URL matches product URL pattern
      if (isProductUrl(url, domainHostname)) {
        console.log(`--> Found product URL: ${url}`);
        productUrls.add(normalizeUrl(url));
      }

      // Collect links
      const links = [];
      $('a').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absUrl = new URL(href, url).toString();
            if (new URL(absUrl).hostname === domainHostname) {
              links.push(absUrl);
            }
          } catch {}
        }
      });

      // Crawl links sequentially (reduce concurrency for stability)
      for (const link of links) {
        await crawl(link, depth + 1);
      }
    } catch (e) {
      // Ignore errors, but can log if needed
      // console.error(`Error crawling ${url}:`, e.message);
    }
  }

  function isProductUrl(url, domain) {
    const patterns = DOMAIN_CONFIG[domain] || [];
    return patterns.some((p) => p.test(url));
  }

  function normalizeUrl(url) {
    try {
      const u = new URL(url);
      u.search = '';
      u.hash = '';
      return u.toString();
    } catch {
      return url;
    }
  }

  await crawl(startUrl);

  parentPort.postMessage({
    domain: domainHostname,
    productUrls: Array.from(productUrls),
  });
})();

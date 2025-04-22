const axios = require('axios');
const cheerio = require('cheerio');

const fs = require('fs').promises;  // Use promises API for async/await file writing

const DOMAIN_CONFIG = {
  'www.virgio.com': { productPatterns: [/\/product/i, /\/item/i] },
  'www.tatacliq.com': { productPatterns: [/\/p\//i] },
  'nykaafashion.com': { productPatterns: [/\/product/i] },
  'www.westside.com': { productPatterns: [/\/product/i] },
};

const DEFAULT_PATTERNS = [
  /\/product/i,
  /\/p\//i,
  /\/item/i,
  /-\d+$/i,
];

const MAX_DEPTH = 3;
const maxRetries = 3
const retryDelayMs = 1000
const visitedUrlsGlobal = new Set();

async function crawlDomain(startUrl) {
  const baseDomain = new URL(startUrl).hostname;
  const productUrls = new Set();
  const visitedUrls = new Set();

  async function crawl(url, depth = 0, maxRetries = 3, retryDelayMs = 1000) {
    if (depth > MAX_DEPTH) return;
    if (visitedUrls.has(url)) return;
    visitedUrls.add(url);
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data } = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ParallelCrawler/1.0)',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 300000,
        });
  
        const $ = cheerio.load(data);
  
        if (isProductUrl(url, baseDomain)) {
          productUrls.add(normalizeUrl(url));
          console.log(`--> Found product URL: ${url}`);
        }
  
        const links = [];
        $('a').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, url).toString();
              if (new URL(absoluteUrl).hostname === baseDomain) {
                links.push(absoluteUrl);
              }
            } catch {
              // ignore invalid URLs
            }
          }
        });
  
        // Crawl links concurrently (or sequentially if you prefer)
        await Promise.all(links.map(link => crawl(link, depth + 1)));
  
        // If successful, exit retry loop
        break;
  
      } catch (error) {
        const isConnReset = error.code === 'ECONNRESET' ||
          (error.message && error.message.includes('read ECONNRESET'));
  
        if (attempt === maxRetries || !isConnReset) {
          console.error(`Failed to fetch ${url}: ${error.message}`);
          break;
        }
  
        console.warn(`Connection reset error on ${url}, retrying attempt ${attempt}/${maxRetries}...`);
        // Exponential backoff delay
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise(res => setTimeout(res, delay));
        // Retry continues in next loop iteration
      }
    }
  }

  await crawl(startUrl);

  return Array.from(productUrls);
}

function isProductUrl(url, domain) {
  const patterns = DOMAIN_CONFIG[domain]?.productPatterns || DEFAULT_PATTERNS;
  return patterns.some(pattern => pattern.test(url));
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

async function main() {
  const domainsToCrawl = [
    'https://www.virgio.com/',
    'https://www.tatacliq.com/',
    // 'https://nykaafashion.com/',
    'https://www.westside.com/'
  ];

  const allResults = {};

  await Promise.all(
    domainsToCrawl.map(async domainUrl => {
      const domainHostname = new URL(domainUrl).hostname;
      try {
        const products = await crawlDomain(domainUrl);
        allResults[domainHostname] = products;
        console.log(`\nCompleted crawling ${domainHostname}, found ${products.length} product URLs.`);
      } catch (e) {
        console.error(`Error crawling ${domainHostname}: ${e.message}`);
        allResults[domainHostname] = [];
      }
    })
  );

  // Write results to JSON file
  try {
    await fs.writeFile('product_urls.json', JSON.stringify(allResults, null, 2), 'utf-8');
    console.log('\nProduct URLs saved to product_urls.json');
  } catch (err) {
    console.error('Error writing file:', err);
  }
}

main();

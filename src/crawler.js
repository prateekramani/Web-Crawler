const { Worker } = require('worker_threads');
const path = require('path');

const domains = [
  'https://www.virgio.com/',
  'https://www.tatacliq.com/',
  'https://nykaafashion.com/',
  'https://www.westside.com/',
];

const maxWorkers = 4;
const results = {};
let currentIndex = 0;
let activeWorkers = 0;

function startWorker(domain) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, 'crawlerWorker.js'), { workerData: { domain } });

    worker.on('message', (msg) => {
      results[msg.domain] = msg.productUrls;
      console.log(`Worker done: ${msg.domain}, found ${msg.productUrls.length} product URLs.`);
    });

    worker.on('error', reject);

    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      else resolve();
    });
  });
}

async function run() {
  const promises = [];

  async function launchNext() {
    if (currentIndex >= domains.length) {
      return;
    }
    const domain = domains[currentIndex++];
    activeWorkers++;

    try {
      await startWorker(domain);
    } catch (err) {
      console.error(`Worker failed for ${domain}:`, err);
    } finally {
      activeWorkers--;
      if (currentIndex < domains.length) {
        await launchNext();
      }
    }
  }

  // Start workers up to maxWorkers limit
  for (let i = 0; i < maxWorkers && i < domains.length; i++) {
    promises.push(launchNext());
  }

  await Promise.all(promises);

  console.log('\nAll domains crawled. Results:');
  console.dir(results, { depth: null, maxArrayLength: null });
}

run();

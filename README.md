Overview
This script is a Node.js-based web crawler that:

Crawls specified e-commerce domains up to a defined depth.

Finds product page URLs based on domain-specific patterns.

Retries fetches on network errors (e.g., connection resets).

Outputs the discovered product URLs per domain in a JSON file.

Prerequisites
Node.js Version

You must use Node.js v18.13.0 for compatibility.

Install Required Packages

Run the following command in your project directory to install all dependencies:

bash
npm install
The code depends on:

axios

cheerio

File Placement

Place the script in your project directory.

The script writes results to product_urls.json in the same directory.

Usage
Edit the Domains to Crawl

Update the domainsToCrawl array in the main() function with the domains you want to crawl.

Run the Script

Execute the crawler using:

bash
node src/crawler2.js
Example output will show progress for each domain and a message on completion.

Check Results

The results will be saved in the file: product_urls.json.

This JSON contains the discovered product URLs organized by domain.

Key Features
Domain-specific product detection:
The DOMAIN_CONFIG object contains patterns to accurately detect product links for each supported domain.

Crawl depth control:
The constant MAX_DEPTH limits how deep the crawler explores links from the start page.

Retry on network errors:
The crawler retries up to 3 times with exponential backoff when a connection reset occurs.

Flexible and extendable:
You can add more domains and adjust crawl parameters as needed.


Node Version Error:
If the script fails due to deprecated or missing features, check that you are using Node.js v18.13.0.

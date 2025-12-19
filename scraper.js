const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
  headless: "new",
  args: ['--no-sandbox', '--disable-setuid-sandbox'] // <--- Add this line
});
  const page = await browser.newPage();

  // Use the Summary View URL you provided
  const url = 'https://en.lottolyzer.com/history/hong-kong/mark-six/page/1/per-page/50/summary-view';
  console.log(`Navigating to ${url}...`);
  
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  const results = await page.evaluate(() => {
    // Select all rows in the main table
    // The table usually has a specific ID or class, but generic 'tr' works if we filter
    const rows = Array.from(document.querySelectorAll('table tbody tr'));

    return rows.map(row => {
      const cells = row.querySelectorAll('td');
      
      // Need at least 4 columns: Draw | Date | Winning No | Extra
      if (cells.length < 4) return null;

      // 1. Draw ID (Col 0) -> "25/122"
      const rawId = cells[0].innerText.trim();
      // Clean: just get "122"
      const id = rawId.includes('/') ? rawId.split('/')[1] : rawId;

      // 2. Date (Col 1) -> "2025-11-16"
      const date = cells[1].innerText.trim();

      // 3. Winning Numbers (Col 2) -> "2,11,13,28,38,47"
      const mainText = cells[2].innerText.trim();
      const main = mainText.split(',')
                           .map(n => parseInt(n.trim()))
                           .filter(n => !isNaN(n));

      // 4. Extra/Special Number (Col 3) -> "7"
      const specialText = cells[3].innerText.trim();
      const special = parseInt(specialText);

      // Validate
      if (!id || !date || main.length !== 6 || isNaN(special)) return null;

      return {
        id,
        date,
        main,
        special
      };
    }).filter(r => r !== null);
  });

  // Save top 20 draws (most recent first)
  if (results.length > 0) {
    const finalData = results.slice(0, 20);
    fs.writeFileSync('data.json', JSON.stringify(finalData, null, 2));
    console.log(`Success! Scraped ${results.length} draws. Saved top 20 to data.json.`);
    console.log(`Sample: Draw ${finalData[0].id} - ${finalData[0].date}`);
  } else {
    console.error("Scraped 0 results. Check selector logic.");
  }

  await browser.close();
})();


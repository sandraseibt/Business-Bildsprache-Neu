require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { chromium } = require('playwright');
const { buildPrompt } = require('./prompt');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 16 },
});

app.use(express.static(path.join(__dirname, 'public')));

function imageBlock(buffer, mimetype) {
  const mediaType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimetype)
    ? mimetype
    : 'image/jpeg';
  return {
    type: 'image',
    source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') },
  };
}

async function screenshotWebsite(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    const aboveFold = await page.screenshot({ type: 'jpeg', quality: 80 });
    const fullPage = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: true }).catch(() => null);
    const text = await page.evaluate(() => document.body.innerText).catch(() => '');
    return { aboveFold, fullPage, text: (text || '').slice(0, 8000) };
  } finally {
    await browser.close();
  }
}

function normalizeUrl(url) {
  if (!/^https?:\/\//i.test(url)) return `https://${url}`;
  return url;
}

app.post(
  '/api/analyze',
  upload.fields([
    { name: 'instagram', maxCount: 8 },
    { name: 'linkedin', maxCount: 8 },
  ]),
  async (req, res) => {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({
          error: 'ANTHROPIC_API_KEY ist nicht gesetzt. Bitte .env-Datei anlegen (siehe .env.example).',
        });
      }

      const websiteUrlRaw = (req.body.websiteUrl || '').trim();
      const branche = (req.body.branche || '').trim();
      if (!websiteUrlRaw) {
        return res.status(400).json({ error: 'Website-URL fehlt.' });
      }
      const websiteUrl = normalizeUrl(websiteUrlRaw);

      const instaFiles = (req.files && req.files.instagram) || [];
      const linkedinFiles = (req.files && req.files.linkedin) || [];

      let shots;
      try {
        shots = await screenshotWebsite(websiteUrl);
      } catch (err) {
        return res.status(502).json({ error: `Website konnte nicht geladen werden: ${err.message}` });
      }

      const content = [];
      content.push({
        type: 'text',
        text: buildPrompt({
          branche,
          websiteUrl,
          hasInstagram: instaFiles.length > 0,
          hasLinkedin: linkedinFiles.length > 0,
        }),
      });

      content.push({ type: 'text', text: `\n\n--- WEBSITE (${websiteUrl}) ---\nSichtbarer Text (Auszug):\n${shots.text}` });
      content.push({ type: 'text', text: '\nScreenshot – sichtbarer Bereich beim ersten Laden (Above the Fold):' });
      content.push(imageBlock(shots.aboveFold, 'image/jpeg'));
      if (shots.fullPage) {
        content.push({ type: 'text', text: '\nScreenshot – gesamte Seite (gescrollt):' });
        content.push(imageBlock(shots.fullPage, 'image/jpeg'));
      }

      if (instaFiles.length) {
        content.push({ type: 'text', text: '\n\n--- INSTAGRAM-PROFIL (Screenshots) ---' });
        instaFiles.forEach((f) => content.push(imageBlock(f.buffer, f.mimetype)));
      }
      if (linkedinFiles.length) {
        content.push({ type: 'text', text: '\n\n--- LINKEDIN-PROFIL (Screenshots) ---' });
        linkedinFiles.forEach((f) => content.push(imageBlock(f.buffer, f.mimetype)));
      }

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      });

      const analysis = message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      res.json({ analysis });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Unbekannter Fehler.' });
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Analyse-Tool läuft auf http://localhost:${PORT}`);
});

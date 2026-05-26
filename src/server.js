const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── Helper: extract video id ───────────────────────────────────────────────
function extractVideoId(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const shorts = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (shorts) return shorts[1];
    }
  } catch {}
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ─── Helper: http GET with redirects ────────────────────────────────────────
function httpGet(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000, ...opts }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpGet(res.headers.location, opts));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Route: GET video info ───────────────────────────────────────────────────
app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL obrigatória' });

  const id = extractVideoId(url);
  if (!id) return res.status(400).json({ error: 'Link do YouTube inválido' });

  try {
    // Use noembed for metadata (no API key needed)
    const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`;
    const result = await httpGet(noembedUrl);
    const data = JSON.parse(result.data);

    if (!data.title) return res.status(404).json({ error: 'Vídeo não encontrado ou privado' });

    return res.json({
      id,
      title: data.title,
      author: data.author_name || 'Desconhecido',
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      thumbnailHq: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao buscar informações do vídeo' });
  }
});

// ─── Route: GET download link via cobalt.tools ──────────────────────────────
app.post('/api/download', async (req, res) => {
  const { url, quality } = req.body;
  if (!url) return res.status(400).json({ error: 'URL obrigatória' });

  const id = extractVideoId(url);
  if (!id) return res.status(400).json({ error: 'Link do YouTube inválido' });

  const q = quality === '720' ? '720' : '1080';

  // Try cobalt.tools API
  try {
    const cobaltRes = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        url: `https://www.youtube.com/watch?v=${id}`,
        videoQuality: q,
        filenameStyle: 'pretty',
        downloadMode: 'auto',
      });

      const options = {
        hostname: 'api.cobalt.tools',
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 20000,
      };

      const req2 = https.request(options, (r) => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => resolve({ status: r.statusCode, data }));
      });
      req2.on('error', reject);
      req2.on('timeout', () => { req2.destroy(); reject(new Error('Timeout')); });
      req2.write(body);
      req2.end();
    });

    const parsed = JSON.parse(cobaltRes.data);

    if (parsed.url) {
      return res.json({ downloadUrl: parsed.url, quality: q, source: 'cobalt' });
    }
    if (parsed.status === 'stream' && parsed.url) {
      return res.json({ downloadUrl: parsed.url, quality: q, source: 'cobalt' });
    }
    if (parsed.status === 'redirect' && parsed.url) {
      return res.json({ downloadUrl: parsed.url, quality: q, source: 'cobalt' });
    }
    if (parsed.status === 'picker' && parsed.picker) {
      // pick the first video option
      const video = parsed.picker.find(p => p.type === 'video') || parsed.picker[0];
      if (video && video.url) {
        return res.json({ downloadUrl: video.url, quality: q, source: 'cobalt' });
      }
    }
  } catch (_) {}

  // Fallback: return y2mate redirect info
  return res.json({
    fallback: true,
    fallbackUrl: `https://www.y2mate.com/youtube/${id}`,
    quality: q,
    message: `Abra o link para baixar em ${q}p MP4`,
  });
});

// ─── Route: proxy download stream (for direct download on mobile) ─────────
app.get('/api/stream', async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send('URL obrigatória');

  try {
    const decodedUrl = decodeURIComponent(url);
    const lib = decodedUrl.startsWith('https') ? https : http;

    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);
    res.setHeader('Content-Type', 'video/mp4');

    const proxyReq = lib.get(decodedUrl, { timeout: 30000 }, (proxyRes) => {
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      proxyRes.pipe(res);
    });
    proxyReq.on('error', () => res.status(500).send('Erro no proxy'));
  } catch (e) {
    res.status(500).send('Erro interno');
  }
});

// ─── Catch-all → index.html ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`OR's Studio rodando na porta ${PORT}`);
});

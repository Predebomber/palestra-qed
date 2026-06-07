// ============================================================
//  PALESTRA DI VENDITA QED — Server
//  Avvio: node server.js
//  Poi apri il browser su: http://localhost:3000
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const crypto  = require('crypto');
const https   = require('https');

const app  = express();
const PORT = 3000;

// ── Configurazione ───────────────────────────────────────────
// Inserisci qui la tua API key Anthropic
// Ottienila su: https://console.anthropic.com
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
// Password di accesso alla palestra (cambia pure)
const PASSWORD = 'QED2025';
// ─────────────────────────────────────────────────────────────

app.use(cors({ origin: `http://localhost:${PORT}` }));
app.use(express.json());
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    // Token di sessione semplice (valido per la sessione corrente)
    const token = crypto.randomBytes(32).toString('hex');
    sessions.add(token);
    res.json({ ok: true, token });
  } else {
    res.status(401).json({ ok: false, message: 'Codice non valido' });
  }
});

// Set di token di sessione in memoria
const sessions = new Set();

// Middleware autenticazione
function auth(req, res, next) {
  const token = req.headers['x-session-token'];
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  next();
}

// Proxy verso API Anthropic
app.post('/api/chat', auth, (req, res) => {
  const body = JSON.stringify({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system:     req.body.system,
    messages:   req.body.messages
  });

  const options = {
    hostname: 'api.anthropic.com',
    path:     '/v1/messages',
    method:   'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Length':    Buffer.byteLength(body)
    }
  };

  const apiReq = https.request(options, (apiRes) => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      res.status(apiRes.statusCode).set('Content-Type', 'application/json').send(data);
    });
  });

  apiReq.on('error', (err) => {
    console.error('Errore API:', err.message);
    res.status(500).json({ error: 'Errore di connessione all\'API' });
  });

  apiReq.write(body);
  apiReq.end();
});

// Logout
app.post('/api/logout', auth, (req, res) => {
  sessions.delete(req.headers['x-session-token']);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   PALESTRA DI VENDITA QED            ║');
  console.log('  ║   Sales Fitness — Luigi Predebon     ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log(`  Server attivo su: http://localhost:${PORT}`);
  console.log('  Apri questa URL nel tuo browser.');
  console.log('');
  console.log('  Per fermare il server: premi Ctrl+C');
  console.log('');
});

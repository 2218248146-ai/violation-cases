const OWNER = '2218248146-ai';
const REPO  = 'violation-cases';
const FILE  = 'cases.json';
const PWD_HASH = '9e3dcd1c6f0b3658235cb57e5f5326af8241939764ca8414cee9da15da9726cb';

async function sha256hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const GH_TOKEN = process.env.GH_TOKEN;
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
  const headers = { Authorization: `token ${GH_TOKEN}`, 'User-Agent': 'vercel-api' };

  if (req.method === 'GET') {
    const r = await fetch(API, { headers });
    if (!r.ok) return res.status(500).json({ error: 'github fetch failed: ' + r.status });
    const meta = await r.json();
    const data = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf-8'));
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { pwd, data, message } = req.body;
    const hash = await sha256hex(pwd);
    if (hash !== PWD_HASH) return res.status(403).json({ error: '密码错误' });

    const metaRes = await fetch(API, { headers });
    if (!metaRes.ok) return res.status(500).json({ error: '获取SHA失败' });
    const meta = await metaRes.json();

    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const pushRes = await fetch(API, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message || 'update cases', content, sha: meta.sha })
    });
    if (!pushRes.ok) {
      const err = await pushRes.json();
      return res.status(500).json({ error: err.message });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(404).json({ error: 'not found' });
}

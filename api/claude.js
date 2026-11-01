// 3D Visio — passerelle sécurisée vers l'API Claude (Anthropic).
// La clé API reste sur le serveur (variable d'environnement ANTHROPIC_API_KEY), jamais dans le navigateur.
// Variables : ANTHROPIC_API_KEY (obligatoire), ANTHROPIC_MODEL (facultatif), ACCESS_CODE (facultatif : code d'accès demandé aux visiteurs),
//             MAX_REQ_PER_HOUR (facultatif, défaut 40 par adresse IP).

const hits = new Map(); // limite simple par IP (mémoire de l'instance)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ ok: true, protected: !!process.env.ACCESS_CODE, configured: !!process.env.ANTHROPIC_API_KEY });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ code: 'not_configured', error: "La clé ANTHROPIC_API_KEY n'est pas configurée sur le serveur." });

  if (process.env.ACCESS_CODE && req.headers['x-visio-code'] !== process.env.ACCESS_CODE)
    return res.status(401).json({ code: 'bad_code', error: "Code d'accès manquant ou incorrect." });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'inconnu';
  const now = Date.now(), win = 3600e3, max = +process.env.MAX_REQ_PER_HOUR || 40;
  const list = (hits.get(ip) || []).filter(t => now - t < win); list.push(now); hits.set(ip, list);
  if (list.length > max) return res.status(429).json({ code: 'rate_limited', error: 'Trop de demandes. Réessaie plus tard.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON invalide' }); } }
  const { messages, tools, system, tool_choice, max_tokens } = body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages manquants' });
  if (JSON.stringify(body).length > 4_000_000) return res.status(413).json({ error: 'Requête trop lourde (image trop grande ?)' });

  const payload = {
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    max_tokens: Math.min(+max_tokens || 8000, 16000),
    messages
  };
  if (system) payload.system = String(system).slice(0, 60000);
  if (Array.isArray(tools) && tools.length) payload.tools = tools.slice(0, 40);
  if (tool_choice) payload.tool_choice = tool_choice;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ code: 'api_error', error: (j && j.error && j.error.message) || 'Erreur API' });
    return res.status(200).json({ content: j.content, stop_reason: j.stop_reason, usage: j.usage });
  } catch (e) {
    return res.status(502).json({ code: 'network', error: 'Impossible de joindre le service IA.' });
  }
}

export const config = { maxDuration: 60 };

// 3D Visio — client IA : boucle d'outils (tool use) via la passerelle /api/claude
window.VisioAI = (function () {
  const API = '/api/claude';
  const getCode = () => { try { return localStorage.getItem('visio_code') || ''; } catch (e) { return ''; } };
  const setCode = c => { try { localStorage.setItem('visio_code', c); } catch (e) { } };
  async function call(body, retried) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-visio-code': getCode() }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch (e) { }
    if (r.status === 401 && !retried) { const c = window.prompt("Code d'accès 3D Visio :"); if (c) { setCode(c.trim()); return call(body, true); } }
    if (!r.ok) { const err = new Error(j.error || ('Erreur ' + r.status)); err.code = j.code || (r.status === 429 ? 'rate_limited' : 'error'); throw err; }
    return j;
  }
  // Boucle : le modèle appelle des outils exécutés dans la page, jusqu'à la réponse finale.
  async function loop({ system, messages, tools, onText, tool_choice, maxTurns = 8, max_tokens }) {
    const defs = (tools || []).map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema || { type: 'object', properties: {} } }));
    const conv = messages.slice(); let text = '';
    for (let k = 0; k < maxTurns; k++) {
      const j = await call({ system, messages: conv, tools: defs, tool_choice: k === 0 ? tool_choice : undefined, max_tokens });
      conv.push({ role: 'assistant', content: j.content });
      const tx = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
      if (tx) { text = tx; onText && onText({ text }); }
      const uses = (j.content || []).filter(c => c.type === 'tool_use');
      if (!uses.length) break;
      const results = [];
      for (const u of uses) {
        const t = (tools || []).find(x => x.name === u.name); let out;
        try { out = t ? await t.execute(u.input || {}) : 'outil inconnu'; out = typeof out === 'string' ? out : JSON.stringify(out); }
        catch (e) { out = 'Erreur : ' + (e && e.message || e); }
        results.push({ type: 'tool_result', tool_use_id: u.id, content: String(out).slice(0, 4000) });
      }
      conv.push({ role: 'user', content: results });
      if (j.stop_reason !== 'tool_use') break;
    }
    return { text, conv };
  }
  // Compatibilité avec l'interface « sample » de la maquette de l'église
  function sampler(msgs, opts) { return loop({ messages: msgs, tools: (opts || {}).tools, onText: (opts || {}).onText }).then(r => ({ text: r.text || 'Fait.' })); }
  // Image → JPEG base64 redimensionné (pour envoyer une photo de plan)
  function imageToBase64(file, max = 1568) {
    return new Promise((ok, ko) => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .85).split(',')[1]); URL.revokeObjectURL(img.src); }; img.onerror = ko; img.src = URL.createObjectURL(file); });
  }
  async function status() { try { const r = await fetch(API); return await r.json(); } catch (e) { return { ok: false }; } }
  return { call, loop, sampler, imageToBase64, status, setCode };
})();

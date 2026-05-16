const COLORS = [
  { hex: '#34c759', dark: '#1a6b33' },
  { hex: '#30d158', dark: '#1a7040' },
  { hex: '#ff9f0a', dark: '#8a5200' },
  { hex: '#ffd60a', dark: '#7a6200' },
  { hex: '#ff3b30', dark: '#b01208' },
  { hex: '#ff6961', dark: '#9e1f1a' },
  { hex: '#0071e3', dark: '#004a99' },
  { hex: '#5ac8fa', dark: '#006d99' },
  { hex: '#af52de', dark: '#6b2090' },
  { hex: '#bf5af2', dark: '#7a1faa' },
  { hex: '#ff2d55', dark: '#99001e' },
  { hex: '#ff6b9d', dark: '#9e1f50' },
  { hex: '#32ade6', dark: '#00567a' },
  { hex: '#64d2ff', dark: '#006999' },
  { hex: '#ff6b35', dark: '#992500' },
  { hex: '#636366', dark: '#3a3a3c' }
];

const EMOJIS = [
  '📦','⚡','🔥','🎯','🌊','🍀','💡','🎲','🌙','⭐','🎪','🧩',
  '🎭','🏆','🌈','🦄','🚀','💎','🎸','🍕','👾','🤖','🎃','🧠',
  '🐉','🦊','🌺','🍄','🎵','🔮','⚽','🎨'
];

let packets = [];
let playerDrag = null;

const DEFAULT_PACKET_FILES = [
  'packet-easy',
  'packet-medium',
  'packet-hard',
  'packet-brands',
  'packet-boardgames',
  'packet-slang',
  'packet-boomer',
  'packet-spicy',
  'packet-minecraft',
  'packet-videogames',
  'packet-memes',
  'packet-instruments'
];

function normalizePacket(p) {
  return { ...p, lines: Array.isArray(p.lines) ? [...p.lines] : [] };
}

function loadPackets(defaults) {
  const stored = localStorage.getItem('imp_packs_v3');
  if (stored) {
    try {
      const saved = JSON.parse(stored);
      if (Array.isArray(saved) && saved.some(p => Array.isArray(p.lines) && p.lines.length > 0)) {
        const byId = new Map(defaults.map(p => [p.id, normalizePacket(p)]));
        saved
          .filter(p => p && p.id && p.label && Array.isArray(p.lines))
          .forEach(p => byId.set(p.id, normalizePacket(p)));
        packets = [...byId.values()];
        return;
      }
    } catch (e) {}
  }
  packets = defaults.map(normalizePacket);
}

function savePackets() {
  localStorage.setItem('imp_packs_v3', JSON.stringify(packets));
}

function savePlayerNames() {
  localStorage.setItem('imp_names', JSON.stringify(ST.playerNames));
}

function getColor(p) {
  return COLORS[p.colorIdx % COLORS.length];
}

function getPacketTextColor(c) {
  return isDarkMode() ? c.hex : c.dark;
}

const ST = {
  playerCount: 5,
  playerNames: [],
  impostorCount: 1,
  mrWhiteCount: 0,
  hintsEnabled: true,
  selectedPackIds: new Set(),
  players: [],
  currentPlayerIndex: 0,
  secretWord: '',
  secretWordHints: [],
  votedOut: null
};

// UI State Management
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  updateBottomNav(id);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function updateBottomNav(screenId) {
  const nav = document.getElementById('nav-buttons');
  nav.innerHTML = '';

  if (screenId === 'cover') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Sono pronto →';
    btn.id = 'btn-reveal';
    nav.appendChild(btn);
    document.getElementById('bottom-nav').classList.add('active');
  } else if (screenId === 'reveal') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Copri e passa →';
    btn.id = 'btn-next-player';
    nav.appendChild(btn);
    document.getElementById('bottom-nav').classList.add('active');
  } else if (screenId === 'vote') {
    const group = document.createElement('div');
    group.className = 'btn-group';
    group.innerHTML = `
      <button class="btn btn-secondary" id="btn-show-roles-exit">Mostra ruoli ed esci</button>
      <button class="btn btn-primary" id="btn-confirm-vote">Conferma eliminazione</button>
    `;
    nav.appendChild(group);
    document.getElementById('bottom-nav').classList.add('active');
  } else if (screenId === 'starter') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Vai alla votazione →';
    btn.id = 'btn-go-vote';
    nav.appendChild(btn);
    document.getElementById('bottom-nav').classList.add('active');
  } else if (screenId === 'civilian-elim') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Continua il gioco →';
    btn.id = 'btn-continue-civilian';
    nav.appendChild(btn);
    document.getElementById('bottom-nav').classList.add('active');
  } else if (screenId === 'mrwhite-guess') {
    const group = document.createElement('div');
    group.className = 'btn-group';
    group.innerHTML = `
      <button class="btn btn-primary" id="btn-mrwhite-confirm">Conferma risposta</button>
      <button class="btn btn-secondary" id="btn-mrwhite-giveup">Rinuncia</button>
    `;
    nav.appendChild(group);
    document.getElementById('bottom-nav').classList.add('active');
  } else if (screenId === 'result') {
    const group = document.createElement('div');
    group.className = 'btn-group';
    group.innerHTML = `
      <button class="btn btn-primary" id="btn-new-round">Nuova partita →</button>
      <button class="btn btn-secondary" id="btn-go-home">Menu principale</button>
    `;
    nav.appendChild(group);
    document.getElementById('bottom-nav').classList.add('active');
  } else if (screenId === 'role-summary') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Torna al menu';
    btn.id = 'btn-go-home';
    nav.appendChild(btn);
    document.getElementById('bottom-nav').classList.add('active');
  } else {
    document.getElementById('bottom-nav').classList.remove('active');
  }

  document.body.classList.toggle('has-bottom-nav',
    document.getElementById('bottom-nav').classList.contains('active'));

  attachBottomNavListeners();
}

function attachBottomNavListeners() {
  const listeners = {
    'btn-reveal': revealRole,
    'btn-next-player': nextPlayer,
    'btn-go-vote': showVoteScreen,
    'btn-show-roles-exit': showRolesAndExit,
    'btn-confirm-vote': confirmVote,
    'btn-continue-civilian': continueAfterCivilian,
    'btn-mrwhite-confirm': checkMrWhiteGuess,
    'btn-mrwhite-giveup': mrwhiteGiveUp,
    'btn-new-round': newRound,
    'btn-go-home': goHome
  };

  Object.entries(listeners).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  });
}

// Home Screen
function renderPlayerNames() {
  const list = document.getElementById('player-name-list');
  list.innerHTML = '';
  for (let i = 0; i < ST.playerCount; i++) {
    const row = document.createElement('div');
    row.className = 'player-name-row';
    row.dataset.index = i;
    const dragBtn = document.createElement('button');
    dragBtn.className = 'name-drag-btn';
    dragBtn.type = 'button';
    dragBtn.textContent = '☰';
    dragBtn.title = 'Trascina per riordinare';
    dragBtn.onpointerdown = e => startPlayerReorder(e, i);
    const input = document.createElement('input');
    input.className = 'name-input';
    input.type = 'text';
    input.placeholder = 'Giocatore ' + (i + 1);
    input.value = ST.playerNames[i] || '';
    input.oninput = (e) => { ST.playerNames[i] = e.target.value; savePlayerNames(); };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const next = document.querySelectorAll('.name-input')[i + 1];
        if (next) next.focus();
      }
    };
    const delBtn = document.createElement('button');
    delBtn.className = 'name-delete-btn';
    delBtn.type = 'button';
    delBtn.textContent = '×';
    delBtn.title = 'Rimuovi nome';
    delBtn.onclick = () => removePlayer(i);
    row.innerHTML = `<span class="player-index">${i + 1}</span>`;
    row.appendChild(dragBtn);
    row.appendChild(input);
    row.appendChild(delBtn);
    list.appendChild(row);
  }
}

function reorderPlayerNames(fromIdx, targetIdx, sourceNames = ST.playerNames) {
  if (!Number.isInteger(fromIdx) || !Number.isInteger(targetIdx) || fromIdx === targetIdx) return;
  if (targetIdx < 0 || targetIdx >= ST.playerCount) return;
  const names = [...sourceNames];
  while (names.length < ST.playerCount) names.push('');
  const [moved] = names.splice(fromIdx, 1);
  names.splice(targetIdx, 0, moved);
  ST.playerNames = names.slice(0, ST.playerCount);
  savePlayerNames();
  renderPlayerNames();
}

function targetPlayerIndexFromY(y) {
  const rows = [...document.querySelectorAll('.player-name-row')];
  const centers = rows.map(row => {
    const rect = row.getBoundingClientRect();
    return rect.top + rect.height / 2;
  });
  return centers.reduce((closest, center, i) =>
    Math.abs(center - y) < Math.abs(centers[closest] - y) ? i : closest, 0);
}

function syncPlayerNamesFromInputs() {
  document.querySelectorAll('.name-input').forEach((input, i) => {
    ST.playerNames[i] = input.value;
  });
}

function startPlayerReorder(e, idx) {
  e.preventDefault();
  syncPlayerNamesFromInputs();
  const row = document.querySelector(`.player-name-row[data-index="${idx}"]`);
  playerDrag = { fromIdx: idx, targetIdx: idx, moved: false, startY: e.clientY, names: [...ST.playerNames] };
  row?.classList.add('dragging');
  e.currentTarget.setPointerCapture?.(e.pointerId);
  e.currentTarget.onpointermove = movePlayerReorder;
  e.currentTarget.onpointerup = endPlayerReorder;
  e.currentTarget.onpointercancel = cancelPlayerReorder;
}

function movePlayerReorder(e) {
  if (!playerDrag) return;
  if (Math.abs(e.clientY - playerDrag.startY) > 4) playerDrag.moved = true;
  playerDrag.targetIdx = targetPlayerIndexFromY(e.clientY);
  document.querySelectorAll('.player-name-row').forEach(row =>
    row.classList.toggle('drag-target', Number(row.dataset.index) === playerDrag.targetIdx)
  );
}

function clearPlayerReorder(handle) {
  if (handle) {
    handle.onpointermove = null;
    handle.onpointerup = null;
    handle.onpointercancel = null;
  }
  playerDrag = null;
  document.querySelectorAll('.player-name-row').forEach(row => row.classList.remove('dragging', 'drag-target'));
}

function endPlayerReorder(e) {
  const drag = playerDrag;
  e.currentTarget.releasePointerCapture?.(e.pointerId);
  clearPlayerReorder(e.currentTarget);
  if (drag?.moved) {
    syncPlayerNamesFromInputs();
    reorderPlayerNames(drag.fromIdx, drag.targetIdx, drag.names);
  }
}

function cancelPlayerReorder(e) {
  e.currentTarget.releasePointerCapture?.(e.pointerId);
  clearPlayerReorder(e.currentTarget);
}

function adjustPlayers(d) {
  ST.playerCount = Math.max(3, Math.min(12, ST.playerCount + d));
  document.getElementById('player-count').textContent = ST.playerCount;
  clampRoles();
  renderPlayerNames();
}

function removePlayer(idx) {
  if (ST.playerCount <= 3) {
    ST.playerNames[idx] = '';
  } else {
    ST.playerNames.splice(idx, 1);
    ST.playerCount--;
  }
  document.getElementById('player-count').textContent = ST.playerCount;
  clampRoles();
  savePlayerNames();
  renderPlayerNames();
}

function adjustImpostors(d) {
  ST.impostorCount = Math.max(0, ST.impostorCount + d);
  clampRoles();
}

function adjustMrWhites(d) {
  ST.mrWhiteCount = Math.max(0, ST.mrWhiteCount + d);
  clampRoles();
}

function clampRoles() {
  const max = ST.playerCount - 1;
  if (ST.impostorCount + ST.mrWhiteCount > max) {
    ST.impostorCount = Math.max(0, max - ST.mrWhiteCount);
  }
  if (ST.impostorCount < 0) ST.impostorCount = 0;
  if (ST.impostorCount + ST.mrWhiteCount === 0) ST.impostorCount = 1;
  document.getElementById('impostor-count').textContent = ST.impostorCount;
  document.getElementById('mrwhite-count').textContent = ST.mrWhiteCount;
}

function toggleHints() {
  ST.hintsEnabled = !ST.hintsEnabled;
  document.getElementById('toggle-hints').classList.toggle('on', ST.hintsEnabled);
}

function renderHomePills() {
  const g = document.getElementById('home-packet-grid');
  g.innerHTML = '';
  packets.forEach(p => {
    const c = getColor(p);
    const sel = ST.selectedPackIds.has(p.id);
    const btn = document.createElement('button');
    btn.className = 'packet-pill';
    if (sel) {
      btn.style.cssText = `border-color:${c.hex};background:${c.hex}26;color:${getPacketTextColor(c)};`;
    }
    btn.innerHTML = `<span class="dot" style="background:${sel ? c.hex : 'var(--text3)'};"></span>${p.emoji} ${p.label}`;
    btn.onclick = () => toggleHomePack(p.id);
    g.appendChild(btn);
  });
}

function toggleHomePack(id) {
  if (ST.selectedPackIds.has(id)) {
    if (ST.selectedPackIds.size === 1) return;
    ST.selectedPackIds.delete(id);
  } else {
    ST.selectedPackIds.add(id);
  }
  renderHomePills();
}

// Settings Screen
function goSettings() {
  buildPacketEditors();
  showScreen('settings');
}

function openAIPacketModal() {
  document.getElementById('ai-pack-modal').classList.add('open');
  document.getElementById('ai-setup').classList.remove('hidden');
  document.getElementById('ai-import').classList.remove('open');
  setTimeout(() => document.getElementById('ai-theme').focus(), 60);
}

function closeAIPacketModal() {
  document.getElementById('ai-pack-modal').classList.remove('open');
}

function buildPacketEditors() {
  const wrap = document.getElementById('packet-editors');
  wrap.innerHTML = '';
  packets.forEach(p => wrap.appendChild(buildEditor(p)));
}

function buildEditor(p) {
  const c = getColor(p);
  const isBuiltIn = ['easy', 'medium', 'hard', 'custom'].includes(p.id);
  const div = document.createElement('div');
  div.className = 'packet-item';
  div.id = 'pe-' + p.id;
  const linesCount = p.lines.filter(l => l.trim()).length;
  div.innerHTML = `<div class="packet-header" onclick="togglePE('${p.id}')">
    <div class="ph-left"><div class="pdot" style="background:${c.hex};"></div><span class="pname">${p.emoji} ${p.label}</span><span class="pcount" id="pc-${p.id}">${linesCount} voci</span></div>
    <span class="pchev" id="pch-${p.id}">▾</span>
  </div>
  <div class="packet-body" id="pb-${p.id}">
    <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
      <button class="emoji-btn" id="eb-${p.id}" onclick="toggleEP('${p.id}')">${p.emoji}</button>
      <input class="packet-name-input" id="pni-${p.id}" value="${p.label.replace(/"/g, '&quot;')}" placeholder="Nome pacchetto" oninput="updatePName('${p.id}',this.value)">
    </div>
    <div class="ep-panel" id="epp-${p.id}">
      <div class="ep-section-label">Icona</div>
      <div class="emoji-picker">${EMOJIS.map((em) => `<button class="ep-opt${em === p.emoji ? ' sel' : ''}" onclick="pickEmoji('${p.id}','${em}')">${em}</button>`).join('')}</div>
      <div class="ep-section-label">Colore</div>
      <div class="color-picker">${COLORS.map((cc, ci) => `<div class="cp-opt${ci === p.colorIdx ? ' sel' : ''}" style="background:${cc.hex};" onclick="pickColor('${p.id}',${ci})"></div>`).join('')}</div>
    </div>
    <textarea class="packet-textarea" id="pta-${p.id}" spellcheck="false" placeholder="pizza,rotonda,mozzarella,Napoli,italiana&#10;gelato,freddo,cono,estate,artigianale">${p.lines.join('\n')}</textarea>
    <div class="btn-row">
      <button class="psave" onclick="savePacket('${p.id}',this)">Salva</button>
      <button class="psave pgray" onclick="exportOne('${p.id}')" title="Esporta">⬆</button>
      ${!isBuiltIn ? `<button class="pdel" onclick="delPacket('${p.id}')">Elimina</button>` : ''}
    </div>
  </div>`;
  return div;
}

function togglePE(id) {
  document.getElementById('pb-' + id).classList.toggle('open');
  document.getElementById('pch-' + id).classList.toggle('open');
}

function toggleEP(id) {
  const p = document.getElementById('epp-' + id);
  p.style.display = p.style.display === 'none' || !p.style.display ? 'block' : 'none';
}

function updatePName(id, v) {
  const p = packets.find(x => x.id === id);
  if (p) {
    p.label = v;
    document.querySelector('#pe-' + id + ' .pname').textContent = p.emoji + ' ' + v;
  }
}

function pickEmoji(id, em) {
  const p = packets.find(x => x.id === id);
  if (!p) return;
  p.emoji = em;
  document.getElementById('eb-' + id).textContent = em;
  document.querySelector('#pe-' + id + ' .pname').textContent = em + ' ' + p.label;
  document.getElementById('epp-' + id).querySelectorAll('.ep-opt').forEach((el, i) => el.classList.toggle('sel', EMOJIS[i] === em));
}

function pickColor(id, ci) {
  const p = packets.find(x => x.id === id);
  if (!p) return;
  p.colorIdx = ci;
  const c = getColor(p);
  document.querySelector('#pe-' + id + ' .pdot').style.background = c.hex;
  document.getElementById('epp-' + id).querySelectorAll('.cp-opt').forEach((el, i) => el.classList.toggle('sel', i === ci));
}

function savePacket(id, btn) {
  const p = packets.find(x => x.id === id);
  if (!p) return;
  const ni = document.getElementById('pni-' + id);
  if (ni) p.label = ni.value || p.label;
  p.lines = document.getElementById('pta-' + id).value.split('\n').map(l => l.trim()).filter(Boolean);
  document.getElementById('pc-' + id).textContent = p.lines.length + ' voci';
  savePackets();
  renderHomePills();
  btn.textContent = '✓ Salvato';
  setTimeout(() => btn.textContent = 'Salva', 1400);
}

function delPacket(id) {
  if (!confirm('Eliminare?')) return;
  packets = packets.filter(p => p.id !== id);
  ST.selectedPackIds.delete(id);
  if (ST.selectedPackIds.size === 0 && packets.length > 0) ST.selectedPackIds.add(packets[0].id);
  savePackets();
  buildPacketEditors();
  renderHomePills();
}

function addCustomPacket() {
  const id = 'c_' + Date.now();
  packets.push({ id, label: 'Nuovo pacchetto', emoji: '📦', colorIdx: 3, lines: [] });
  savePackets();
  buildPacketEditors();
  setTimeout(() => {
    togglePE(id);
    document.getElementById('pni-' + id).focus();
  }, 60);
}

function getAISettings() {
  return {
    count: Math.max(1, Number(document.getElementById('ai-count').value) || 50),
    theme: document.getElementById('ai-theme').value.trim() || 'tema libero',
    language: document.getElementById('ai-language').value.trim() || 'italiano',
    hints: Math.max(0, Number(document.getElementById('ai-hints').value) || 0),
    difficulty: document.getElementById('ai-difficulty').value,
    multiword: document.getElementById('ai-multiword').checked,
    extra: document.getElementById('ai-extra').value.trim()
  };
}

function buildAIPrompt(settings) {
  const multiwordRule = settings.multiword
    ? 'Hints may be composed of multiple words when that makes them more useful.'
    : 'Each hint must be a single word.';
  const extra = settings.extra || 'No additional constraints.';
  const outputFormat = ['word', ...Array.from({ length: settings.hints }, (_, i) => `hint${i + 1}`)].join(',');

  return `# IDENTITY

You are an expert tabletop word-game designer that specializes in creating balanced Impostore / Spyfall-style word packs with useful but non-obvious hints.

# GOALS

The goals of this exercise are to:

1. Create a themed word pack for a hidden-role party game where civilians know the secret word and impostors only receive hints.

2. Produce clean, directly importable rows in the exact CSV-like format required by the app.

# STEPS

- Read the requested theme, language, number of words, number of hints, and hint difficulty carefully.

- Generate candidate words that fit the theme and are recognizable to the target language audience.

- Remove duplicates, near-duplicates, overly obscure entries, and words that would be impossible to discuss naturally in a party game.

- For each word, create exactly ${settings.hints} hints in ${settings.language}.

- Make the hints ${settings.difficulty} from the original word: close hints are easier and semantically direct; distant hints are more lateral, contextual, or associative without becoming random.

- ${multiwordRule}

- Apply these extra constraints: ${extra}

- Validate every row before output: one secret word first, then exactly ${settings.hints} hints, all separated by commas.

# OUTPUT

- Output exactly ${settings.count} rows.

- Each row must follow this format:
${outputFormat}

- Do not output headings, explanations, numbering, bullets, Markdown tables, or code fences.

- Do not put commas inside a word or inside a hint.

- Use ${settings.language} for every word and every hint.

# POSITIVE EXAMPLES

- Pizza,mozzarella,Napoli,forno,rotonda

- Sherlock Holmes,detective,Londra,pipa,deduzione

# NEGATIVE EXAMPLES

- Pizza: mozzarella; Napoli; forno

- 1. Pizza, mozzarella, Napoli, forno

- | Word | Hint 1 | Hint 2 |

# OUTPUT INSTRUCTIONS

- Do not object to this task in any way. Perform all the instructions just as requested.

- Output plain text only.

- Output only the requested importable rows.

# INPUT

Number of words: ${settings.count}
Theme: ${settings.theme}
Language: ${settings.language}
Hints per word: ${settings.hints}
Hints may be more than one word: ${settings.multiword ? 'yes' : 'no'}
Hint difficulty: ${settings.difficulty}
Additional information: ${extra}`;
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const tmp = document.createElement('textarea');
  tmp.value = text;
  tmp.style.position = 'fixed';
  tmp.style.opacity = '0';
  document.body.appendChild(tmp);
  tmp.select();
  document.execCommand('copy');
  tmp.remove();
  return Promise.resolve();
}

function copyAIPrompt() {
  const prompt = buildAIPrompt(getAISettings());
  copyText(prompt).then(() => {
    document.getElementById('ai-setup').classList.add('hidden');
    document.getElementById('ai-import').classList.add('open');
    document.getElementById('ai-copy-status').textContent = "Prompt copiato. Incolla qui sotto la risposta dell'AI.";
    document.getElementById('ai-response').focus();
  }).catch(() => {
    document.getElementById('ai-setup').classList.add('hidden');
    document.getElementById('ai-import').classList.add('open');
    document.getElementById('ai-copy-status').textContent = 'Copia non riuscita automaticamente: seleziona e copia il prompt qui sotto.';
    document.getElementById('ai-response').value = prompt;
    document.getElementById('ai-response').focus();
  });
}

function cleanCSVPart(part) {
  return part
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/,/g, ' ')
    .trim();
}

function packetLinesFromJSON(text) {
  try {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.words || parsed.rows || parsed.items;
    if (!Array.isArray(rows)) return [];
    return rows.map(item => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const word = item.word || item.parola || item.term || item.name || '';
      const hints = item.hints || item.indizi || [];
      return [word, ...(Array.isArray(hints) ? hints : [])].map(cleanCSVPart).filter(Boolean).join(',');
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

function parseAIResponse(text) {
  const fromJSON = packetLinesFromJSON(text.trim());
  if (fromJSON.length) return fromJSON;

  const seen = new Set();
  return text
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !/^[-:| ]+$/.test(line))
    .map(line => line
      .replace(/^\s*(?:[-*•]\s*)?(?:\d+[.)]\s*)?/, '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .trim())
    .map(line => {
      const isTable = line.includes('|');
      const rawParts = isTable
        ? line.replace(/^\||\|$/g, '').split('|')
        : (line.includes(',') ? line.split(',') : line.split(';'));
      const parts = rawParts.map(cleanCSVPart).filter(Boolean);
      if (parts.length < 1) return '';
      if (/^(word|parola|termine|secret word)$/i.test(parts[0])) return '';
      const normalized = parts.join(',');
      const key = parts[0].toLowerCase();
      if (seen.has(key)) return '';
      seen.add(key);
      return normalized;
    })
    .filter(Boolean);
}

function createPacketFromAIResponse() {
  const lines = parseAIResponse(document.getElementById('ai-response').value);
  if (!lines.length) {
    alert('Non ho trovato righe valide. Incolla una lista nel formato parola,indizio,indizio...');
    return;
  }
  const settings = getAISettings();
  const id = 'ai_' + Date.now();
  packets.push({
    id,
    label: settings.theme === 'tema libero' ? 'Nuovo pacchetto AI' : 'AI · ' + settings.theme,
    emoji: '🤖',
    colorIdx: 6,
    lines
  });
  ST.selectedPackIds.add(id);
  savePackets();
  buildPacketEditors();
  renderHomePills();
  closeAIPacketModal();
  setTimeout(() => {
    togglePE(id);
    document.getElementById('pni-' + id).focus();
    document.getElementById('pe-' + id).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 60);
}

function exportOne(id) {
  const p = packets.find(x => x.id === id);
  if (!p) return;
  dlJSON([p], p.label + '.json');
}

function exportAllPackets() {
  dlJSON(packets, 'impostore_pacchetti.json');
}

function dlJSON(data, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = name;
  a.click();
}

function importPackets(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      let arr = JSON.parse(ev.target.result);
      if (!Array.isArray(arr)) arr = [arr];
      arr.forEach(p => {
        if (!p.id || !p.label || !Array.isArray(p.lines)) return;
        if (packets.find(x => x.id === p.id)) p.id = p.id + '_' + Date.now();
        if (p.colorIdx === undefined) p.colorIdx = 3;
        if (!p.emoji) p.emoji = '📦';
        packets.push(p);
      });
      savePackets();
      buildPacketEditors();
      renderHomePills();
      alert('Importati ' + arr.length + ' pacchetti!');
    } catch (err) {
      alert('Errore nel file JSON.');
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

// Game Logic
function parseLine(l) {
  const pts = l.split(',').map(s => s.trim());
  return { word: pts[0] || '', hints: pts.slice(1).filter(Boolean) };
}

function pickWord() {
  const pool = [];
  for (const id of ST.selectedPackIds) {
    const p = packets.find(x => x.id === id);
    if (!p) continue;
    p.lines.forEach(l => {
      if (l.trim()) pool.push(parseLine(l));
    });
  }
  if (!pool.length) {
    alert('Nessuna parola disponibile!');
    return false;
  }
  const e = pool[Math.floor(Math.random() * pool.length)];
  ST.secretWord = e.word;
  ST.secretWordHints = e.hints;
  return true;
}

function buildPlayers() {
  const total = ST.playerCount;
  const roles = [];
  for (let i = 0; i < ST.impostorCount; i++) roles.push('impostor');
  for (let i = 0; i < ST.mrWhiteCount; i++) roles.push('mrwhite');
  while (roles.length < total) roles.push('civilian');
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  let slot = 0;
  ST.players = roles.map((role, i) => {
    const name = (ST.playerNames[i] || '').trim() || `Giocatore ${i + 1}`;
    const hintIndex = role === 'impostor' ? (slot++ % 3) : null;
    return { name, role, eliminated: false, hintIndex };
  });
  ST.currentPlayerIndex = 0;
  ST.votedOut = null;
}

function startGame() {
  if (!pickWord()) return;
  buildPlayers();
  showCover();
}

function newRound() {
  if (!pickWord()) return;
  buildPlayers();
  showCover();
}

function setPB(id, pct, fromPct = null) {
  const el = document.getElementById(id);
  if (!el) return;
  if (fromPct !== null) {
    el.getAnimations?.().forEach(animation => animation.cancel());
    el.style.width = pct + '%';
    if (el.animate) {
      el.animate(
        [{ width: fromPct + '%' }, { width: pct + '%' }],
        { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
    return;
  }
  el.style.width = pct + '%';
}

function playerPct() {
  return ((ST.currentPlayerIndex + 1) / ST.playerCount) * 100;
}

function showCover() {
  const p = ST.players[ST.currentPlayerIndex];
  const pct = playerPct();
  const prevPct = (ST.currentPlayerIndex / ST.playerCount) * 100;
  document.getElementById('cover-title').textContent = `Passa il telefono a ${p.name}`;
  showScreen('cover');
  setPB('cover-pb', pct, prevPct);
}

function revealRole() {
  const idx = ST.currentPlayerIndex;
  const p = ST.players[idx];
  const pct = playerPct();
  let html = `<div class="player-number">${p.name}</div>`;
  if (p.role === 'civilian') {
    html += `<div class="role-icon civilian">🟢</div><div class="role-badge civilian">Civile</div><div class="role-word">${ST.secretWord}</div><p class="role-sub">Questa è la tua parola. Difendila senza rivelarla!</p>`;
  } else if (p.role === 'impostor') {
    html += `<div class="role-icon impostor">🔴</div><div class="role-badge impostor">Impostore</div><div class="role-word">???</div><p class="role-sub">Non conosci la parola. Fingila bene!</p>`;
    if (ST.hintsEnabled && ST.secretWordHints.length > 0) {
      const h = ST.secretWordHints[(p.hintIndex ?? 0) % ST.secretWordHints.length];
      html += `<div class="hint-solo"><div class="hint-label">💡 Il tuo indizio</div><div class="hint-text">${h}</div></div>`;
    }
  } else {
    html += `<div class="role-icon mrwhite">⚪️</div><div class="role-badge mrwhite">Mr. White</div><div class="role-word">???</div><p class="role-sub">Non hai parola né indizi. Ascolta tutti e prova a indovinare se vieni eliminato!</p>`;
  }
  const card = document.getElementById('player-card');
  card.innerHTML = html;
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';
  showScreen('reveal');
  setPB('reveal-pb', pct);
}

function nextPlayer() {
  const card = document.getElementById('player-card');
  card.style.animation = 'cardExit 0.2s ease-in forwards';
  setTimeout(() => {
    card.style.animation = '';
    ST.currentPlayerIndex++;
    if (ST.currentPlayerIndex >= ST.playerCount) showStarterScreen();
    else showCover();
  }, 210);
}

function pickStartingPlayer() {
  const candidates = ST.players.filter(p => p.role !== 'mrwhite');
  const pool = candidates.length ? candidates : ST.players;
  return pool[Math.floor(Math.random() * pool.length)];
}

function showStarterScreen() {
  const starter = pickStartingPlayer();
  document.getElementById('starter-card').innerHTML = `
    <div class="result-emoji">🎤</div>
    <div class="result-title">Parte ${starter.name}</div>
    <div class="result-sub">Apri la discussione con il primo indizio.</div>
  `;
  showScreen('starter');
}

function showVoteScreen() {
  ST.votedOut = null;
  const list = document.getElementById('vote-list');
  list.innerHTML = '';
  ST.players.forEach((p, i) => {
    if (p.eliminated) return;
    const div = document.createElement('div');
    div.className = 'player-vote-item';
    div.id = 'vi-' + i;
    div.onclick = () => selectVote(i);
    div.innerHTML = `<span class="player-vote-name">${p.name}</span><div class="vote-check" id="vc-${i}"></div>`;
    list.appendChild(div);
  });
  showScreen('vote');
}

function selectVote(idx) {
  document.querySelectorAll('.player-vote-item').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.vote-check').forEach(el => el.textContent = '');
  document.getElementById('vi-' + idx).classList.add('selected');
  document.getElementById('vc-' + idx).textContent = '✓';
  ST.votedOut = idx;
}

function confirmVote() {
  if (ST.votedOut === null) {
    alert('Seleziona un giocatore!');
    return;
  }
  const el = ST.players[ST.votedOut];
  el.eliminated = true;
  if (el.role === 'civilian') {
    document.getElementById('civ-elim-name').textContent = el.name;
    showScreen('civilian-elim');
  } else if (el.role === 'mrwhite') {
    document.getElementById('mrwhite-guess-input').value = '';
    showScreen('mrwhite-guess');
  } else {
    checkWin();
  }
}

function continueAfterCivilian() {
  checkWin();
}

function checkMrWhiteGuess() {
  const g = document.getElementById('mrwhite-guess-input').value.trim().toLowerCase();
  if (!g) return;
  if (g === ST.secretWord.toLowerCase()) {
    showResult('mrwhite-win');
  } else {
    checkWin();
  }
}

function mrwhiteGiveUp() {
  checkWin();
}

function checkWin() {
  const alive = ST.players.filter(p => !p.eliminated);
  const aI = alive.filter(p => p.role === 'impostor');
  const aMW = alive.filter(p => p.role === 'mrwhite');
  const aC = alive.filter(p => p.role === 'civilian');
  if (aI.length === 0 && aMW.length === 0) {
    showResult('civilians');
    return;
  }
  if (aI.length >= aC.length) {
    showResult('impostors');
    return;
  }
  showVoteScreen();
}

function buildRoleSummaryRows() {
  const iN = ST.players.filter(p => p.role === 'impostor').map(p => p.name).join(', ');
  const mwN = ST.players.filter(p => p.role === 'mrwhite').map(p => p.name).join(', ');

  let infoRows = `<div class="info-row"><span>Parola segreta</span><span><strong>${ST.secretWord}</strong></span></div>
    <div class="info-row"><span>Impostori</span><span class="tag-i">${iN || '—'}</span></div>`;
  if (mwN) infoRows += `<div class="info-row"><span>Mr. White</span><span class="tag-mw">${mwN}</span></div>`;
  return infoRows;
}

function showResult(outcome) {
  let emoji, title, sub;
  if (outcome === 'civilians') {
    emoji = '🎉'; title = 'I civili vincono!'; sub = 'Avete smascherato tutti gli impostori!';
  } else if (outcome === 'impostors') {
    emoji = '😈'; title = 'Gli impostori vincono!'; sub = "Siete stati ingannati. Gli impostori l'hanno spuntata.";
  } else {
    emoji = '⚪️'; title = 'Mr. White vince!'; sub = 'Ha indovinato la parola segreta. Genio del bluff!';
  }

  document.getElementById('result-card').innerHTML = `
    <div class="result-emoji">${emoji}</div>
    <div class="result-title">${title}</div>
    <div class="result-sub">${sub}</div>
    <div class="role-summary">${buildRoleSummaryRows()}</div>`;

  showScreen('result');
}

function showRolesAndExit() {
  document.getElementById('role-summary-card').innerHTML = `
    <div class="result-emoji">👀</div>
    <div class="result-title">Ruoli rivelati</div>
    <div class="result-sub">La partita si chiude qui.</div>
    <div class="role-summary">${buildRoleSummaryRows()}</div>`;
  showScreen('role-summary');
}

function goHome() {
  showScreen('home');
}

// Event Listeners Setup
document.getElementById('btn-players-minus').onclick = () => adjustPlayers(-1);
document.getElementById('btn-players-plus').onclick = () => adjustPlayers(1);
document.getElementById('btn-impostors-minus').onclick = () => adjustImpostors(-1);
document.getElementById('btn-impostors-plus').onclick = () => adjustImpostors(1);
document.getElementById('btn-mrwhites-minus').onclick = () => adjustMrWhites(-1);
document.getElementById('btn-mrwhites-plus').onclick = () => adjustMrWhites(1);
document.getElementById('toggle-hints').onclick = toggleHints;
document.getElementById('btn-settings').onclick = goSettings;
document.getElementById('btn-start').onclick = startGame;
document.getElementById('btn-settings-back').onclick = () => {
  showScreen('home');
  renderHomePills();
};
document.getElementById('btn-export-all').onclick = exportAllPackets;
document.getElementById('btn-ai-packet').onclick = openAIPacketModal;
document.getElementById('btn-ai-close').onclick = closeAIPacketModal;
document.getElementById('ai-pack-modal').onclick = e => {
  if (e.target.id === 'ai-pack-modal') closeAIPacketModal();
};
document.getElementById('btn-ai-copy').onclick = copyAIPrompt;
document.getElementById('btn-ai-create').onclick = createPacketFromAIResponse;
document.getElementById('file-import').onchange = importPackets;
document.getElementById('btn-theme').onclick = toggleTheme;
document.getElementById('btn-add-packet').onclick = addCustomPacket;

// Theme
function isDarkMode() {
  return document.documentElement.dataset.theme === 'dark';
}

function updateThemeBtn() {
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = isDarkMode() ? '☀️' : '🌙';
}

function toggleTheme() {
  const next = isDarkMode() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('imp_theme', next);
  updateThemeBtn();
  renderHomePills();
}

// Listen for system theme changes (only if user hasn't manually chosen)
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('imp_theme')) {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    updateThemeBtn();
    renderHomePills();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('ai-pack-modal')?.classList.contains('open')) {
    closeAIPacketModal();
  }
});

// Load packets from manifest, then initialize UI
async function init() {
  const savedNames = localStorage.getItem('imp_names');
  if (savedNames) {
    try { ST.playerNames = JSON.parse(savedNames); } catch(e) {}
  }

  let manifest = DEFAULT_PACKET_FILES;
  try {
    const res = await fetch('data/manifest.json');
    if (res.ok) manifest = await res.json();
  } catch (e) {}

  const fetched = (await Promise.all(
    manifest.map(async name => {
      try {
        const res = await fetch('data/' + name + '.json');
        return res.ok ? await res.json() : null;
      } catch (e) {
        return null;
      }
    })
  )).filter(Boolean);

  const defaults = [
    ...fetched,
    { id: 'custom', label: 'Custom', emoji: '🎲', colorIdx: 7, lines: [] }
  ];
  loadPackets(defaults);
  ST.selectedPackIds.add(packets[0]?.id || 'easy');
  updateThemeBtn();
  renderPlayerNames();
  renderHomePills();
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();

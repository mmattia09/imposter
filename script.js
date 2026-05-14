const COLORS = [
  { hex: '#34c759', dark: '#1a6b33' },
  { hex: '#ff9f0a', dark: '#8a5200' },
  { hex: '#ff3b30', dark: '#b01208' },
  { hex: '#0071e3', dark: '#004a99' },
  { hex: '#af52de', dark: '#6b2090' },
  { hex: '#ff2d55', dark: '#99001e' },
  { hex: '#5ac8fa', dark: '#006d99' },
  { hex: '#636366', dark: '#3a3a3c' }
];

const EMOJIS = ['📦', '⚡', '🔥', '🎯', '🌊', '🍀', '💡', '🎲', '🌙', '⭐', '🎪', '🧩', '🎭', '🏆', '🌈', '🦄'];

let packets = [];

function loadPackets(defaults) {
  const stored = localStorage.getItem('imp_packs_v3');
  if (stored) {
    try {
      packets = JSON.parse(stored);
      return;
    } catch (e) {}
  }
  packets = defaults.map(p => ({ ...p, lines: [...p.lines] }));
}

function savePackets() {
  localStorage.setItem('imp_packs_v3', JSON.stringify(packets));
}

function getColor(p) {
  return COLORS[p.colorIdx % COLORS.length];
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
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Conferma eliminazione';
    btn.id = 'btn-confirm-vote';
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
    const input = document.createElement('input');
    input.className = 'name-input';
    input.type = 'text';
    input.placeholder = 'Giocatore ' + (i + 1);
    input.value = ST.playerNames[i] || '';
    input.oninput = (e) => { ST.playerNames[i] = e.target.value; };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const next = document.querySelectorAll('.name-input')[i + 1];
        if (next) next.focus();
      }
    };
    row.innerHTML = `<span class="player-index">${i + 1}</span>`;
    row.appendChild(input);
    list.appendChild(row);
  }
}

function adjustPlayers(d) {
  ST.playerCount = Math.max(3, Math.min(12, ST.playerCount + d));
  document.getElementById('player-count').textContent = ST.playerCount;
  clampRoles();
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
      btn.style.cssText = `border-color:${c.hex};background:${c.hex}1a;color:${c.dark};`;
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
      <div class="emoji-picker">${EMOJIS.map((em, ei) => `<button class="ep-opt${em === p.emoji ? ' sel' : ''}" onclick="pickEmoji('${p.id}','${em}')">${em}</button>`).join('')}</div>
      <div class="color-picker">${COLORS.map((cc, ci) => `<div class="cp-opt${ci === p.colorIdx ? ' sel' : ''}" style="background:${cc.hex};" onclick="pickColor('${p.id}',${ci})"></div>`).join('')}</div>
    </div>
    <textarea class="packet-textarea" id="pta-${p.id}" spellcheck="false" placeholder="pizza,rotonda,mozzarella,Napoli&#10;gelato,freddo,cono,estate">${p.lines.join('\n')}</textarea>
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
  return { word: pts[0] || '', hints: pts.slice(1, 4).filter(Boolean) };
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

function setPB(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}

function playerPct() {
  return ((ST.currentPlayerIndex + 1) / ST.playerCount) * 100;
}

function showCover() {
  const p = ST.players[ST.currentPlayerIndex];
  document.getElementById('cover-title').textContent = `Passa il telefono a ${p.name}`;
  setPB('cover-pb', playerPct());
  showScreen('cover');
}

function revealRole() {
  const idx = ST.currentPlayerIndex;
  const p = ST.players[idx];
  setPB('reveal-pb', playerPct());
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
}

function nextPlayer() {
  ST.currentPlayerIndex++;
  if (ST.currentPlayerIndex >= ST.playerCount) showVoteScreen();
  else showCover();
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

function showResult(outcome) {
  let emoji, title, sub;
  if (outcome === 'civilians') {
    emoji = '🎉';
    title = 'I civili vincono!';
    sub = 'Avete smascherato tutti gli impostori!';
  } else if (outcome === 'impostors') {
    emoji = '😈';
    title = 'Gli impostori vincono!';
    sub = "Siete stati ingannati. Gli impostori l'hanno spuntata.";
  } else {
    emoji = '⚪️';
    title = 'Mr. White vince!';
    sub = 'Ha indovinato la parola segreta. Genio del bluff!';
  }
  const iN = ST.players.filter(p => p.role === 'impostor').map(p => p.name).join(', ');
  const mwN = ST.players.filter(p => p.role === 'mrwhite').map(p => p.name).join(', ');
  let rows = `<div class="info-row"><span>Parola segreta</span><span><strong>${ST.secretWord}</strong></span></div><div class="info-row"><span>Impostori</span><span class="tag-i">${iN || '—'}</span></div>`;
  if (mwN) rows += `<div class="info-row"><span>Mr. White</span><span class="tag-mw">${mwN}</span></div>`;
  document.getElementById('result-card').innerHTML = `<div class="result-emoji">${emoji}</div><div class="result-title">${title}</div><div class="result-sub">${sub}</div><div style="margin-top:var(--spacing-sm);">${rows}</div>`;
  showScreen('result');
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
document.getElementById('file-import').onchange = importPackets;
document.getElementById('btn-add-packet').onclick = addCustomPacket;

// Load packets from manifest, then initialize UI
async function init() {
  const manifest = await fetch('data/manifest.json').then(r => r.json());
  const fetched = await Promise.all(
    manifest.map(name => fetch('data/' + name + '.json').then(r => r.json()))
  );
  const defaults = [
    ...fetched,
    { id: 'custom', label: 'Custom', emoji: '🎲', colorIdx: 3, lines: [] }
  ];
  loadPackets(defaults);
  ST.selectedPackIds.add(packets[0]?.id || 'easy');
  renderPlayerNames();
  renderHomePills();
}

init();

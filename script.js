console.log('JS chargé OK');

// CONFIG SÉRIES pour les points
const SERIES = [
  { name: 'Série 1', gongs: 10 },
  { name: 'Série 2', gongs: 10 },
  { name: 'Série 3', gongs: 10 },
  { name: 'Série 4', gongs: 10 }
];

// CONFIG TIMER GLOBAL : Série 0 entraînement 30s, puis 4 séries match 30, 30, 20, 20
const SERIESTIMERCONFIG = [
  { label: 'Série 0 Entraînement', shootTime: 30 },
  { label: 'Série 1', shootTime: 30 },
  { label: 'Série 2', shootTime: 30 },
  { label: 'Série 3', shootTime: 20 },
  { label: 'Série 4', shootTime: 20 }
];

// Génération des phases pour chaque série - prep 60s, ready 7s, fire shootTime
const PHASES = [];
SERIESTIMERCONFIG.forEach((serie, index) => {
  PHASES.push({ type: 'prep', duration: 60, text: `Préparation ${serie.label}`, sound: 'prep', serieIndexForScores: index });
  PHASES.push({ type: 'ready', duration: 7, text: `Mise en place ${serie.label}`, sound: 'ready', serieIndexForScores: index });
  PHASES.push({ type: 'fire', duration: serie.shootTime, text: `Tir ${serie.label}`, sound: 'fire', endSound: 'stop', serieIndexForScores: index });
  // 0 entraînement, 1..4 séries de match
});

// VARIABLES
let tireurs = [];
let currentTireurIndex = null;
let currentSeries = 0; // 0..3 pour les scores uniquement
let timer = 0;
let timerInterval = null;
let currentPhaseIndex = -1; // index dans PHASES

// ELEMENTS DOM
const tireurNameInput = document.getElementById('tireur-name');
const addTireurBtn = document.getElementById('add-tireur-btn');
const tireursUl = document.getElementById('tireurs-ul');
const seriesTabs = document.getElementById('series-tabs');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const timerDisplay = document.getElementById('timer-display');
const timerBar = document.querySelector('.timer-bar');
const timerTireur = document.getElementById('timer-tireur');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const messageDiv = document.getElementById('message');
const historyContainer = document.getElementById('history-container');
const scoreTable = document.getElementById('score-table');
const currentSeriesLabel = document.getElementById('current-series-label');
const modeSelector = document.getElementById('mode-selector');

let currentMode = 'training'; // Par défaut

// AUDIO
const soundPrep = new Audio('prep.mp3');
const soundReady = new Audio('ready.mp3');
const soundFire = new Audio('fire.mp3');
const soundStop = new Audio('stop.mp3');

function playSound(name) {
  const map = {
    'prep': soundPrep,
    'ready': soundReady,
    'fire': soundFire,
    'stop': soundStop
  };
  const s = map[name];
  if (!s) return;
  try {
    s.currentTime = 0;
    s.play();
  } catch {}
}

// GET MODE
function getMode() {
  currentMode = modeSelector ? modeSelector.value : 'training';
  return currentMode;
}

// TIMER GLOBAL PAR PHASES
function startTimer() {
  if (currentTireurIndex === null) {
    showMessage('Sélectionnez un tireur !');
    return;
  }
  if (currentPhaseIndex !== -1 && currentPhaseIndex < PHASES.length) {
    showMessage('Timer déjà en cours');
    return;
  }
  currentPhaseIndex = 0;
  launchCurrentPhase();
}

function launchCurrentPhase() {
  if (currentPhaseIndex >= PHASES.length) {
    showMessage('Séquance terminée pour ce tireur');
    clearInterval(timerInterval);
    currentPhaseIndex = -1;
    updateCurrentSeriesLabel(); // remet le texte prête
    return;
  }

  const phase = PHASES[currentPhaseIndex];
  timer = phase.duration;
  updateTimerDisplay();
  updateTimerBar();
  updatePhaseLabel(phase);

  if (phase.sound) playSound(phase.sound);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer--;
    updateTimerDisplay();
    updateTimerBar();
    if (timer <= 0) {
      clearInterval(timerInterval);
      // son de fin ex STOP
      if (phase.endSound) playSound(phase.endSound);

      // Si c'est la DERNIERE phase de tir de match (Série 4 index 4)
      if (phase.type === 'fire' && phase.serieIndexForScores === 4) {
        saveHistory(); // historique global une seule fois
      }

      // Si c'est une phase de tir, délai de 2s après STOP
      if (phase.type === 'fire') {
        setTimeout(() => { currentPhaseIndex++; launchCurrentPhase(); }, 2000);
      } else {
        // Autres phases enchaînement immédiat
        currentPhaseIndex++;
        launchCurrentPhase();
      }
    }
  }, 1000);
}

// Affichage clair "Entraînement/Série X + phase + temps"
function updatePhaseLabel(phase) {
  if (!currentSeriesLabel) return;
  const idx = phase.serieIndexForScores;
  let serieText;
  if (idx === 0) serieText = 'Entraînement';
  else if (idx >= 1 && idx <= 4) serieText = `Série ${idx}`;
  
  let phaseName;
  if (phase.type === 'prep') phaseName = 'Préparation';
  else if (phase.type === 'ready') phaseName = 'Mise en place';
  else if (phase.type === 'fire') phaseName = 'Tir';
  
  currentSeriesLabel.textContent = serieText ? `${serieText} - ${phaseName}` : `${phaseName} timers`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = `${timer}s`;
}

function updateTimerBar() {
  const phase = PHASES[currentPhaseIndex];
  if (!phase) {
    timerBar.style.width = '0%';
    return;
  }
  const percent = Math.max(0, (timer / phase.duration) * 100);
  timerBar.style.width = `${percent}%`;
}

// Reset complet du timer global
function resetTimerGlobal() {
  clearInterval(timerInterval);
  currentPhaseIndex = -1;
  timer = 0;
  timerDisplay.textContent = '0s';
  timerBar.style.width = '0%';
  if (currentSeriesLabel) currentSeriesLabel.textContent = updateCurrentSeriesLabel();
}

// Info générale uniquement quand aucune phase n'est en cours
function updateCurrentSeriesLabel() {
  if (!currentSeriesLabel) return;
  if (currentTireurIndex === null) {
    currentSeriesLabel.textContent = '';
    return;
  }
  if (currentPhaseIndex === -1) {
    currentSeriesLabel.textContent = `Séquance prête pour le tireur sélectionné`;
  }
}

// MESSAGE TEMPORAIRE
function showMessage(text) {
  messageDiv.textContent = text;
  setTimeout(() => { messageDiv.textContent = ''; }, 2000);
}

// AJOUT TIREURS
function addTireur() {
  const name = tireurNameInput.value.trim();
  if (!name) {
    showMessage('Entrez un nom valide');
    return;
  }
  if (tireurs.some(t => t.name === name)) {
    showMessage('Tireur déjà existant !');
    return;
  }
  tireurs.push({
    name,
    scores: SERIES.map(() => ({ dist50: 0, dist25: 0, total: 0 }))
  });
  currentTireurIndex = tireurs.length - 1;
  renderTireurs();
  renderScoreTable();
  resetTimerGlobal();
  tireurNameInput.value = '';
}

function renderTireurs() {
  tireursUl.innerHTML = '';
  tireurs.forEach((t, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${t.name}</span> <button>Supprimer</button>`;
    li.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      currentTireurIndex = idx;
      renderTireurs();
      resetTimerGlobal();
    });
    li.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      tireurs.splice(idx, 1);
      if (currentTireurIndex >= tireurs.length) {
        currentTireurIndex = tireurs.length - 1;
      }
      renderTireurs();
      renderScoreTable();
      resetTimerGlobal();
    });
    if (idx === currentTireurIndex) li.classList.add('active');
    tireursUl.appendChild(li);
  });
}

// SERIES : On ne montre plus les onglets de séries
function renderTabs() {
  if (seriesTabs) {
    seriesTabs.innerHTML = '';
  }
}

// TABLEAU SCORES - ADAPTATIF AU MODE
function renderScoreTable() {
  const mode = getMode();
  const thead = scoreTable.querySelector('thead tr');

  if (mode === 'competition') {
    // COMPÉTITION : 1 colonne par série, max 10 cibles (100 pts)
    thead.innerHTML = `<th>#</th><th>Tireur</th>` +
      SERIES.map(s => `<th>${s.name}<br><span style="font-size:11px"></span></th>`).join('') +
      `<th>Total</th><th>%</th>`;

    const tbody = scoreTable.querySelector('tbody');
    tbody.innerHTML = '';

    const rows = tireurs.map(t => {
      const serieScores = t.scores.map(s => s.total || 0);
      const total = serieScores.reduce((a, b) => a + b, 0);
      const maxTotal = SERIES.length * 100;
      const perc = maxTotal ? Math.round(total / maxTotal * 100) : 0;
      return { t, serieScores, total, perc };
    });

    rows.sort((a, b) => b.total - a.total);

    rows.forEach(({ t, serieScores, total, perc }, idx) => {
      const tr = document.createElement('tr');
      let html = `<td>${idx + 1}</td><td>${t.name}</td>`;
      t.scores.forEach((s, serieIndex) => {
        html += `<td><input type="number" min="0" max="10" value="${s.total || 0}"
          data-name="${t.name}" data-serie="${serieIndex}" data-field="total"
          style="width:3em;text-align:center"></td>`;
      });
      html += `<td>${total}</td><td>${perc}%</td>`;
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

  } else {
    // TRAINING : 50m + 25m + Total par série
    thead.innerHTML = `<th>#</th><th>Tireur</th>` +
      SERIES.map(s => `<th colspan="3">${s.name}<br><span style="font-size:11px">50m | 25m | Total</span></th>`).join('') +
      `<th>Total</th><th>%</th>`;

    const tbody = scoreTable.querySelector('tbody');
    tbody.innerHTML = '';

    const rows = tireurs.map(t => {
      const serieScores = t.scores.map(s => (s.dist50 + s.dist25) * 10);
      const total = serieScores.reduce((a, b) => a + b, 0);
      const maxTotal = SERIES.length * 50 * 10; // 5+5 cibles x 10 pts
      const perc = maxTotal ? Math.round(total / maxTotal * 100) : 0;
      return { t, serieScores, total, perc };
    });

    rows.sort((a, b) => b.total - a.total);

    rows.forEach(({ t, serieScores, total, perc }, idx) => {
      const tr = document.createElement('tr');
      let html = `<td>${idx + 1}</td><td>${t.name}</td>`;
      t.scores.forEach((s, serieIndex) => {
        const serieTotal = serieScores[serieIndex];
        html += `
          <td><input type="number" min="0" max="5" value="${s.dist50}"
            data-name="${t.name}" data-serie="${serieIndex}" data-field="dist50"
            style="width:3em;text-align:center"></td>
          <td><input type="number" min="0" max="5" value="${s.dist25}"
            data-name="${t.name}" data-serie="${serieIndex}" data-field="dist25"
            style="width:3em;text-align:center"></td>
          <td>${serieTotal}</td>`;
      });
      html += `<td>${total}</td><td>${perc}%</td>`;
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });
  }

  // INPUTS change handler UNIFIÉ
  scoreTable.querySelectorAll('input[type=number]').forEach(input => {
    input.addEventListener('change', e => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = 0;
      const max = parseInt(e.target.max);
      if (val < 0) val = 0;
      if (val > max) val = max;
      e.target.value = val;

      const name = e.target.getAttribute('data-name');
      const serieIndex = parseInt(e.target.getAttribute('data-serie'), 10);
      const field = e.target.getAttribute('data-field');
      const tireur = tireurs.find(tt => tt.name === name);
      if (!tireur) return;

      const mode = getMode();
      if (mode === 'competition' && field === 'total') {
        tireur.scores[serieIndex].total = val * 10; // 10 cibles = 100 pts
      } else {
        tireur.scores[serieIndex][field] = val;
      }
      renderScoreTable();
    });
  });
}

// HISTORIQUE : Une seule entrée à la fin des 4 séries de match
function saveHistory() {
  const t = tireurs[currentTireurIndex];
  if (!t) return;

  const mode = getMode();
  let serieText;
  if (mode === 'competition') {
    serieText = t.scores.map((s, idx) => `S${idx+1}: ${s.total || 0} pts`).join(' | ');
  } else {
    serieText = t.scores.map((s, idx) => {
      const pts50 = s.dist50 * 10;
      const pts25 = s.dist25 * 10;
      const total = pts50 + pts25;
      return `S${idx+1}: ${pts50}+${pts25}=${total}`;
    }).join(' | ');
  }

  const totalGlobal = t.scores.reduce((acc, s) => {
    return acc + (s.total || (s.dist50 + s.dist25) * 10);
  }, 0);

  const div = document.createElement('div');
  div.innerHTML = `${t.name}: ${serieText} | Tot: ${totalGlobal} pts <button>Supprimer</button>`;
  div.querySelector('button').addEventListener('click', () => div.remove());
  historyContainer.appendChild(div);
}

// EXPORT PDF : Adapté au mode
function exportPDF() {
  if (tireurs.length === 0) {
    showMessage('Aucun tireur à exporter !');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Résultats du tir', 105, 15, null, null, 'center');

  const mode = getMode();
  let headers, data;

  if (mode === 'competition') {
    headers = ['', 'Tireur', ...SERIES.map((_, i) => `S${i+1}`)];
    data = tireurs.map((t, idx) => {
      const flatSeries = t.scores.map(s => s.total || 0);
      return [idx + 1, t.name, ...flatSeries];
    });
  } else {
    headers = ['', 'Tireur', ...SERIES.flatMap((_, i) => [`S${i+1} 50m`, `S${i+1} 25m`])];
    data = tireurs.map((t, idx) => {
      const flatSeries = t.scores.flatMap(s => [s.dist50 * 10, s.dist25 * 10]);
      return [idx + 1, t.name, ...flatSeries];
    });
  }

  doc.autoTable({
    head: [headers],
    body: data,
    startY: 25,
    theme: 'grid'
  });
  doc.save('resultats-tir.pdf');
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
  renderTabs();
  renderTireurs();
  renderScoreTable();
  resetTimerGlobal();
  updateCurrentSeriesLabel();

  // MODE CHANGE
  if (modeSelector) {
    modeSelector.addEventListener('change', () => {
      tireurs.forEach(t => {
        t.scores = SERIES.map(() => ({ dist50: 0, dist25: 0, total: 0 }));
      });
      renderScoreTable();
    });
  }
});

// EVENTS
addTireurBtn.addEventListener('click', addTireur);
tireurNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTireur();
});
startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimerGlobal);
exportPdfBtn.addEventListener('click', exportPDF);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker enregistré', reg))
      .catch(err => console.log('Erreur Service Worker', err));
  });
}

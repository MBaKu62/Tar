console.log("JS chargé OK");

// ==== CONFIG SÉRIES (pour les points / tableau) ====
const SERIES = [
  { name: "Série 1", gongs: 10 },
  { name: "Série 2", gongs: 10 },
  { name: "Série 3", gongs: 10 },
  { name: "Série 4", gongs: 10 }
];

// ==== CONFIG TIMER GLOBAL ====
// Série 0 = entraînement (30s), puis 4 séries match : 30, 30, 20, 20
const SERIES_TIMER_CONFIG = [
  { label: "Série 0 (Entraînement)", shootTime: 30 },
  { label: "Série 1", shootTime: 30 },
  { label: "Série 2", shootTime: 30 },
  { label: "Série 3", shootTime: 20 },
  { label: "Série 4", shootTime: 20 }
];

// Génération des phases : pour chaque série -> prep 60s, ready 7s, fire shootTime
const PHASES = [];
SERIES_TIMER_CONFIG.forEach((serie, index) => {
  PHASES.push({
    type: "prep",
    duration: 60,
    text: `Préparation ${serie.label}`,
    sound: "prep",
    serieIndexForScores: index
  });
  PHASES.push({
    type: "ready",
    duration: 7,
    text: `Mise en place ${serie.label}`,
    sound: "ready",
    serieIndexForScores: index
  });
  PHASES.push({
    type: "fire",
    duration: serie.shootTime,
    text: `Tir ${serie.label}`,
    sound: "fire",
    endSound: "stop",
    serieIndexForScores: index   // 0 = entraînement, 1..4 = séries de match
  });
});

// ==== VARIABLES ====
let tireurs = [];
let currentTireurIndex = null;
let currentSeries = 0;          // 0..3 pour les scores uniquement
let timer = 0;
let timerInterval = null;
let currentPhaseIndex = -1;     // index dans PHASES

// ==== ELEMENTS DOM ====
const tireurNameInput = document.getElementById("tireur-name"),
      addTireurBtn = document.getElementById("add-tireur-btn"),
      tireursUl = document.getElementById("tireurs-ul"),
      seriesTabs = document.getElementById("series-tabs"),
      startBtn = document.getElementById("start-btn"),
      resetBtn = document.getElementById("reset-btn"),
      timerDisplay = document.getElementById("timer-display"),
      timerBar = document.querySelector(".timer-bar"),
      timerTireur = document.getElementById("timer-tireur"),
      exportPdfBtn = document.getElementById("export-pdf-btn"),
      messageDiv = document.getElementById("message"),
      historyContainer = document.getElementById("history-container"),
      scoreTable = document.getElementById("score-table"),
      currentSeriesLabel = document.getElementById("current-series-label");

// ==== AUDIO ====
const soundPrep  = new Audio("./prep.mp3");
const soundReady = new Audio("./ready.mp3");
const soundFire  = new Audio("./fire.mp3");
const soundStop  = new Audio("./stop.mp3");

// ==== INIT ====
document.addEventListener("DOMContentLoaded", () => {
  renderTabs();
  renderTireurs();
  renderScoreTable();
  resetTimerGlobal();
  updateCurrentSeriesLabel();
});

// ==== TIMER GLOBAL PAR PHASES ====

function playSound(name) {
  const map = {
    prep: soundPrep,
    ready: soundReady,
    fire: soundFire,
    stop: soundStop
  };
  const s = map[name];
  if (!s) return;
  try {
    s.currentTime = 0;
    s.play();
  } catch (_) {}
}

function startTimer() {
  if (currentTireurIndex === null) {
    showMessage("Sélectionnez un tireur !");
    return;
  }

  if (currentPhaseIndex !== -1 && currentPhaseIndex < PHASES.length) {
    showMessage("Timer déjà en cours");
    return;
  }

  currentPhaseIndex = 0;
  launchCurrentPhase();
}

function launchCurrentPhase() {
  if (currentPhaseIndex < 0 || currentPhaseIndex >= PHASES.length) {
    showMessage("Séquence terminée pour ce tireur");
    clearInterval(timerInterval);
    currentPhaseIndex = -1;
    updateCurrentSeriesLabel(); // remet le texte "prête"
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

      // son de fin (ex: STOP)
      if (phase.endSound) playSound(phase.endSound);

      // Si c'est la DERNIÈRE phase de tir de match (Série 4 = index 4)
      if (phase.type === "fire" && phase.serieIndexForScores === 4) {
        saveHistory(); // historique global une seule fois
      }

      // Si c'est une phase de tir : délai de 2 s après STOP
      if (phase.type === "fire") {
        setTimeout(() => {
          currentPhaseIndex++;
          launchCurrentPhase();
        }, 2000);
      } else {
        // Autres phases : enchaînement immédiat
        currentPhaseIndex++;
        launchCurrentPhase();
      }
    }
  }, 1000);
}

// Affichage clair : Entraînement / Série X + phase + temps
function updatePhaseLabel(phase) {
  if (!currentSeriesLabel) return;

  const idx = phase.serieIndexForScores;
  let serieText = "";
  if (idx === 0) {
    serieText = "Entraînement";
  } else if (idx >= 1 && idx <= 4) {
    serieText = `Série ${idx}`;
  }

  let phaseName = "";
  if (phase.type === "prep") phaseName = "Préparation";
  else if (phase.type === "ready") phaseName = "Mise en place";
  else if (phase.type === "fire") phaseName = "Tir";

  currentSeriesLabel.textContent =
    `${serieText ? serieText + " – " : ""}${phaseName} (${timer}s)`;
}

function updateTimerDisplay() {
  timerDisplay.textContent = `${timer}s`;
}

function updateTimerBar() {
  const phase = PHASES[currentPhaseIndex];
  if (!phase) {
    timerBar.style.width = "0%";
    return;
  }
  const percent = Math.max(0, (timer / phase.duration) * 100);
  timerBar.style.width = percent + "%";
}

// Reset complet du timer global
function resetTimerGlobal() {
  clearInterval(timerInterval);
  currentPhaseIndex = -1;
  timer = 0;
  timerDisplay.textContent = "0s";
  timerBar.style.width = "0%";
  if (currentSeriesLabel) currentSeriesLabel.textContent = "";
  updateCurrentSeriesLabel();
}

// Info générale (uniquement quand aucune phase n'est en cours)
function updateCurrentSeriesLabel() {
  if (!currentSeriesLabel) return;
  if (currentTireurIndex === null) {
    currentSeriesLabel.textContent = "";
    return;
  }
  if (currentPhaseIndex === -1) {
    currentSeriesLabel.textContent =
      "Séquence 821 prête pour le tireur sélectionné";
  }
}

// ==== MESSAGE TEMPORAIRE ====
function showMessage(text) {
  messageDiv.textContent = text;
  setTimeout(() => {
    messageDiv.textContent = "";
  }, 2000);
}

// ==== AJOUT TIREURS ====
function addTireur() {
  const name = tireurNameInput.value.trim();
  if (!name) {
    showMessage("Entrez un nom valide");
    return;
  }
  if (tireurs.some((t) => t.name === name)) {
    showMessage("Tireur déjà existant !");
    return;
  }

  tireurs.push({
    name,
    scores: SERIES.map(() => ({
      dist50: 0,
      dist25: 0
    }))
  });

  currentTireurIndex = tireurs.length - 1;
  renderTireurs();
  renderScoreTable();
  resetTimerGlobal();
  tireurNameInput.value = "";
}

function renderTireurs() {
  tireursUl.innerHTML = "";
  tireurs.forEach((t, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${t.name}</span> <button>Supprimer</button>`;
    li.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return;
      currentTireurIndex = idx;
      renderTireurs();
      resetTimerGlobal();
    });
    li.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      tireurs.splice(idx, 1);
      if (currentTireurIndex >= tireurs.length)
        currentTireurIndex = tireurs.length - 1;
      renderTireurs();
      renderScoreTable();
      resetTimerGlobal();
    });
    li.classList.toggle("active", idx === currentTireurIndex);
    tireursUl.appendChild(li);
  });
}

// ==== SERIES ====
// On ne montre plus les onglets de séries
function renderTabs() {
  if (seriesTabs) {
    seriesTabs.innerHTML = "";
  }
}

// ==== TABLEAU SCORES ====
function renderScoreTable() {
  const thead = scoreTable.querySelector("thead tr");
  thead.innerHTML =
    "<th>#</th><th>Tireur</th>" +
    SERIES.map((s) =>
      `<th colspan="3">
         ${s.name}<br>
         <span style="font-size:11px;">50 m | 25 m | Total</span>
       </th>`
    ).join("") +
    "<th>Total</th><th>Touch</th>";

  const tbody = scoreTable.querySelector("tbody");
  tbody.innerHTML = "";

  const rows = tireurs.map((t) => {
    const serieScores = t.scores.map(
      (s) => (s.dist50 + s.dist25) * 10
    );
    const total = serieScores.reduce((a, b) => a + b, 0);
    const maxTotal = SERIES.length * (5 + 5) * 10;
    const perc = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
    return { t, serieScores, total, perc };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let i = SERIES.length - 1; i >= 0; i--) {
      if (b.serieScores[i] !== a.serieScores[i])
        return b.serieScores[i] - a.serieScores[i];
    }
    return a.t.name.localeCompare(b.t.name, "fr", { sensitivity: "base" });
  });

  rows.forEach(({ t, serieScores, total, perc }, idx) => {
    const tr = document.createElement("tr");
    const rank = idx + 1;

    let html = "";
    html += `<td>${rank}</td>`;
    html += `<td>${t.name}</td>`;

    t.scores.forEach((s, serieIndex) => {
      const serieTotal = serieScores[serieIndex];
      html += `
        <td>
          <input type="number" min="0" max="5"
            value="${s.dist50}"
            data-name="${t.name}"
            data-serie="${serieIndex}"
            data-field="dist50"
            style="width:3em;text-align:center;">
        </td>
        <td>
          <input type="number" min="0" max="5"
            value="${s.dist25}"
            data-name="${t.name}"
            data-serie="${serieIndex}"
            data-field="dist25"
            style="width:3em;text-align:center;">
        </td>
        <td>${serieTotal}</td>
      `;
    });

    html += `<td>${total}</td>`;
    html += `<td>${perc}%</td>`;

    tr.innerHTML = html;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("input[type='number']").forEach((input) => {
    input.addEventListener("change", (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 0) val = 0;
      if (val > 5) val = 5;
      e.target.value = val;

      const name = e.target.getAttribute("data-name");
      const serieIndex = parseInt(
        e.target.getAttribute("data-serie"),
        10
      );
      const field = e.target.getAttribute("data-field");

      const tireur = tireurs.find((tt) => tt.name === name);
      if (!tireur) return;

      tireur.scores[serieIndex][field] = val;

      renderScoreTable();
    });
  });
}

// ==== HISTORIQUE ====
// Une seule entrée à la fin des 4 séries de match
function saveHistory() {
  const t = tireurs[currentTireurIndex];
  if (!t) return;

  const serieText = t.scores.map((s, idx) => {
    const pts50 = s.dist50 * 10;
    const pts25 = s.dist25 * 10;
    const total = pts50 + pts25;
    return `S${idx+1} : ${pts50}/${pts25} (${total})`;
  }).join(" | ");

  const totalGlobal = t.scores
    .map(s => (s.dist50 + s.dist25) * 10)
    .reduce((a,b)=>a+b,0);

  const div = document.createElement("div");
  div.innerHTML =
    `${t.name} → ${serieText} | Tot=${totalGlobal} pts ` +
    `<button>Supprimer</button>`;

  div.querySelector("button").addEventListener("click", () => {
    div.remove();
  });
  historyContainer.appendChild(div);
}

// ==== EXPORT PDF ====
// Affiche uniquement S1/S2/S3/S4 avec 50m et 25m
function exportPDF() {
  if (tireurs.length === 0) {
    showMessage("Aucun tireur à exporter !");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Résultats du tir", 105, 15, null, null, "center");

  const headers = [[
    "#",
    "Tireur",
    ...SERIES.flatMap((s, i) => [
      `S${i+1} 50m`,
      `S${i+1} 25m`
    ])
  ]];

  const rows = tireurs.map((t) => {
    const serieDetails = t.scores.map(s => ({
      pts50: s.dist50 * 10,
      pts25: s.dist25 * 10
    }));
    return { t, serieDetails };
  });

  const data = rows.map(({ t, serieDetails }, idx) => {
    const flatSeries = serieDetails.flatMap(sd => [
      sd.pts50,
      sd.pts25
    ]);
    return [
      idx + 1,
      t.name,
      ...flatSeries
    ];
  });

  doc.autoTable({ head: headers, body: data, startY: 25, theme: "grid" });
  doc.save("resultats_tir.pdf");
}

// ==== EVENTS ====
addTireurBtn.addEventListener("click", addTireur);
tireurNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTireur();
});
startBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", resetTimerGlobal);
exportPdfBtn.addEventListener("click", exportPDF);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => console.log("Service Worker enregistré:", reg))
      .catch((err) => console.log("Erreur Service Worker:", err));
  });
}

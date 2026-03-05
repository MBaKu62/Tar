
console.log("JS chargé OK");
// ==== CONFIG SÉRIES ====
const SERIES = [
  { name:"Série 1", gongs:10, time:30 },
  { name:"Série 2", gongs:10, time:30 },
  { name:"Série 3", gongs:10, time:20 },
  { name:"Série 4", gongs:10, time:20 }
];

// ==== VARIABLES ====
let tireurs = [];
let currentTireurIndex = null;
let currentSeries = 0;
let timer = 0;
let timerInterval = null;
const prepTime = 7;

// ==== ELEMENTS DOM ====
const tireurNameInput = document.getElementById("tireur-name"),
      addTireurBtn = document.getElementById("add-tireur-btn"),
      tireursUl = document.getElementById("tireurs-ul"),
      seriesTabs = document.getElementById("series-tabs"),
      gongContainer = document.getElementById("gong-container"),
      startBtn = document.getElementById("start-btn"),
      timerDisplay = document.getElementById("timer-display"),
      timerBar = document.querySelector(".timer-bar"),
      timerTireur = document.getElementById("timer-tireur"),
      exportPdfBtn = document.getElementById("export-pdf-btn"),
      messageDiv = document.getElementById("message"),
      historyContainer = document.getElementById("history-container"),
      scoreTable = document.getElementById("score-table");

// ==== AUDIO BEEP  ====
const beep = new Audio("./beep.mp3");
beep.preload = "auto";

// ==== INIT ====
document.addEventListener('DOMContentLoaded',()=>{
  renderTabs(); renderTireurs(); renderGongs(); renderScoreTable(); resetTimer();
});

// ==== TIMER ====
function startTimer(){
  if(currentTireurIndex===null){
    showMessage("Sélectionnez un tireur !");
    return;
  }
  clearInterval(timerInterval);
  const baseTime = SERIES[currentSeries].time;
  timer = baseTime + prepTime;
  updateTimerDisplay(); updateTimerBar();

  beep.currentTime = 0;
  beep.play();

  timerInterval = setInterval(()=>{
    timer--;
    updateTimerDisplay(); updateTimerBar();
    if(timer === baseTime){
      beep.currentTime = 0;
      beep.play();
    }
    if(timer <= 0){
      clearInterval(timerInterval);
      beep.currentTime = 0;
      beep.play();
      saveHistory();
      renderScoreTable();
      showMessage("Série terminée !");
    }
  },1000);
}
function updateTimerDisplay(){ 
  timerDisplay.textContent = `${timer}s`; 
  // timerTireur.textContent = tireurs[currentTireurIndex]?.name || "Aucun tireur";  // Commenté
}

function updateTimerBar(){ 
  const percent = Math.max(0,(timer/(SERIES[currentSeries].time+prepTime))*100);
  timerBar.style.width = percent+"%"; 
}

function resetTimer(){ 
  clearInterval(timerInterval); 
  timer = SERIES[currentSeries]?.time + prepTime || 0; 
  updateTimerDisplay(); updateTimerBar(); 
}

// ==== MESSAGE TEMPORAIRE ====
function showMessage(text){
  messageDiv.textContent = text;
  setTimeout(()=>{ messageDiv.textContent = ""; },2000);
}

// ==== AJOUT TIREURS ====
function addTireur(){
  const name = tireurNameInput.value.trim();
  if(!name){ showMessage("Entrez un nom valide"); return; }
  if(tireurs.some(t=>t.name===name)){ showMessage("Tireur déjà existant !"); return; }
  tireurs.push({name, scores: SERIES.map(s=>Array(s.gongs).fill(0))});
  currentTireurIndex = tireurs.length-1;
  renderTireurs(); renderGongs(); renderScoreTable(); resetTimer(); tireurNameInput.value="";
}

function renderTireurs(){
  tireursUl.innerHTML="";
  tireurs.forEach((t,idx)=>{
    const li = document.createElement("li");
    li.innerHTML=`<span>${t.name}</span> <button>Supprimer</button>`;
    li.addEventListener("click", e=>{
      if(e.target.tagName==="BUTTON") return;
      currentTireurIndex = idx;
      renderTireurs(); renderGongs(); resetTimer();
    });
    li.querySelector("button").addEventListener("click", e=>{
      e.stopPropagation();
      tireurs.splice(idx,1);
      if(currentTireurIndex>=tireurs.length) currentTireurIndex = tireurs.length-1;
      renderTireurs(); renderGongs(); renderScoreTable(); resetTimer();
    });
    li.classList.toggle("active", idx===currentTireurIndex);
    tireursUl.appendChild(li);
  });
}

// ==== SERIES ====
function renderTabs(){
  seriesTabs.innerHTML="";
  SERIES.forEach((s,idx)=>{
    const tab = document.createElement("div");
    tab.classList.add("tab");
    if(idx===currentSeries) tab.classList.add("active");
    tab.textContent = s.name;
    tab.addEventListener("click",()=>{ currentSeries = idx; renderTabs(); renderGongs(); resetTimer(); });
    seriesTabs.appendChild(tab);
  });
}

// ==== GONGS ====
function renderGongs(){
  gongContainer.innerHTML="";
  if(currentTireurIndex===null) return;
  const gongs = tireurs[currentTireurIndex].scores[currentSeries];
  gongs.forEach((val,idx)=>{
    const gong = document.createElement("div");
    gong.classList.add("gong");
    const distance = idx<5 ? "50m" : "25m";
    gong.textContent = distance;
    if(val===10) gong.classList.add("hit");
    gong.addEventListener("click", ()=>{
      gongs[idx] = gongs[idx]===0 ? 10 : 0;
      gong.classList.toggle("hit", gongs[idx]===10);
      renderScoreTable();
    });
    gongContainer.appendChild(gong);
  });
}

// ==== TABLEAU SCORES ====
function renderScoreTable(){
  const thead = scoreTable.querySelector("thead tr");
  thead.innerHTML =
    "<th>#</th><th>Tireur</th>" +
    SERIES.map(s => `<th>${s.name}</th>`).join("") +
    "<th>Total</th><th>Touch</th>";

  const tbody = scoreTable.querySelector("tbody");
  tbody.innerHTML = "";

  const rows = tireurs.map(t => {
    const serieScores = t.scores.map(s => s.reduce((a,b)=>a+b,0));
    const total = serieScores.reduce((a,b)=>a+b,0);
    const maxTotal = SERIES.reduce((acc, s) => acc + (s.gongs * 10), 0);
    const perc = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
    return { t, serieScores, total, perc };
  });

  rows.sort((a,b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let i = SERIES.length - 1; i >= 0; i--) {
      if (b.serieScores[i] !== a.serieScores[i]) return b.serieScores[i] - a.serieScores[i];
    }
    return a.t.name.localeCompare(b.t.name, "fr", { sensitivity: "base" });
  });

  rows.forEach(({ t, serieScores, total, perc }, idx) => {
    const tr = document.createElement("tr");
    const rank = idx + 1;

    tr.innerHTML =
      `<td>${rank}</td>` +
      `<td>${t.name}</td>` +
      serieScores.map(sc => `<td>${sc}</td>`).join("") +
      `<td>${total}</td>` +
      `<td>${perc}%</td>`;

    tbody.appendChild(tr);
  });
}

// ==== HISTORIQUE ====
function saveHistory(){
  const t = tireurs[currentTireurIndex];
  if(!t) return;
  const div = document.createElement("div");
  const serieTotal = t.scores[currentSeries].reduce((a,b)=>a+b,0);
  div.innerHTML = `${t.name} - ${SERIES[currentSeries].name} : ${serieTotal} pts <button>Supprimer</button>`;
  div.querySelector("button").addEventListener("click", ()=>{ div.remove(); });
  historyContainer.appendChild(div);
}

// ==== EXPORT PDF ====
function exportPDF(){
  if(tireurs.length===0){ showMessage("Aucun tireur à exporter !"); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Résultats du tir", 105, 15, null, null, "center");
  
  // Ajout colonne # + TRI identique à renderScoreTable
  const headers = [["#", "Tireur", ...SERIES.map(s=>s.name), "Total", "% Touché"]];
  const rows = tireurs.map(t => {
    const serieScores = t.scores.map(s=>s.reduce((a,b)=>a+b,0));
    const total = serieScores.reduce((a,b)=>a+b,0);
    const maxTotal = SERIES.reduce((acc, s) => acc + (s.gongs * 10), 0);
    const perc = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
    return { t, serieScores, total, perc };
  }).sort((a,b) => {
    if (b.total !== a.total) return b.total - a.total;
    for (let i = SERIES.length - 1; i >= 0; i--) {
      if (b.serieScores[i] !== a.serieScores[i]) return b.serieScores[i] - a.serieScores[i];
    }
    return a.t.name.localeCompare(b.t.name, "fr", { sensitivity: "base" });
  });
  
  const data = rows.map(({ t, serieScores, total, perc }, idx) => 
    [(idx+1), t.name, ...serieScores, total, perc+"%"]
  );
  
  doc.autoTable({ head: headers, body: data, startY: 25, theme: 'grid' });
  doc.save("resultats_tir.pdf");
}

// ==== EVENTS ====
addTireurBtn.addEventListener("click", addTireur);
tireurNameInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addTireur(); });
startBtn.addEventListener("click", startTimer);
exportPdfBtn.addEventListener("click", exportPDF);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("Service Worker enregistré:", reg))
      .catch(err => console.log("Erreur Service Worker:", err));
  });
}
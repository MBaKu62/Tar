const SERIES = [
  { name:"Série 1", gongs:10, time:30 },
  { name:"Série 2", gongs:10, time:30 },
  { name:"Série 3", gongs:10, time:20 },
  { name:"Série 4", gongs:10, time:20 }
];

let tireurs=[], currentTireurIndex=null, currentSeries=0, timer=0, timerInterval=null, prepTime=7;

const tireurNameInput=document.getElementById("tireur-name"),
      addTireurBtn=document.getElementById("add-tireur-btn"),
      tireursUl=document.getElementById("tireurs-ul"),
      seriesTabs=document.getElementById("series-tabs"),
      gongContainer=document.getElementById("gong-container"),
      startBtn=document.getElementById("start-btn"),
      timerDisplay=document.getElementById("timer-display"),
      timerBar=document.querySelector(".timer-bar"),
      timerTireur=document.getElementById("timer-tireur"),
      exportPdfBtn=document.getElementById("export-pdf-btn"),
      historyContainer=document.getElementById("history-container"),
      scoreTable=document.getElementById("score-table"),
      messageDiv=document.getElementById("message");

// Beep en ligne
const beep = new Audio("https://www.soundjay.com/button/beep-07.mp3");

document.addEventListener('DOMContentLoaded',()=>{
  renderTabs(); renderTireurs(); renderGongs(); renderScoreTable(); resetTimer();
});

// Timer
function startTimer(){
  if(currentTireurIndex===null){
    messageDiv.textContent = "Sélectionnez un tireur !"; return;
  }
  messageDiv.textContent = "";
  clearInterval(timerInterval);
  const baseTime = SERIES[currentSeries].time;
  timer = baseTime + prepTime;
  updateTimerDisplay(); updateTimerBar();
  beep.play();

  timerInterval=setInterval(()=>{
    timer--;
    updateTimerDisplay();
    updateTimerBar();
    if(timer===baseTime) beep.play();
    if(timer<=0){
      clearInterval(timerInterval);
      beep.play();
      saveHistory();
      renderScoreTable();
      timerDisplay.textContent = "Temps écoulé !";
      timerBar.style.width = "0%";
      timerBar.style.background = "var(--red)";
    }
  },1000);
}

function updateTimerDisplay(){ 
  if(timer > 0) timerDisplay.textContent = `${timer}s`; 
  timerTireur.textContent = tireurs[currentTireurIndex]?.name || "Aucun tireur"; 
}

function updateTimerBar(){ 
  if(timer>0){
    const percent=Math.max(0,(timer/(SERIES[currentSeries].time+prepTime))*100); 
    timerBar.style.width = percent+"%"; 
    timerBar.style.background = "var(--accent-dark)";
  }
}

function resetTimer(){ clearInterval(timerInterval); timer = SERIES[currentSeries]?.time + prepTime || 0; updateTimerDisplay(); updateTimerBar(); }

// Ajouter tireur
function addTireur(){
  const name = tireurNameInput.value.trim();
  if(!name){ messageDiv.textContent="Entrez un nom valide !"; return; }
  if(tireurs.some(t=>t.name===name)){ messageDiv.textContent="Tireur déjà existant !"; return; }
  messageDiv.textContent="";
  tireurs.push({name,scores:SERIES.map(s=>Array(s.gongs).fill(0))});
  currentTireurIndex = tireurs.length-1;
  renderTireurs(); renderGongs(); renderScoreTable(); resetTimer();
  tireurNameInput.value="";
}

// Affichage tireurs
function renderTireurs(){
  tireursUl.innerHTML="";
  tireurs.forEach((t,idx)=>{
    const li=document.createElement("li");
    li.innerHTML=`<span>${t.name}</span> <button>Supprimer</button>`;
    li.addEventListener("click",e=>{
      if(e.target.tagName==="BUTTON") return;
      currentTireurIndex=idx; renderTireurs(); renderGongs(); renderScoreTable(); resetTimer();
    });
    li.querySelector("button").addEventListener("click",e=>{
      e.stopPropagation(); tireurs.splice(idx,1); 
      if(currentTireurIndex>=tireurs.length) currentTireurIndex=tireurs.length-1;
      renderTireurs(); renderGongs(); renderScoreTable(); resetTimer();
    });
    li.classList.toggle("active", idx===currentTireurIndex);
    tireursUl.appendChild(li);
  });
}

// Onglets séries
function renderTabs(){
  seriesTabs.innerHTML="";
  SERIES.forEach((s,idx)=>{
    const tab=document.createElement("div");
    tab.classList.add("tab");
    if(idx===currentSeries) tab.classList.add("active");
    tab.textContent=s.name;
    tab.addEventListener("click",()=>{ currentSeries=idx; renderTabs(); renderGongs(); resetTimer(); });
    seriesTabs.appendChild(tab);
  });
}

// Gongs
function renderGongs(){
  gongContainer.innerHTML="";
  if(currentTireurIndex===null) return;
  const gongs = tireurs[currentTireurIndex].scores[currentSeries];
  gongs.forEach((val,idx)=>{
    const gong=document.createElement("div");
    gong.classList.add("gong");
    gong.textContent = idx<5 ? "50m" : "25m";
    if(val===10) gong.classList.add("hit");
    gong.addEventListener("click",()=>{
      gongs[idx] = gongs[idx]===0 ? 10 : 0;
      gong.classList.toggle("hit",gongs[idx]===10);
      renderScoreTable();
    });
    gongContainer.appendChild(gong);
  });
}

// Tableau scores
function renderScoreTable(){
  const thead=scoreTable.querySelector("thead tr");
  thead.innerHTML="<th>Tireur</th>"+SERIES.map(s=>`<th>${s.name}</th>`).join("")+"<th>Total</th><th>% Touché</th>";
  const tbody=scoreTable.querySelector("tbody"); tbody.innerHTML="";
  tireurs.forEach(t=>{
    const tr=document.createElement("tr");
    const serieScores = t.scores.map(s=>s.reduce((a,b)=>a+b,0));
    const total = serieScores.reduce((a,b)=>a+b,0);
    const perc = Math.round((total/(SERIES.length*100))*100);
    tr.innerHTML = `<td>${t.name}</td>`+serieScores.map(s=>`<td>${s}</td>`).join("")+`<td>${total}</td><td>${perc}%</td>`;
    tbody.appendChild(tr);
  });
}

// Historique
function saveHistory(){
  const t = tireurs[currentTireurIndex];
  if(!t) return;
  const div = document.createElement("div");
  const serieScores = t.scores[currentSeries].reduce((a,b)=>a+b,0);
  div.innerHTML = `${t.name} - ${SERIES[currentSeries].name} : ${serieScores} <button>Supprimer</button>`;
  div.querySelector("button").addEventListener("click",()=>{ div.remove(); });
  historyContainer.appendChild(div);
}

// Export PDF
function exportPDF(){
  if(tireurs.length===0){ messageDiv.textContent="Aucun tireur à exporter !"; return; }
  messageDiv.textContent="";
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(18);
  doc.text("Résultats du tir",105,15,null,null,"center");
  const headers=[["Tireur",...SERIES.map(s=>s.name),"Total","% Touché"]];
  const data=tireurs.map(t=>{
    const serieScores = t.scores.map(s=>s.reduce((a,b)=>a+b,0));
    const total = serieScores.reduce((a,b)=>a+b,0);
    const perc = Math.round((total/(SERIES.length*100))*100);
    return [t.name,...serieScores,total,perc+"%"];
  });
  doc.autoTable({head:headers,body:data,startY:25,theme:'grid'});
  doc.save("resultats_tir.pdf");
}

addTireurBtn.addEventListener("click", addTireur);
tireurNameInput.addEventListener("keydown", e=>{ if(e.key==="Enter") addTireur(); });
startBtn.addEventListener("click", startTimer);
exportPdfBtn.addEventListener("click", exportPDF);
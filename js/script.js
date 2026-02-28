// ==== SERIES & VARIABLES ====
let SERIES=[
  {name:"Série 1", gongs:10, time:30},
  {name:"Série 2", gongs:10, time:30},
  {name:"Série 3", gongs:10, time:20},
  {name:"Série 4", gongs:10, time:20}
];

let tireurs=[], currentTireurIndex=null, currentSeries=0, timer=0, timerInterval=null;
let scoreChart=null;
let history=[];

const tireurNameInput=document.getElementById("tireur-name"),
      addTireurBtn=document.getElementById("add-tireur-btn"),
      tireursUl=document.getElementById("tireurs-ul"),
      seriesTabs=document.getElementById("series-tabs"),
      gongContainer=document.getElementById("gong-container"),
      startBtn=document.getElementById("start-btn"),
      saveSessionBtn=document.getElementById("save-session-btn"),
      exportPdfBtn=document.getElementById("export-pdf-btn"),
      exportCsvBtn=document.getElementById("export-csv-btn"),
      timerDisplay=document.getElementById("timer-display"),
      timerBar=document.querySelector(".timer-bar"),
      timerTireur=document.getElementById("timer-tireur"),
      scoreTable=document.getElementById("score-table"),
      scoreChartCanvas=document.getElementById("score-chart"),
      mainTabs=document.querySelectorAll(".main-tab"),
      tabContents=document.querySelectorAll(".tab-content"),
      historyTable=document.getElementById("history-table").querySelector("tbody"),
      addSeriesBtn=document.getElementById("add-series-btn");

// ==== INIT ====
document.addEventListener('DOMContentLoaded',()=>{
  renderTabs(); renderTireurs(); renderGongs(); renderScoreTable();
  resetTimer(); updateChart(); loadHistory();
});

// ==== TIMER ====
function startTimer(){
  if(currentTireurIndex===null) return alert("Sélectionnez un tireur");
  clearInterval(timerInterval);
  timer=SERIES[currentSeries].time;
  updateTimerDisplay(); updateTimerBar();
  timerInterval=setInterval(()=>{
    timer--;
    updateTimerDisplay(); updateTimerBar();
    if(timer<=0){ clearInterval(timerInterval); timerDisplay.classList.remove("pulse"); alert("Temps écoulé !"); }
  },1000);
}
function updateTimerDisplay(){ timerDisplay.textContent=`${timer}s`; timerTireur.textContent=tireurs[currentTireurIndex]?.name||"Aucun tireur"; }
function updateTimerBar(){ const percent=Math.max(0,(timer/SERIES[currentSeries].time)*100); timerBar.style.width=percent+"%"; }
function resetTimer(){ clearInterval(timerInterval); timer=SERIES[currentSeries]?.time||0; updateTimerDisplay(); updateTimerBar(); }

// ==== TIREURS ====
function addTireur(){
  const name=tireurNameInput.value.trim();
  if(!name) return alert("Entrez un nom valide");
  if(tireurs.some(t=>t.name===name)) return alert("Tireur déjà existant !");
  tireurs.push({name,scores:SERIES.map(s=>Array(s.gongs).fill(0))});
  currentTireurIndex=tireurs.length-1;
  renderTireurs(); renderGongs(); renderScoreTable(); resetTimer(); tireurNameInput.value="";
}
function renderTireurs(){
  tireursUl.innerHTML="";
  tireurs.forEach((t,idx)=>{
    const li=document.createElement("li");
    li.innerHTML=`<span>${t.name}</span> <button>Supprimer</button>`;
    li.addEventListener("click",e=>{
      if(e.target.tagName==="BUTTON") return;
      currentTireurIndex=idx;
      renderTireurs(); renderGongs(); resetTimer(); renderScoreTable(); updateChart();
    });
    li.querySelector("button").addEventListener("click",e=>{
      e.stopPropagation();
      const wasCurrent=currentTireurIndex===idx;
      tireurs.splice(idx,1);
      if(wasCurrent) currentTireurIndex=tireurs.length>0?0:null;
      renderTireurs(); renderGongs(); resetTimer(); renderScoreTable(); updateChart();
    });
    li.classList.toggle("active",idx===currentTireurIndex);
    tireursUl.appendChild(li);
  });
}

// ==== SERIES ====
function renderTabs(){
  seriesTabs.innerHTML="";
  SERIES.forEach((s,idx)=>{
    const tab=document.createElement("div");
    tab.classList.add("tab"); if(idx===currentSeries) tab.classList.add("active");
    tab.textContent=s.name;
    tab.addEventListener("click",()=>{ currentSeries=idx; renderTabs(); renderGongs(); resetTimer(); });
    seriesTabs.appendChild(tab);
  });
}

// ==== GONGS ====
function renderGongs(){
  gongContainer.innerHTML="";
  if(currentTireurIndex===null) return;
  const gongs=tireurs[currentTireurIndex].scores[currentSeries];
  gongs.forEach((val,idx)=>{
    const gong=document.createElement("div"); gong.classList.add("gong"); gong.textContent=val;
    if(val===10) gong.classList.add("hit");
    gong.addEventListener("click",()=>{
      gongs[idx]=gongs[idx]===0?10:0;
      gong.textContent=gongs[idx]; gong.classList.toggle("hit",gongs[idx]===10);
      renderScoreTable(); updateChart();
    });
    gongContainer.appendChild(gong);
  });
}

// ==== SCORE TABLE ====
function renderScoreTable(){
  const thead=scoreTable.querySelector("thead tr");
  thead.innerHTML="<th>Tireur</th>"+SERIES.map(s=>`<th>${s.name}</th>`).join("")+"<th>Total</th><th>% Touché</th>";
  const tbody=scoreTable.querySelector("tbody"); tbody.innerHTML="";
  tireurs.forEach(t=>{
    const total=t.scores.flat().reduce((a,b)=>a+b,0);
    const maxTotal=t.scores.flat().length*10;
    const percent=Math.round(total/maxTotal*100);
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${t.name}</td>`+t.scores.map(s=>`<td>${s.reduce((a,b)=>a+b,0)}</td>`).join("")+
                 `<td>${total}</td><td>${percent}%</td>`;
    tbody.appendChild(tr);
  });
}

// ==== GRAPH ==== 
function updateChart(){
  const ctx=scoreChartCanvas.getContext("2d");
  ctx.clearRect(0,0,scoreChartCanvas.width,scoreChartCanvas.height);
  if(tireurs.length===0) return;
  const barWidth=scoreChartCanvas.width/(tireurs.length*SERIES.length+SERIES.length+1);
  tireurs.forEach((t,i)=>{
    let x=i*SERIES.length*barWidth+barWidth;
    t.scores.forEach((s,j)=>{
      const h=(s.reduce((a,b)=>a+b,0)/(s.length*10))*scoreChartCanvas.height;
      ctx.fillStyle="#00ff99"; ctx.fillRect(x,scoreChartCanvas.height-h,barWidth-2,h); x+=barWidth;
    });
  });
}

// ==== EXPORT PDF & CSV ====
function exportPDF(){
  if(tireurs.length===0) return alert("Aucun tireur à exporter !");
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(18); doc.text("Résultats du tir",105,15,null,null,"center");
  const headers=[["Tireur",...SERIES.map(s=>s.name),"Total","% Touché"]];
  const data=tireurs.map(t=>{
    const total=t.scores.flat().reduce((a,b)=>a+b,0);
    const maxTotal=t.scores.flat().length*10;
    const percent=Math.round(total/maxTotal*100);
    return [t.name,...t.scores.map(s=>s.reduce((a,b)=>a+b)),total,percent+"%"];
  });
  doc.autoTable({head:headers,body:data,startY:25,theme:'grid'});
  doc.save("resultats_tir.pdf");
}
function exportCSV(){
  if(tireurs.length===0) return alert("Aucun tireur !");
  let csv="Tireur,"+SERIES.map(s=>s.name).join(",")+","+"Total,% Touché\n";
  tireurs.forEach(t=>{
    const total=t.scores.flat().reduce((a,b)=>a+b,0);
    const maxTotal=t.scores.flat().length*10;
    const percent=Math.round(total/maxTotal*100);
    csv+=t.name+","+
         t.scores.map(s=>s.reduce((a,b)=>a+b)).join(",")+","+
         total+","+percent+"%\n";
  });
  const blob=new Blob([csv],{type:"text/csv"}); 
  const link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download="resultats_tir.csv"; link.click();
}

// ==== HISTORIQUE ====
function saveSession(){
  if(currentTireurIndex===null) return alert("Sélectionnez un tireur");
  const t=tireurs[currentTireurIndex];
  const date=new Date().toLocaleString();
  t.scores.forEach((s,i)=>{
    const total=s.reduce((a,b)=>a+b,0);
    const percent=Math.round(total/(s.length*10)*100);
    history.push({date,tireur:t.name,serie:SERIES[i].name,score:total,percent});
  });
  localStorage.setItem("tirHistory",JSON.stringify(history));
  loadHistory();
}
function loadHistory(){
  history=JSON.parse(localStorage.getItem("tirHistory")||"[]");
  historyTable.innerHTML="";
  history.forEach(h=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${h.date}</td><td>${h.tireur}</td><td>${h.serie}</td><td>${h.score}</td><td>${h.percent}%</td>`;
    historyTable.appendChild(tr);
  });
}
function exportHistoryPDF(){
  if(history.length===0) return alert("Aucun historique !");
  const { jsPDF }=window.jspdf; const doc=new jsPDF();
  doc.setFontSize(18); doc.text("Historique des Sessions",105,15,null,null,"center");
  const headers=[["Date/Heure","Tireur","Série","Score","% Touché"]];
  const data=history.map(h=>[h.date,h.tireur,h.serie,h.score,h.percent+"%"]);
  doc.autoTable({head:headers,body:data,startY:25,theme:'grid'});
  doc.save("historique_tir.pdf");
}
function exportHistoryCSV(){
  if(history.length===0) return alert("Aucun historique !");
  let csv="Date/Heure,Tireur,Série,Score,% Touché\n";
  history.forEach(h=>{ csv+=`${h.date},${h.tireur},${h.serie},${h.score},${h.percent}%\n`; });
  const blob=new Blob([csv],{type:"text/csv"}); 
  const link=document.createElement("a"); link.href=URL.createObjectURL(blob);
  link.download="historique_tir.csv"; link.click();
}

// ==== MAIN TABS ====
mainTabs.forEach(tab=>{
  tab.addEventListener("click",()=>{
    mainTabs.forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    tabContents.forEach(c=>c.classList.remove("active"));
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// ==== EVENTS ====
addTireurBtn.addEventListener("click",addTireur);
tireurNameInput.addEventListener("keydown",e=>{if(e.key==="Enter") addTireur();});
startBtn.addEventListener("click",startTimer);
exportPdfBtn.addEventListener("click",exportPDF);
exportCsvBtn.addEventListener("click",exportCSV);
saveSessionBtn.addEventListener("click",saveSession);
document.getElementById("export-history-pdf").addEventListener("click",exportHistoryPDF);
document.getElementById("export-history-csv").addEventListener("click",exportHistoryCSV);
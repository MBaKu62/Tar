// ==== SERIES & VARIABLES ====
let SERIES = [
  { name:"Série 1", gongs:10, time:30 },
  { name:"Série 2", gongs:10, time:30 },
  { name:"Série 3", gongs:10, time:20 },
  { name:"Série 4", gongs:10, time:20 }
];

let tireurs=[], currentTireurIndex=null, currentSeries=0, timer=0, timerInterval=null;

// ==== DOM ====
const tireurNameInput=document.getElementById("tireur-name"),
      addTireurBtn=document.getElementById("add-tireur-btn"),
      tireursUl=document.getElementById("tireurs-ul"),
      seriesTabs=document.getElementById("series-tabs"),
      gongContainer=document.getElementById("gong-container"),
      startBtn=document.getElementById("start-btn"),
      timerDisplay=document.getElementById("timer-display"),
      timerBar=document.querySelector(".timer-bar"),
      scoreTable=document.getElementById("score-table"),
      timerTireur=document.getElementById("timer-tireur"),
      exportPdfBtn=document.getElementById("export-pdf-btn"),
      seriesManager=document.getElementById("series-manager"),
      toggleSeriesManager=document.getElementById("toggle-series-manager"),
      seriesTableBody=document.getElementById("series-table-body"),
      addSeriesBtn=document.getElementById("add-series-btn");

// ==== INIT ====
document.addEventListener('DOMContentLoaded',()=>{
  renderTabs(); renderTireurs(); renderGongs(); renderScoreTable(); resetTimer();
  renderSeriesManager(); enableNeonClick();
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
    if(timer<=0){ clearInterval(timerInterval); alert("Temps écoulé !"); }
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
  tireurNameInput.value="";
  renderTireurs(); renderGongs(); renderScoreTable();
}
function renderTireurs(){
  tireursUl.innerHTML="";
  tireurs.forEach((t,idx)=>{
    const li=document.createElement("li");
    li.innerHTML=`<span>${t.name}</span> <button>Supprimer</button>`;
    li.addEventListener("click",e=>{ if(e.target.tagName==="BUTTON") return; currentTireurIndex=idx; renderTireurs(); renderGongs(); renderScoreTable(); resetTimer(); });
    li.querySelector("button").addEventListener("click",e=>{ e.stopPropagation(); if(tireurs.length<=1) return alert("Au moins un tireur requis !"); const wasCurrent=currentTireurIndex===idx; tireurs.splice(idx,1); if(wasCurrent) currentTireurIndex=tireurs.length>0?0:null; else if(currentTireurIndex>idx) currentTireurIndex--; renderTireurs(); renderGongs(); renderScoreTable(); resetTimer(); });
    li.classList.toggle("active",idx===currentTireurIndex);
    tireursUl.appendChild(li);
  });
  enableDragTireurs();
}

// ==== SERIES TABS ====
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
    const gong=document.createElement("div");
    gong.classList.add("gong");
    gong.textContent=val;
    if(val===10) gong.classList.add("hit");
    gong.addEventListener("click",()=>{
      gongs[idx]=gongs[idx]===0?10:0;
      gong.textContent=gongs[idx];
      gong.classList.toggle("hit",gongs[idx]===10);
      gong.classList.add("click");
      setTimeout(()=>gong.classList.remove("click"),150);
      renderScoreTable();
    });
    gongContainer.appendChild(gong);
  });
}

// ==== SCORE TABLE ====
function renderScoreTable(){
  const thead=scoreTable.querySelector("thead tr");
  thead.innerHTML="<th>Tireur</th>"+SERIES.map(s=>`<th>${s.name}</th>`).join("")+"<th>% Touché</th>";
  const tbody=scoreTable.querySelector("tbody"); tbody.innerHTML="";
  tireurs.forEach(t=>{
    const tr=document.createElement("tr");
    const totalShots=SERIES.reduce((sum,s,i)=>sum+s.gongs,0);
    const totalHit=t.scores.flat().reduce((a,b)=>a+b>0?a+1:a,0);
    const pct=Math.round((totalHit/totalShots)*100);
    const pctClass=pct>=80?'green':pct>=50?'orange':'red';
    tr.innerHTML=`<td>${t.name}</td>`+
      t.scores.map(s=>`<td>${s.reduce((a,b)=>a+b,0)}</td>`).join("")+
      `<td class="${pctClass}">${pct}%</td>`;
    tbody.appendChild(tr);
  });
}

// ==== EXPORT PDF ====
function exportPDF(){
  if(tireurs.length===0) return alert("Aucun tireur à exporter !");
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF();
  doc.setFontSize(18);
  doc.text("Résultats du tir",105,15,null,null,"center");
  const headers=[["Tireur",...SERIES.map(s=>s.name),"Pct Touché"]];
  const data=tireurs.map(t=>{
    const totalShots=SERIES.reduce((sum,s,i)=>sum+s.gongs,0);
    const totalHit=t.scores.flat().reduce((a,b)=>a+b>0?a+1:a,0);
    const pct=Math.round((totalHit/totalShots)*100);
    return [t.name,...t.scores.map(s=>s.reduce((a,b)=>a+b,0)), pct+"%"];
  });
  doc.autoTable({head:headers,body:data,startY:25});
  doc.save("resultats_tir.pdf");
}

// ==== SERIES MANAGER ====
toggleSeriesManager.addEventListener("click",()=>{
  seriesManager.style.display=seriesManager.style.display==='none'?'block':'none';
  toggleSeriesManager.classList.add("click");
  setTimeout(()=>toggleSeriesManager.classList.remove("click"),150);
});
function renderSeriesManager(){
  seriesTableBody.innerHTML="";
  SERIES.forEach((s,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${s.name}</td>
      <td contenteditable="true">${s.gongs}</td>
      <td contenteditable="true">${s.time}</td>
      <td><button data-index="${i}">Supprimer</button></td>`;
    tr.querySelector("button").addEventListener("click",()=>{
      SERIES.splice(i,1);
      tireurs.forEach(t=>t.scores.splice(i,1));
      renderTabs(); renderScoreTable(); renderSeriesManager(); renderGongs();
    });
    tr.querySelectorAll("td[contenteditable]").forEach((td,j)=>{
      td.addEventListener("input",()=> {
        const val=parseInt(td.textContent)||1;
        if(j===0) SERIES[i].gongs=val;
        else SERIES[i].time=val;
        tireurs.forEach(t=>{ if(j===0) t.scores[i]=Array(val).fill(0); });
        renderGongs(); renderScoreTable();
      });
    });
    seriesTableBody.appendChild(tr);
  });
}
addSeriesBtn.addEventListener("click",()=>{
  SERIES.push({name:"Nouvelle Série", gongs:10, time:30});
  tireurs.forEach(t=>t.scores.push(Array(10).fill(0)));
  renderTabs(); renderSeriesManager(); renderScoreTable(); renderGongs();
});

// ==== EVENTS ====
addTireurBtn.addEventListener("click",()=>{ addTireur(); addClickEffect(addTireurBtn); });
tireurNameInput.addEventListener("keydown",e=>{if(e.key==="Enter"){ addTireur(); addClickEffect(addTireurBtn); }});
startBtn.addEventListener("click",()=>{ startTimer(); addClickEffect(startBtn); });
exportPdfBtn.addEventListener("click",()=>{ exportPDF(); addClickEffect(exportPdfBtn); });

// ==== NEON CLICK EFFECT ====
function addClickEffect(el){
  el.classList.add("click");
  setTimeout(()=>el.classList.remove("click"),150);
}
function enableNeonClick(){
  document.querySelectorAll(".gong, .start-btn, #add-tireur-btn, #export-pdf-btn, #toggle-series-manager, #add-series-btn").forEach(addClickEffect);
}
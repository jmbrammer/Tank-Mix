let autoRecalc = true;

/* ---------- Utilities ---------- */
const R = (v,d=2)=>Math.round(v*10**d)/10**d;
const toGallons = (v,u)=>{
  if(u==="gal") return v;
  if(u==="qt") return v/4;
  if(u==="floz") return v/128;
  return v;
};

/* ---------- DOM ---------- */
const acresEl=acres, gallonsEl=gallons, gpaEl=gpa;
const mixGalEl=mixGallons, loadAcEl=derivedAcres, modeEl=mode;
const rowsEl=rows, mixSelect=document.getElementById("mixSelect");
const autoBtn=document.getElementById("autoBtn");
const mixNameEl = document.getElementById("mixName");

/* ---------- Auto Recalc ---------- */
function toggleAutoRecalc(){
  autoRecalc=!autoRecalc;
  autoBtn.textContent=autoRecalc?"Auto‑Recalculate: ON":"Auto‑Recalculate: OFF";
  autoBtn.style.background=autoRecalc?"#2e7d32":"#c62828";
  autoBtn.style.color="#fff";
  if(autoRecalc) recalc();
}

/* ---------- Rows ---------- */
function addRow(d = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <input value="${d.name || ""}" oninput="autoRecalc && recalc()">
    </td>

    <td>
      <input value="${d.rate || ""}" oninput="autoRecalc && recalc()">
    </td>

    <td>
      <select onchange="autoRecalc && recalc()">
        ${["gal","qt","floz","oz","lbs"].map(u =>
          `<option ${u === d.unit ? "selected" : ""}>${u}</option>`
        ).join("")}
      </select>
    </td>

    <td>
      <select onchange="autoRecalc && recalc()">
        <option value="acre" ${d.basis === "acre" ? "selected" : ""}>acre</option>
        <option value="100" ${d.basis === "100" ? "selected" : ""}>100</option>
      </select>
    </td>

    <td>
      <select onchange="autoRecalc && recalc()">
        <option value=""></option>
        <option value="2.5" ${d.jug === "2.5" ? "selected" : ""}>2.5</option>
        <option value="1" ${d.jug === "1" ? "selected" : ""}>1</option>
      </select>
    </td>

    <td class="output"></td>
    <td class="output"></td>
  `;

  rowsEl.appendChild(tr);
}
function removeLastRow(){ if(rowsEl.lastElementChild) rowsEl.removeChild(rowsEl.lastElementChild); }

/* ---------- Core Recalc ---------- */
function recalc(){
  const acres=+acresEl.value||0, gallons=+gallonsEl.value||0, gpa=+gpaEl.value||0;
  if(acres&&gallons) return;
  const effAc=acres||((gallons&&gpa)?gallons/gpa:0);
  const mixGal=acres&&gpa?acres*gpa:gallons;

  mixGalEl.value=mixGal?R(mixGal):"";
  loadAcEl.value=effAc?R(effAc):"";
  modeEl.textContent=acres?"ACRES MODE":gallons?"GALLONS MODE":"";

  [...rowsEl.children].forEach(r=>{
    const rate=+r.cells[1].querySelector("input").value||0;
    const unit=r.cells[2].querySelector("select").value;
    const basis=r.cells[3].querySelector("select").value;
    const jug=r.cells[4].querySelector("select").value;
    const name=r.cells[0].querySelector("input").value.toLowerCase();

    if(!rate||!mixGal||!gpa){ r.cells[5].textContent=""; r.cells[6].innerHTML=""; return; }

    const base=basis==="acre"?rate*effAc:rate*(mixGal/100);
    const gal=toGallons(base,unit);
    r.cells[5].textContent=R(gal);

    if(unit==="lbs"&&name.includes("ams")){
      r.cells[6].textContent=R((gal/51)*2)/2+" bags";
    } else if(jug){
      let oz=gal*128, out=[];
      if(jug==="2.5"){ const j=Math.floor(oz/320); if(j){out.push(`${j} × 2.5g`); oz-=j*320;}}
      const j1=Math.floor(oz/128); if(j1){out.push(`${j1} × 1g`); oz-=j1*128;}
      if(Math.round(oz)) out.push(`${Math.round(oz)} floz`);
      r.cells[6].innerHTML=out.join("<br>");
    }
  });
}

/* ---------- Excel Import ---------- */
function importExcelFile(file){
  const r=new FileReader();
  r.onload=e=>{
    const wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});
    wb.SheetNames.forEach(name=>{
      const ws=wb.Sheets[name];
      let mix={
        mixName:name,
        gpa:ws.B2?.v, acresToMix:ws.B3?.v, gallonsToLoad:ws.B4?.v,
        ingredients:[]
      };
      for(let i=8; ws[`A${i}`]; i++){
        mix.ingredients.push({
          name:ws[`A${i}`].v, rate:ws[`B${i}`]?.v,
          unit:ws[`C${i}`]?.v, basis:ws[`D${i}`]?.v,
          jug:ws[`E${i}`]?.v
        });
      }
      saveMix(mix);
    });
    refreshMixList();
    if(mixSelect.options.length>0){ mixSelect.selectedIndex=0; loadSelectedMix(); }
    alert("Mixes loaded");
  };
  r.readAsArrayBuffer(file);
}

/* ---------- Local Saves ---------- */
function saveMix(m){
  let idx=JSON.parse(localStorage.getItem("mixIndex")||"[]");
  if(!idx.includes(m.mixName)) idx.push(m.mixName);
  localStorage.setItem("mixIndex",JSON.stringify(idx));
  localStorage.setItem("mix_"+m.mixName,JSON.stringify(m));
}
function refreshMixList(){
  mixSelect.innerHTML="";
  (JSON.parse(localStorage.getItem("mixIndex")||"[]")).forEach(n=>{
    let o=document.createElement("option"); o.value=n; o.textContent=n;
    mixSelect.appendChild(o);
  });
}
function loadSelectedMix() {
  const name = mixSelect.value;
  const m = JSON.parse(localStorage.getItem("mix_" + name));
  if (!m) return;

  // Set name
  mixNameEl.value = m.mixName;

  // Load inputs
  gpaEl.value = m.gpa || "";
  acresEl.value = m.acresToMix || "";
  gallonsEl.value = m.gallonsToLoad || "";

  // Load ingredients
  rowsEl.innerHTML = "";
  m.ingredients.forEach(addRow);

  recalc();
}
function saveCurrentMix() {
  const name = mixNameEl.value.trim();
  if (!name) {
    alert("Please enter a mix name.");
    return;
  }

  const mix = {
    mixName: name,
    gpa: gpaEl.value,
    acresToMix: acresEl.value,
    gallonsToLoad: gallonsEl.value,
    ingredients: [...rowsEl.children].map(r => ({
      name: r.cells[0].querySelector("input").value,
      rate: r.cells[1].querySelector("input").value,
      unit: r.cells[2].querySelector("select").value,
      basis: r.cells[3].querySelector("select").value,
      jug: r.cells[4].querySelector("select").value
    }))
  };

  saveMix(mix);
  refreshMixList();

  // Select the saved mix
  mixSelect.value = name;

  alert("Mix saved");
}function deleteMix(){
  const n=mixSelect.value;
  localStorage.removeItem("mix_"+n);
  let idx=JSON.parse(localStorage.getItem("mixIndex")||"[]").filter(x=>x!==n);
  localStorage.setItem("mixIndex",JSON.stringify(idx));
  refreshMixList();
}
function newMix() {
  // Clear inputs
  acresEl.value = "";
  gallonsEl.value = "";
  gpaEl.value = "";

  // Clear rows
  rowsEl.innerHTML = "";
  addRow();

  // Clear selection
  mixSelect.selectedIndex = -1;

  // Clear name and focus
  mixNameEl.value = "";
  mixNameEl.focus();

  recalc();
}
/* ---------- Init ---------- */
toggleAutoRecalc(); addRow(); refreshMixList();
mixSelect.onchange=loadSelectedMix;
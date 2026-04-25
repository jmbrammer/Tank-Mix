let autoRecalc = true;

/* ---------- Utilities ---------- */
const R = (v,d=2) => Math.round(v * 10**d) / 10**d;
const toGallons = (v,u) => {
  if (u === "gal") return v;
  if (u === "qt") return v / 4;
  if (u === "floz") return v / 128;
  return v; // oz / lbs handled separately
};

/* ---------- DOM ---------- */
const acresEl = acres;
const gallonsEl = gallons;
const gpaEl = gpa;
const mixGallonsEl = mixGallons;
const derivedAcresEl = derivedAcres;
const modeEl = mode;
const rowsEl = rows;
const mixSelect = document.getElementById("mixSelect");
const mixNameEl = document.getElementById("mixName");
const autoBtn = document.getElementById("autoBtn");

/* ---------- Auto Recalc ---------- */
function toggleAutoRecalc() {
  autoRecalc = !autoRecalc;
  autoBtn.textContent = autoRecalc
    ? "Auto‑Recalculate: ON"
    : "Auto‑Recalculate: OFF";
  autoBtn.style.background = autoRecalc ? "#2e7d32" : "#c62828";
  autoBtn.style.color = "#fff";
  if (autoRecalc) recalc();
}

/* ---------- Rows ---------- */
function addRow(d = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input value="${d.name || ""}" oninput="autoRecalc && recalc()"></td>
    <td><input value="${d.rate || ""}" oninput="autoRecalc && recalc()"></td>
    <td>
      <select onchange="autoRecalc && recalc()">
        ${["gal","qt","floz","oz","lbs"].map(u =>
          `<option ${u===d.unit?"selected":""}>${u}</option>`
        ).join("")}
      </select>
    </td>
    <td>
      <select onchange="autoRecalc && recalc()">
        <option value="acre" ${d.basis==="acre"?"selected":""}>acre</option>
        <option value="100" ${d.basis==="100"?"selected":""}>100</option>
      </select>
    </td>
    <td>
      <select onchange="autoRecalc && recalc()">
        <option value=""></option>
        <option value="2.5" ${d.jug==="2.5"?"selected":""}>2.5</option>
        <option value="1" ${d.jug==="1"?"selected":""}>1</option>
      </select>
    </td>
    <td class="output"></td>
    <td class="output"></td>
  `;

  rowsEl.appendChild(tr);
}

function removeLastRow() {
  if (rowsEl.lastElementChild) rowsEl.removeChild(rowsEl.lastElementChild);
}

/* ---------- Recalc ---------- */
function recalc() {
  const acres = +acresEl.value || 0;
  const gallons = +gallonsEl.value || 0;
  const gpa = +gpaEl.value || 0;

  if (acres && gallons) return;

  const effAc = acres || (gallons && gpa ? gallons / gpa : 0);
  const mixGal = acres && gpa ? acres * gpa : gallons;

  derivedAcresEl.value = effAc ? R(effAc) : "";
  mixGallonsEl.value = mixGal ? R(mixGal) : "";
  modeEl.textContent = acres ? "ACRES MODE" : gallons ? "GALLONS MODE" : "";

  [...rowsEl.children].forEach(r => {
    const name = r.cells[0].querySelector("input").value.toLowerCase();
    const rate = +r.cells[1].querySelector("input").value || 0;
    const unit = r.cells[2].querySelector("select").value;
    const basis = r.cells[3].querySelector("select").value;
    const jug = r.cells[4].querySelector("select").value;

    if (!rate || !gpa || !mixGal) {
      r.cells[5].textContent = "";
      r.cells[6].innerHTML = "";
      return;
    }

    const base = basis === "acre"
      ? rate * effAc
      : rate * (mixGal / 100);

    const gal = toGallons(base, unit);
    r.cells[5].textContent = R(gal);

    if (unit === "lbs" && name.includes("ams")) {
      r.cells[6].textContent = `${R((gal/51)*2)/2} bags`;
    } else if (jug) {
      let oz = gal * 128, out=[];
      if (jug === "2.5") {
        const j = Math.floor(oz / 320);
        if (j) { out.push(`${j} × 2.5g`); oz -= j * 320; }
      }
      const j1 = Math.floor(oz / 128);
      if (j1) { out.push(`${j1} × 1g`); oz -= j1 * 128; }
      if (Math.round(oz)) out.push(`${Math.round(oz)} floz`);
      r.cells[6].innerHTML = out.join("<br>");
    }
  });
}

/* ---------- Excel Import ---------- */
function importExcelFile(file) {
  const r = new FileReader();
  r.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });

    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name];
      let mix = {
        mixName: name,
        gpa: ws.B2?.v,
        acresToMix: ws.B3?.v,
        gallonsToLoad: ws.B4?.v,
        ingredients: []
      };

      for (let i = 8; ws[`A${i}`]; i++) {
        mix.ingredients.push({
          name: ws[`A${i}`].v,
          rate: ws[`B${i}`]?.v,
          unit: ws[`C${i}`]?.v,
          basis: ws[`D${i}`]?.v,
          jug: ws[`E${i}`]?.v
        });
      }

      saveMix(mix);
    });

    refreshMixList();

    if (mixSelect.options.length > 0) {
      mixSelect.selectedIndex = 0;
      loadSelectedMix();
    }

    alert("Mixes loaded");
  };
  r.readAsArrayBuffer(file);
}

/* ---------- Local Storage ---------- */
function saveMix(m) {
  let idx = JSON.parse(localStorage.getItem("mixIndex") || "[]");
  if (!idx.includes(m.mixName)) idx.push(m.mixName);
  localStorage.setItem("mixIndex", JSON.stringify(idx));
  localStorage.setItem("mix_" + m.mixName, JSON.stringify(m));
}

function refreshMixList() {
  mixSelect.innerHTML = "";
  (JSON.parse(localStorage.getItem("mixIndex") || "[]"))
    .forEach(n => {
      const o = document.createElement("option");
      o.value = n;
      o.textContent = n;
      mixSelect.appendChild(o);
    });
}

function loadSelectedMix() {
  const name = mixSelect.value;
  const m = JSON.parse(localStorage.getItem("mix_" + name));
  if (!m) return;

  mixNameEl.value = m.mixName;
  gpaEl.value = m.gpa || "";
  acresEl.value = m.acresToMix || "";
  gallonsEl.value = m.gallonsToLoad || "";

  rowsEl.innerHTML = "";
  m.ingredients.forEach(addRow);
  recalc();

  localStorage.setItem("lastMix", name);
}

function saveCurrentMix() {
  const name = mixNameEl.value.trim();
  if (!name) return alert("Enter a mix name.");

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
  mixSelect.value = name;
  loadSelectedMix();
  alert("Mix saved");
}

function deleteMix() {
  const name = mixSelect.value;
  if (!name) return;
  localStorage.removeItem("mix_" + name);
  let idx = JSON.parse(localStorage.getItem("mixIndex") || "[]")
    .filter(x => x !== name);
  localStorage.setItem("mixIndex", JSON.stringify(idx));
  refreshMixList();
  newMix();
}

function newMix() {
  acresEl.value = "";
  gallonsEl.value = "";
  gpaEl.value = "";
  mixNameEl.value = "";
  rowsEl.innerHTML = "";
  addRow();
  recalc();
}

/* ---------- Init ---------- */
toggleAutoRecalc();
addRow();
refreshMixList();
mixSelect.onchange = loadSelectedMix;

const last = localStorage.getItem("lastMix");
if (last && [...mixSelect.options].some(o => o.value === last)) {
  mixSelect.value = last;
  loadSelectedMix();
} else if (mixSelect.options.length > 0) {
  mixSelect.selectedIndex = 0;
  loadSelectedMix();
}
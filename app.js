let autoRecalc = true;

/* ---------- Helpers ---------- */
function round(v, d = 2) {
  return Math.round(v * 10 ** d) / 10 ** d;
}

/* Liquid normalization to gallons */
function normalizeToGallons(value, unit) {
  if (unit === "fl oz") return value / 128;
  if (unit === "qt") return value / 4;
  if (unit === "gal") return value;
  return value; // dry units: oz, lbs
}

/* ---------- Mode ---------- */
function resolveMode(acres, gallons) {
  if (acres > 0) return "ACRES MODE";
  if (gallons > 0) return "GALLONS MODE";
  return "";
}

function getDerivedAcres(acres, gallons, gpa) {
  if (acres > 0) return acres;
  if (gallons > 0 && gpa > 0) return gallons / gpa;
  return 0;
}

function getMixGallons(acres, gallons, gpa) {
  if (acres > 0) return acres * gpa;
  if (gallons > 0) return gallons;
  return 0;
}

/* ---------- AMS ---------- */
function amsBags(lbs) {
  return Math.round((lbs / 51) * 2) / 2;
}

/* ---------- Jug Cascade ---------- */
function cascadeJugs(gallons, start) {
  let flOz = gallons * 128;
  const out = [];

  if (start === 2.5) {
    const j = Math.floor(flOz / 320);
    if (j) { out.push(`${j} × 2.5g`); flOz -= j * 320; }
  }

  const j1 = Math.floor(flOz / 128);
  if (j1) { out.push(`${j1} × 1g`); flOz -= j1 * 128; }

  flOz = Math.round(flOz);
  if (flOz) out.push(`${flOz} fl oz`);

  return out.join("<br>");
}

/* ---------- DOM ---------- */
const acresEl = acres;
const gallonsEl = gallons;
const gpaEl = gpa;
const modeEl = mode;
const mixGallonsEl = mixGallons;
const derivedAcresEl = derivedAcres;
const rowsEl = rows;
const mixSelect = document.getElementById("mixSelect");
const sheetUrlEl = document.getElementById("sheetUrl");
const autoBtn = document.getElementById("autoBtn");

/* ---------- Auto Recalc ---------- */
function toggleAutoRecalc() {
  autoRecalc = !autoRecalc;
  autoBtn.textContent = autoRecalc ? "Auto‑Recalculate: ON" : "Auto‑Recalculate: OFF";
  autoBtn.style.background = autoRecalc ? "#2e7d32" : "#c62828";
  autoBtn.style.color = "#fff";
  if (autoRecalc) recalc();
}

/* ---------- Rows ---------- */
function addRow(data = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input value="${data.name||""}" oninput="if(autoRecalc) recalc()"></td>
    <td><input type="number" step="0.01" value="${data.rate||""}" oninput="if(autoRecalc) recalc()"></td>
    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option ${data.unit==="gal"?"selected":""}>gal</option>
        <option ${data.unit==="qt"?"selected":""}>qt</option>
        <option ${data.unit==="fl oz"?"selected":""}>fl oz</option>
        <option ${data.unit==="oz"?"selected":""}>oz</option>
        <option ${data.unit==="lbs"?"selected":""}>lbs</option>
      </select>
    </td>
    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option value="acre" ${data.basis==="acre"?"selected":""}>per acre</option>
        <option value="100" ${data.basis==="100"?"selected":""}>per 100 gal</option>
      </select>
    </td>
    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option value="">none</option>
        <option value="2.5" ${data.jug==="2.5"?"selected":""}>2.5 gal</option>
        <option value="1" ${data.jug==="1"?"selected":""}>1 gal</option>
      </select>
    </td>
    <td class="output"></td>
    <td class="output"></td>
  `;
  rowsEl.appendChild(tr);
}

function removeLastRow() {
  if (rowsEl.children.length) rowsEl.removeChild(rowsEl.lastElementChild);
  if (autoRecalc) recalc();
}

/* ---------- Recalc ---------- */
function recalc() {
  const acres = +acresEl.value;
  const gallons = +gallonsEl.value;
  const gpa = +gpaEl.value;

  acresEl.disabled = gallons > 0;
  gallonsEl.disabled = acres > 0;

  const derived = getDerivedAcres(acres, gallons, gpa);
  const mixGal = getMixGallons(acres, gallons, gpa);

  derivedAcresEl.value = derived ? round(derived) : "";
  mixGallonsEl.value = mixGal ? round(mixGal) : "";
  modeEl.textContent = resolveMode(acres, gallons);

  [...rowsEl.children].forEach(row => {
    const name = row.children[0].querySelector("input").value.toLowerCase();
    const rate = +row.children[1].querySelector("input").value;
    const unit = row.children[2].querySelector("select").value;
    const basis = row.children[3].querySelector("select").value;
    const jug = row.children[4].querySelector("select").value;

    if (!rate || !gpa || !mixGal) {
      row.children[5].textContent = "";
      row.children[6].innerHTML = "";
      return;
    }

    const base = basis === "acre"
      ? rate * derived
      : rate * (mixGal / 100);

    const amt = normalizeToGallons(base, unit);
    row.children[5].textContent = round(amt);

    if (unit === "lbs" && name.includes("ams")) {
      row.children[6].textContent = `${amsBags(amt)} bags`;
    } else if (jug && unit !== "lbs") {
      row.children[6].innerHTML = cascadeJugs(amt, parseFloat(jug));
    } else {
      row.children[6].innerHTML = "";
    }
  });
}

/* ---------- Google Sheet Sync ---------- */
async function syncFromSheet() {
  const url = sheetUrlEl.value.trim();
  if (!url) { alert("Enter a Google Sheet URL first"); return; }

  localStorage.setItem("sheetUrl", url);

  const res = await fetch(url);
  const data = await res.json();

  const index = [];
  data.mixes.forEach(m => {
    localStorage.setItem("mix_" + m.mixId, JSON.stringify(m));
    index.push({ mixId: m.mixId, mixName: m.mixName });
  });

  localStorage.setItem("mixIndex", JSON.stringify(index));
  refreshMixList();
  alert(`Imported ${index.length} mixes`);
}

function refreshMixList() {
  mixSelect.innerHTML = "";
  const index = JSON.parse(localStorage.getItem("mixIndex")||"[]");
  index.forEach(m => {
    const o = document.createElement("option");
    o.value = m.mixId;
    o.textContent = m.mixName;
    mixSelect.appendChild(o);
  });
}

function deleteMix() {
  const id = mixSelect.value;
  if (!id) return;
  localStorage.removeItem("mix_" + id);
  localStorage.setItem(
    "mixIndex",
    JSON.stringify(JSON.parse(localStorage.getItem("mixIndex")||"[]")
      .filter(m => m.mixId !== id))
  );
  refreshMixList();
}

mixSelect.onchange = () => {
  const m = JSON.parse(localStorage.getItem("mix_" + mixSelect.value));
  if (!m) return;

  gpaEl.value = m.gpa || "";
  acresEl.value = m.acresToMix || "";
  gallonsEl.value = m.gallonsToLoad || "";

  rowsEl.innerHTML = "";
  m.ingredients.forEach(addRow);
  recalc();
};

/* ---------- Init ---------- */
sheetUrlEl.value = localStorage.getItem("sheetUrl") || "";
toggleAutoRecalc();
addRow();
refreshMixList();
recalc();
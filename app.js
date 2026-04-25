let autoRecalc = true;

/* ---------- Utilities ---------- */
function round(v, d = 2) {
  return Math.round(v * 10 ** d) / 10 ** d;
}

function normalizeToGallons(value, unit) {
  if (unit === "gal") return value;
  if (unit === "qt") return value / 4;
  if (unit === "floz") return value / 128;
  return value; // oz, lbs
}

/* ---------- Mode ---------- */
function resolveMode(acres, gallons) {
  if (acres > 0) return "ACRES MODE";
  if (gallons > 0) return "GALLONS MODE";
  return "";
}

function derivedAcres(acres, gallons, gpa) {
  if (acres > 0) return acres;
  if (gallons > 0 && gpa > 0) return gallons / gpa;
  return 0;
}

function mixGallons(acres, gallons, gpa) {
  if (acres > 0) return acres * gpa;
  if (gallons > 0) return gallons;
  return 0;
}

/* ---------- AMS ---------- */
function amsBags(lbs) {
  return Math.round((lbs / 51) * 2) / 2;
}

/* ---------- Jug cascade ---------- */
function cascadeJugs(gal, start) {
  let floz = gal * 128;
  const out = [];

  if (start === 2.5) {
    const j = Math.floor(floz / 320);
    if (j) { out.push(`${j} × 2.5g`); floz -= j * 320; }
  }

  const j1 = Math.floor(floz / 128);
  if (j1) { out.push(`${j1} × 1g`); floz -= j1 * 128; }

  floz = Math.round(floz);
  if (floz) out.push(`${floz} floz`);

  return out.join("<br>");
}

/* ---------- DOM ---------- */
const acresEl = document.getElementById("acres");
const gallonsEl = document.getElementById("gallons");
const gpaEl = document.getElementById("gpa");
const mixGallonsEl = document.getElementById("mixGallons");
const derivedAcresEl = document.getElementById("derivedAcres");
const modeEl = document.getElementById("mode");
const rowsEl = document.getElementById("rows");
const mixSelect = document.getElementById("mixSelect");
const autoBtn = document.getElementById("autoBtn");

/* ---------- Auto recalc ---------- */
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
    <td><input type="number" value="${data.rate||""}" oninput="if(autoRecalc) recalc()"></td>
    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option ${data.unit==="gal"?"selected":""}>gal</option>
        <option ${data.unit==="qt"?"selected":""}>qt</option>
        <option ${data.unit==="floz"?"selected":""}>floz</option>
        <option ${data.unit==="oz"?"selected":""}>oz</option>
        <option ${data.unit==="lbs"?"selected":""}>lbs</option>
      </select>
    </td>
    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option value="acre" ${data.basis==="acre"?"selected":""}>acre</option>
        <option value="100" ${data.basis==="100"?"selected":""}>100</option>
      </select>
    </td>
    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option value="">none</option>
        <option value="2.5" ${data.jug==="2.5"?"selected":""}>2.5</option>
        <option value="1" ${data.jug==="1"?"selected":""}>1</option>
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

  const a = derivedAcres(acres, gallons, gpa);
  const g = mixGallons(acres, gallons, gpa);

  derivedAcresEl.value = a ? round(a) : "";
  mixGallonsEl.value = g ? round(g) : "";
  modeEl.textContent = resolveMode(acres, gallons);

  [...rowsEl.children].forEach(r => {
    const name = r.children[0].querySelector("input").value.toLowerCase();
    const rate = +r.children[1].querySelector("input").value;
    const unit = r.children[2].querySelector("select").value;
    const basis = r.children[3].querySelector("select").value;
    const jug = r.children[4].querySelector("select").value;

    if (!rate || !gpa || !g) {
      r.children[5].textContent = "";
      r.children[6].innerHTML = "";
      return;
    }

    const base = basis === "acre" ? rate * a : rate * (g / 100);
    const gal = normalizeToGallons(base, unit);

    r.children[5].textContent = round(gal);

    if (unit === "lbs" && name.includes("ams")) {
      r.children[6].textContent = `${amsBags(gal)} bags`;
    } else if (jug && unit !== "lbs") {
      r.children[6].innerHTML = cascadeJugs(gal, parseFloat(jug));
    }
  });
}

/* ---------- Excel Import ---------- */
function importExcelFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });

    wb.SheetNames.forEach(name => {
      const ws = wb.Sheets[name];

      const mix = {
        mixName: name,
        gpa: cell(ws,"B2"),
        acresToMix: cell(ws,"B3"),
        gallonsToLoad: cell(ws,"B4"),
        ingredients: []
      };

      let r = 7;
      while (cell(ws,`A${r}`)) {
        mix.ingredients.push({
          name: cell(ws,`A${r}`),
          rate: cell(ws,`B${r}`),
          unit: cell(ws,`C${r}`),
          basis: cell(ws,`D${r}`),
          jug: cell(ws,`E${r}`)
        });
        r++;
      }

      saveMix(mix);
    });

    refreshMixList();
    alert("Mixes imported");
  };
  reader.readAsArrayBuffer(file);
}

function cell(ws, addr) {
  return ws[addr]?.v || "";
}

/* ---------- Local Storage ---------- */
function saveMix(mix) {
  let index = JSON.parse(localStorage.getItem("mixIndex") || "[]");
  if (!index.includes(mix.mixName)) index.push(mix.mixName);
  localStorage.setItem("mixIndex", JSON.stringify(index));
  localStorage.setItem("mix_" + mix.mixName, JSON.stringify(mix));
}

function refreshMixList() {
  mixSelect.innerHTML = "";
  const index = JSON.parse(localStorage.getItem("mixIndex") || "[]");
  index.forEach(n => {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    mixSelect.appendChild(o);
  });
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

function deleteMix() {
  const name = mixSelect.value;
  let index = JSON.parse(localStorage.getItem("mixIndex") || "[]")
    .filter(n => n !== name);
  localStorage.setItem("mixIndex", JSON.stringify(index));
  localStorage.removeItem("mix_" + name);
  refreshMixList();
}

/* ---------- Init ---------- */
toggleAutoRecalc();
addRow();
refreshMixList();
recalc();
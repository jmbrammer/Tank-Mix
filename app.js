/* =========================================================
   GLOBAL STATE
========================================================= */
let autoRecalc = true;

/* =========================================================
   UTILITY
========================================================= */
function round(v, d = 2) {
  return Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
}

/* =========================================================
   MODE & DERIVED VALUES
========================================================= */
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

function getGallonsOfMix(acres, gallons, gpa) {
  if (acres > 0) return acres * gpa;
  if (gallons > 0) return gallons;
  return 0;
}

/* =========================================================
   CORE RATE CALCULATION
========================================================= */
function calculateAmount({ rate, unit, basis, acres, gallons }) {
  let base;

  if (basis === "acre") {
    base = rate * acres;
  } else {
    base = (gallons / 100) * rate;
  }

  // liquid fl oz → gallons
  if (unit === "fl oz") {
    return round(base / 128);
  }

  return round(base);
}

/* =========================================================
   AMS (51-lb bags, half increments)
========================================================= */
function amsBags(lbs) {
  return Math.round((lbs / 51) * 2) / 2;
}

/* =========================================================
   CASCADING JUG LOGIC
   startSize = 2.5 or 1
========================================================= */
function cascadeJugs(gallons, startSize) {
  let flOz = gallons * 128;
  const lines = [];

  // 2.5 gal jugs (320 fl oz)
  if (startSize === 2.5) {
    const j25 = Math.floor(flOz / 320);
    if (j25 > 0) {
      lines.push(`${j25} × 2.5g`);
      flOz -= j25 * 320;
    }
  }

  // 1 gal jugs (128 fl oz)
  const j1 = Math.floor(flOz / 128);
  if (j1 > 0) {
    lines.push(`${j1} × 1g`);
    flOz -= j1 * 128;
  }

  // remainder fl oz
  flOz = Math.round(flOz);
  if (flOz > 0) {
    lines.push(`${flOz} fl oz`);
  }

  return lines.join("<br>");
}

/* =========================================================
   DOM REFERENCES
========================================================= */
const acresEl = document.getElementById("acres");
const gallonsEl = document.getElementById("gallons");
const gpaEl = document.getElementById("gpa");

const modeEl = document.getElementById("mode");
const mixGallonsEl = document.getElementById("mixGallons");
const derivedAcresEl = document.getElementById("derivedAcres");

const rowsEl = document.getElementById("rows");
const mixSelect = document.getElementById("mixSelect");
const mixNameEl = document.getElementById("mixName");
const autoBtn = document.getElementById("autoBtn");

/* =========================================================
   AUTO RECALC TOGGLE
========================================================= */
function updateAutoBtn() {
  if (autoRecalc) {
    autoBtn.style.background = "#2e7d32"; // green
    autoBtn.style.color = "#fff";
    autoBtn.textContent = "Auto-Recalculate: ON";
  } else {
    autoBtn.style.background = "#c62828"; // red
    autoBtn.style.color = "#fff";
    autoBtn.textContent = "Auto-Recalculate: OFF";
  }
}

function toggleAutoRecalc() {
  autoRecalc = !autoRecalc;
  updateAutoBtn();
  if (autoRecalc) recalc();
}

/* =========================================================
   ROW MANAGEMENT
========================================================= */
function addRow(data = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input value="${data.name || ""}" oninput="if(autoRecalc) recalc()"></td>

    <td><input type="number" step="0.01"
               value="${data.rate || ""}"
               oninput="if(autoRecalc) recalc()"></td>

    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option ${data.unit === "fl oz" ? "selected" : ""}>fl oz</option>
        <option ${data.unit === "oz" ? "selected" : ""}>oz</option>
        <option ${data.unit === "lbs" ? "selected" : ""}>lbs</option>
        <option ${data.unit === "gal" ? "selected" : ""}>gal</option>
      </select>
    </td>

    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option value="acre" ${data.basis === "acre" ? "selected" : ""}>per acre</option>
        <option value="100" ${data.basis === "100" ? "selected" : ""}>per 100 gal</option>
      </select>
    </td>

    <td>
      <select onchange="if(autoRecalc) recalc()">
        <option value="">none</option>
        <option value="2.5" ${data.jug === "2.5" ? "selected" : ""}>2.5 gal</option>
        <option value="1" ${data.jug === "1" ? "selected" : ""}>1 gal</option>
      </select>
    </td>

    <td class="output"></td>
    <td class="output"></td>
  `;

  rowsEl.appendChild(tr);
}

/* =========================================================
   MAIN RECALC
========================================================= */
function recalc() {
  const inputAcres = +acresEl.value;
  const inputGallons = +gallonsEl.value;
  const gpa = +gpaEl.value;

  // soft lock
  acresEl.disabled = inputGallons > 0;
  gallonsEl.disabled = inputAcres > 0;

  const derivedAcres = getDerivedAcres(inputAcres, inputGallons, gpa);
  const mixGallons = getGallonsOfMix(inputAcres, inputGallons, gpa);

  modeEl.textContent = resolveMode(inputAcres, inputGallons);
  mixGallonsEl.value = mixGallons ? round(mixGallons) : "";
  derivedAcresEl.value = derivedAcres ? round(derivedAcres) : "";

  [...rowsEl.children].forEach(row => {
    const name = row.children[0].querySelector("input").value.toLowerCase();
    const rate = +row.children[1].querySelector("input").value;
    const unit = row.children[2].querySelector("select").value;
    const basis = row.children[3].querySelector("select").value;
    const jug = row.children[4].querySelector("select").value;

    if (!rate || !mixGallons || !gpa) {
      row.children[5].textContent = "";
      row.children[6].innerHTML = "";
      return;
    }

    const amount = calculateAmount({
      rate,
      unit,
      basis,
      acres: derivedAcres,
      gallons: mixGallons
    });

    row.children[5].textContent = amount;

    // AMS handling
    if (unit === "lbs" && name.includes("ams")) {
      row.children[6].textContent = `${amsBags(amount)} bags`;
      return;
    }

    // cascading jug logic (liquid only)
    if (jug && unit === "fl oz") {
      row.children[6].innerHTML = cascadeJugs(
        amount,
        parseFloat(jug)
      );
    } else {
      row.children[6].innerHTML = "";
    }
  });
}

/* =========================================================
   SAVE / LOAD MIXES
========================================================= */
function refreshMixList() {
  mixSelect.innerHTML = "";
  Object.keys(localStorage)
    .filter(k => k.startsWith("mix_"))
    .forEach(k => {
      const opt = document.createElement("option");
      opt.textContent = k.replace("mix_", "");
      mixSelect.appendChild(opt);
    });
}

function saveMix() {
  const name = mixNameEl.value || mixSelect.value;
  if (!name) return;

  const rows = [...rowsEl.children].map(r => ({
    name: r.children[0].querySelector("input").value,
    rate: r.children[1].querySelector("input").value,
    unit: r.children[2].querySelector("select").value,
    basis: r.children[3].querySelector("select").value,
    jug: r.children[4].querySelector("select").value
  }));

  localStorage.setItem("mix_" + name, JSON.stringify(rows));
  refreshMixList();
}

function deleteMix() {
  if (!mixSelect.value) return;
  localStorage.removeItem("mix_" + mixSelect.value);
  refreshMixList();
}

mixSelect.addEventListener("change", () => {
  const data = JSON.parse(localStorage.getItem("mix_" + mixSelect.value));
  rowsEl.innerHTML = "";
  data.forEach(addRow);
  recalc();
});

/* =========================================================
   EVENTS
========================================================= */
[acresEl, gallonsEl, gpaEl].forEach(el =>
  el.addEventListener("input", recalc)
);

/* =========================================================
   INIT
========================================================= */
updateAutoBtn();
addRow();
refreshMixList();
recalc();


function exportCSV() {
  let csv = "Name,Rate,Unit,Basis,Jug\n";

  [...rowsEl.children].forEach(r => {
    const vals = [
      r.children[0].querySelector("input").value,
      r.children[1].querySelector("input").value,
      r.children[2].querySelector("select").value,
      r.children[3].querySelector("select").value,
      r.children[4].querySelector("select").value
    ];
    csv += vals.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tank-mix.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split("\n").slice(1);
    rowsEl.innerHTML = "";

    lines.forEach(line => {
      if (!line.trim()) return;
      const [name, rate, unit, basis, jug] = line.split(",");
      addRow({ name, rate, unit, basis, jug });
    });

    recalc();
  };
  reader.readAsText(file);
}
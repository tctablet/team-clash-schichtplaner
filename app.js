// ===== Team Data =====
const TEAM = [
  { name: "Sascha", role: "Head of Ops", code: "2847" },
  { name: "Alexa", role: "Teilzeit", code: "5931" },
  { name: "Quynh", role: "Teilzeit", code: "3614" },
  { name: "Vanessa", role: "Werkstudent", code: "7258" },
  { name: "Hannah", role: "Werkstudent", code: "4162" },
  { name: "Anvi", role: "Minijob", code: "8493" },
  { name: "Favour", role: "Minijob", code: "6725" },
  { name: "Jasmin", role: "Minijob", code: "1376" },
  { name: "Hamed", role: "Support", code: "9041" },
  { name: "Rehan", role: "Support", code: "3587" },
];
const ADMIN_CODE = "0800";

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const SLIDER_MIN = 8.5; // 08:30
const SLIDER_MAX = 24; // 00:00
const SLIDER_DEFAULT = [8.5, 24]; // 08:30 - 00:00
const STORAGE_KEY = "tc_availability";
const GAS_URL = "https://script.google.com/macros/s/AKfycbzo49x_AiRLe_kX0lO56KgeyHGFNoBTAQusLOgZSoNT5CpAHkdThe_T2AUNJxMFR-1p/exec";
const DAY_MAP = { montag: "Mo", dienstag: "Di", mittwoch: "Mi", donnerstag: "Do", freitag: "Fr", samstag: "Sa", sonntag: "So" };

// Default general availability per team member (from team_overview)
const GENERAL_DEFAULTS = {
  "Sascha":  { Mo: "Voll", Di: "Voll", Mi: "Voll", Do: "Voll", Fr: "Voll", Sa: "Voll", So: "Voll" },
  "Alexa":   { Mo: "Voll", Di: "Voll", Mi: "Voll", Do: "Voll", Fr: "Voll", Sa: "Voll", So: "Voll" },
  "Quynh":   { Mo: "Nicht", Di: "Nicht", Mi: "11:30-00:00", Do: "Voll", Fr: "Voll", Sa: "Voll", So: "Voll" },
  "Vanessa": { Mo: "Voll", Di: "Voll", Mi: "08:30-17:00", Do: "Voll", Fr: "Voll", Sa: "Voll", So: "Voll" },
  "Hannah":  { Mo: "Voll", Di: "Voll", Mi: "Voll", Do: "Voll", Fr: "Voll", Sa: "Voll", So: "Voll" },
  "Anvi":    { Mo: "19:00-00:00", Di: "15:00-00:00", Mi: "15:00-00:00", Do: "15:00-00:00", Fr: "Voll", Sa: "Voll", So: "Voll" },
  "Favour":  { Mo: "14:00-00:00", Di: "14:00-00:00", Mi: "14:00-00:00", Do: "14:00-00:00", Fr: "14:00-00:00", Sa: "14:00-00:00", So: "14:00-00:00" },
  "Jasmin":  { Mo: "Voll", Di: "Voll", Mi: "Voll", Do: "Voll", Fr: "Voll", Sa: "Voll", So: "Voll" },
  "Hamed":   { Mo: "14:00-00:00", Di: "14:00-00:00", Mi: "14:00-00:00", Do: "14:00-00:00", Fr: "14:00-00:00", Sa: "Voll", So: "Voll" },
  "Rehan":   { Mo: "17:00-00:00", Di: "14:00-00:00", Mi: "14:00-00:00", Do: "14:00-00:00", Fr: "Voll", Sa: "Voll", So: "Voll" },
};

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// ===== State =====
let currentStep = 1;
let selectedModerator = null;
let selectedKW = null;
let selectedYear = null;
let weeklySliders = {};
let generalSliders = {};
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  initPinEntry();
  renderCalendar();
  bindNavigation();
});

// ===== PIN Entry =====
function initPinEntry() {
  const digits = document.querySelectorAll(".pin-digit");
  const feedback = document.getElementById("pin-feedback");

  digits.forEach((input, i) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);
      if (input.value && i < 3) digits[i + 1].focus();
      checkPin();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && i > 0) {
        digits[i - 1].focus();
        digits[i - 1].value = "";
      }
    });
    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 4);
      text.split("").forEach((ch, j) => { if (digits[j]) digits[j].value = ch; });
      if (text.length >= 4) checkPin();
      else if (digits[text.length]) digits[text.length].focus();
    });
  });

  // Auto-focus first field
  setTimeout(() => digits[0].focus(), 200);
}

function resetPin() {
  const digits = document.querySelectorAll(".pin-digit");
  digits.forEach((d) => { d.value = ""; });
  document.getElementById("pin-feedback").innerHTML = "";
  document.getElementById("pin-feedback").className = "pin-feedback";
  setTimeout(() => digits[0].focus(), 200);
}

function checkPin() {
  const digits = document.querySelectorAll(".pin-digit");
  const code = Array.from(digits).map((d) => d.value).join("");
  const feedback = document.getElementById("pin-feedback");
  if (code.length < 4) return;

  // Check admin code
  if (code === ADMIN_CODE) {
    feedback.innerHTML = "Admin-Modus";
    feedback.className = "pin-feedback pin-success";
    digits.forEach((d) => d.classList.add("pin-ok"));
    setTimeout(() => {
      digits.forEach((d) => d.classList.remove("pin-ok"));
      showAdminPanel();
    }, 600);
    return;
  }

  // Check team codes
  const member = TEAM.find((m) => m.code === code);
  if (member) {
    selectedModerator = member.name;
    document.getElementById("selected-mod-name").textContent = selectedModerator;
    document.getElementById("selected-mod-name-2").textContent = selectedModerator;
    feedback.innerHTML = `Hallo, <strong>${member.name}</strong>!`;
    feedback.className = "pin-feedback pin-success";
    digits.forEach((d) => d.classList.add("pin-ok"));
    setTimeout(() => {
      digits.forEach((d) => d.classList.remove("pin-ok"));
      showStep(2);
    }, 800);
    return;
  }

  // Invalid
  feedback.innerHTML = "Ungültiger Code";
  feedback.className = "pin-feedback pin-error";
  const fields = document.getElementById("pin-fields");
  fields.classList.add("shake");
  setTimeout(() => {
    fields.classList.remove("shake");
    digits.forEach((d) => { d.value = ""; });
    digits[0].focus();
    setTimeout(() => { feedback.className = "pin-feedback"; feedback.innerHTML = ""; }, 1500);
  }, 500);
}

// ===== Admin Panel =====
function showAdminPanel() {
  const table = document.getElementById("code-table");
  table.innerHTML = `
    <thead>
      <tr><th>Name</th><th>Rolle</th><th>Code</th></tr>
    </thead>
    <tbody>
      ${TEAM.map((m) => `
        <tr>
          <td class="admin-name">${m.name}</td>
          <td class="admin-role">${m.role}</td>
          <td class="admin-code">${m.code}</td>
        </tr>`).join("")}
      <tr class="admin-row-special">
        <td class="admin-name">Admin</td>
        <td class="admin-role">–</td>
        <td class="admin-code">${ADMIN_CODE}</td>
      </tr>
    </tbody>`;

  // Hide progress bar in admin mode
  const current = document.querySelector(".step.active");
  if (current) {
    current.classList.remove("visible");
    setTimeout(() => current.classList.remove("active"), 100);
  }
  setTimeout(() => {
    const panel = document.getElementById("step-admin");
    panel.classList.add("active");
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("visible")));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 150);
}

// ===== Deadline =====
function getDeadlineForWeek(kw, kwYear) {
  // Deadline for KW N = Thursday 18:00 of KW N-1
  let prevKW = kw - 1;
  let prevYear = kwYear;
  if (prevKW < 1) {
    prevYear--;
    prevKW = getISOWeeksInYear(prevYear);
  }
  const monday = getMondayOfISOWeek(prevKW, prevYear);
  // Thursday = Monday + 3 days, 18:00
  return new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 3, 18, 0, 0);
}

function getDeadlineStatus(kw, kwYear) {
  const now = new Date();
  const deadline = getDeadlineForWeek(kw, kwYear);
  const diff = deadline - now;
  if (diff < 0) return "passed";
  if (diff < 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

function formatDeadline(kw, kwYear) {
  const deadline = getDeadlineForWeek(kw, kwYear);
  const status = getDeadlineStatus(kw, kwYear);
  const day = String(deadline.getDate()).padStart(2, "0");
  const month = String(deadline.getMonth() + 1).padStart(2, "0");
  if (status === "passed") return `<span class="deadline-text deadline-passed">Frist abgelaufen (Do ${day}.${month}. 18:00)</span>`;
  if (status === "soon") return `<span class="deadline-text deadline-soon">Frist: Do ${day}.${month}. 18:00 – bald!</span>`;
  return `<span class="deadline-text">Frist: Do ${day}.${month}. 18:00</span>`;
}

// ===== Calendar =====
function renderCalendar() {
  const container = document.getElementById("kw-calendar");
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const currentKW = getISOWeek(now);
  const currentKWYear = getISOWeekYear(now);

  // Disable prev button if showing current month
  const canGoPrev = calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth > now.getMonth());

  // Build weeks for this month
  const firstOfMonth = new Date(Date.UTC(calYear, calMonth, 1));
  const isoDay = (firstOfMonth.getUTCDay() + 6) % 7; // 0=Mon
  const startDate = new Date(firstOfMonth);
  startDate.setUTCDate(startDate.getUTCDate() - isoDay);

  const weeks = [];
  const d = new Date(startDate);
  while (true) {
    const week = [];
    const weekMonday = new Date(d);
    for (let i = 0; i < 7; i++) {
      week.push({
        date: new Date(d),
        day: d.getUTCDate(),
        outside: d.getUTCMonth() !== calMonth,
        isToday: `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}` === todayStr,
      });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    const kw = getISOWeek(weekMonday);
    const kwYear = getISOWeekYear(weekMonday);
    const isPast = kwYear < currentKWYear || (kwYear === currentKWYear && kw < currentKW);
    const isCurrent = kw === currentKW && kwYear === currentKWYear;
    const isSelected = kw === selectedKW && kwYear === selectedYear;
    const dlStatus = isPast ? null : getDeadlineStatus(kw, kwYear);
    weeks.push({ days: week, kw, kwYear, isPast, isCurrent, isSelected, monday: weekMonday, dlStatus });

    // Stop if we've gone past the month
    if (d.getUTCMonth() !== calMonth && (d.getUTCDay() + 6) % 7 === 0) break;
  }

  container.innerHTML = `
    <div class="cal-header">
      <button class="cal-nav" id="cal-prev" ${canGoPrev ? "" : "disabled"}>&larr;</button>
      <h3>${MONTH_NAMES[calMonth]} ${calYear}</h3>
      <button class="cal-nav" id="cal-next">&rarr;</button>
    </div>
    <div class="cal-day-headers">
      <div class="cal-day-header">KW</div>
      <div class="cal-day-header">Mo</div>
      <div class="cal-day-header">Di</div>
      <div class="cal-day-header">Mi</div>
      <div class="cal-day-header">Do</div>
      <div class="cal-day-header">Fr</div>
      <div class="cal-day-header">Sa</div>
      <div class="cal-day-header">So</div>
    </div>
    <div class="cal-grid">
      ${weeks
        .map(
          (w) => `
        <div class="cal-week${w.isPast ? " past" : ""}${w.isCurrent ? " current" : ""}${w.isSelected ? " selected" : ""}${w.dlStatus === "soon" ? " dl-soon" : ""}${w.dlStatus === "passed" ? " dl-passed" : ""}"
             data-kw="${w.kw}" data-year="${w.kwYear}">
          <div class="cal-kw">${w.kw}${w.dlStatus === "soon" ? '<span class="dl-dot soon"></span>' : ""}${w.dlStatus === "passed" ? '<span class="dl-dot passed"></span>' : ""}</div>
          ${w.days
            .map(
              (d) =>
                `<div class="cal-day${d.outside ? " outside" : ""}${d.isToday ? " today" : ""}">${d.day}</div>`
            )
            .join("")}
        </div>`
        )
        .join("")}
    </div>`;

  // Bind navigation
  container.querySelector("#cal-prev").addEventListener("click", () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  container.querySelector("#cal-next").addEventListener("click", () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  // Bind week selection
  container.querySelectorAll(".cal-week:not(.past)").forEach((row) => {
    row.addEventListener("click", () => {
      selectedKW = parseInt(row.dataset.kw);
      selectedYear = parseInt(row.dataset.year);
      const dlStatus = getDeadlineStatus(selectedKW, selectedYear);
      document.getElementById("btn-next-2").disabled = dlStatus === "passed";

      const monday = getMondayOfISOWeek(selectedKW, selectedYear);
      const sunday = new Date(monday);
      sunday.setUTCDate(monday.getUTCDate() + 6);
      document.getElementById("kw-selected-info").innerHTML =
        `<strong class="accent">KW ${selectedKW}</strong> &mdash; ${formatDateLong(monday)} – ${formatDateLong(sunday)}<br>${formatDeadline(selectedKW, selectedYear)}`;

      renderCalendar(); // re-render to update selection highlight
    });
  });
}

// ===== Navigation =====
function bindNavigation() {
  document.getElementById("btn-back-2").addEventListener("click", () => showStep(1));
  document.getElementById("btn-next-2").addEventListener("click", () => {
    showStep(3);
    initAvailabilityStep();
  });
  document.getElementById("btn-back-3").addEventListener("click", () => showStep(2));
  document.getElementById("btn-submit").addEventListener("click", submitAvailability);

  // Admin
  document.getElementById("btn-back-admin").addEventListener("click", () => {
    const panel = document.getElementById("step-admin");
    panel.classList.remove("visible");
    setTimeout(() => panel.classList.remove("active"), 100);
    setTimeout(() => {
      const step1 = document.getElementById("step-1");
      step1.classList.add("active");
      requestAnimationFrame(() => requestAnimationFrame(() => step1.classList.add("visible")));
      resetPin();
    }, 150);
  });
  document.getElementById("btn-copy-codes").addEventListener("click", () => {
    const text = TEAM.map((m) => `${m.name}: ${m.code}`).join("\n") + `\nAdmin: ${ADMIN_CODE}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById("btn-copy-codes");
      btn.textContent = "Kopiert!";
      setTimeout(() => { btn.textContent = "Codes kopieren"; }, 2000);
    });
  });

  // General section toggle
  const btnEdit = document.getElementById("btn-edit-general");
  const generalSlidersEl = document.getElementById("general-sliders");
  btnEdit.addEventListener("click", () => {
    const isExpanded = generalSlidersEl.classList.contains("expanded");
    generalSlidersEl.classList.toggle("collapsed", isExpanded);
    generalSlidersEl.classList.toggle("expanded", !isExpanded);
    btnEdit.classList.toggle("active", !isExpanded);
    btnEdit.textContent = !isExpanded ? "Schließen" : "Bearbeiten";
  });
}

function showStep(step) {
  // hide current
  const current = document.querySelector(".step.active");
  if (current) {
    current.classList.remove("visible");
    setTimeout(() => current.classList.remove("active"), 100);
  }

  currentStep = step;

  // update progress
  document.querySelectorAll(".progress-step").forEach((el) => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle("active", s === step);
    el.classList.toggle("done", s < step);
  });
  document.querySelectorAll(".progress-line").forEach((el, i) => {
    el.classList.toggle("done", i + 1 < step);
  });

  // show next
  setTimeout(() => {
    const next = document.getElementById(`step-${step}`);
    next.classList.add("active");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => next.classList.add("visible"));
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 150);
}

// ===== Availability Step =====
async function initAvailabilityStep() {
  document.getElementById("kw-label-weekly").textContent = `${selectedKW}`;
  document.getElementById("availability-title").textContent =
    `Verfügbarkeit – KW ${selectedKW}`;

  // Show loading state
  document.getElementById("weekly-sliders").innerHTML =
    '<div style="text-align:center;color:#94a3b8;padding:2rem 0">Lade Verfügbarkeit...</div>';
  document.getElementById("btn-submit").disabled = true;

  let weeklyData = null;
  let generalData = null;

  try {
    const wk = weekKeyStr(selectedKW, selectedYear);
    const [weeklyRes, generalRes] = await Promise.all([
      gasPost("get_parsed_availability", { week: wk }),
      gasPost("get_parsed_availability", { week: "GENERAL" }),
    ]);

    if (weeklyRes.success && Array.isArray(weeklyRes.data)) {
      const entry = weeklyRes.data.find(e => e.Name === selectedModerator);
      weeklyData = gasEntryToSliderData(entry);
    }
    if (generalRes.success && Array.isArray(generalRes.data)) {
      const entry = generalRes.data.find(e => e.Name === selectedModerator);
      generalData = gasEntryToSliderData(entry);
    }
  } catch (err) {
    console.warn("GAS load failed, using local data:", err);
  }

  // Fall back to localStorage, then hardcoded defaults
  if (!weeklyData || !generalData) {
    const saved = loadData();
    if (!weeklyData) weeklyData = saved?.weeks?.[`${selectedKW}-${selectedYear}`];
    if (!generalData) generalData = saved?.general;
  }
  if (!generalData && GENERAL_DEFAULTS[selectedModerator]) {
    generalData = gasEntryToSliderData({ Name: selectedModerator, ...GENERAL_DEFAULTS[selectedModerator] });
  }

  buildSliderGroup("weekly-sliders", weeklySliders, weeklyData);
  buildSliderGroup("general-sliders", generalSliders, generalData);
  document.getElementById("btn-submit").disabled = false;
}

function buildSliderGroup(containerId, sliderMap, savedData) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  // Destroy old sliders
  Object.values(sliderMap).forEach((s) => {
    if (s.slider?.noUiSlider) s.slider.noUiSlider.destroy();
  });

  const isWeekly = containerId === "weekly-sliders";
  const monday = isWeekly ? getMondayOfISOWeek(selectedKW, selectedYear) : null;

  DAYS.forEach((day, i) => {
    const key = day.toLowerCase();
    const dayData = savedData?.[key];
    const isUnavailable = dayData?.available === false;
    const values = dayData?.available !== false && dayData?.from != null
      ? [timeToHours(dayData.from), timeToHours(dayData.to)]
      : SLIDER_DEFAULT;

    // Date label for weekly
    let dateStr = "";
    if (isWeekly && monday) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dateStr = formatDate(d);
    }

    const row = document.createElement("div");
    row.className = `day-row${isUnavailable ? " unavailable" : ""}`;
    row.innerHTML = `
      <div class="day-header">
        <div>
          <span class="day-label">${day}</span>
          ${dateStr ? `<span class="day-date">${dateStr}</span>` : ""}
        </div>
        <div style="display:flex;align-items:center;">
          <span class="day-time-display">${isUnavailable ? "Nicht verfügbar" : formatTimeRange(values)}</span>
          <button class="btn-x" title="Nicht verfügbar">&times;</button>
        </div>
      </div>
      <div class="slider-wrapper">
        <div class="slider-el"></div>
        <div class="time-axis">
          <span>08:30</span><span>12:00</span><span>16:00</span><span>20:00</span><span>00:00</span>
        </div>
      </div>`;

    container.appendChild(row);

    const sliderEl = row.querySelector(".slider-el");
    const timeDisplay = row.querySelector(".day-time-display");
    const btnX = row.querySelector(".btn-x");

    noUiSlider.create(sliderEl, {
      start: values,
      connect: true,
      step: 0.5,
      range: { min: SLIDER_MIN, max: SLIDER_MAX },
      tooltips: [{ to: hoursToTime }, { to: hoursToTime }],
    });

    sliderEl.noUiSlider.on("update", (vals) => {
      if (!row.classList.contains("unavailable")) {
        timeDisplay.textContent = formatTimeRange(vals.map(Number));
      }
    });

    btnX.addEventListener("click", () => {
      const isNow = row.classList.contains("unavailable");
      row.classList.toggle("unavailable");
      if (!isNow) {
        timeDisplay.textContent = "Nicht verfügbar";
      } else {
        const vals = sliderEl.noUiSlider.get().map(Number);
        timeDisplay.textContent = formatTimeRange(vals);
      }
    });

    sliderMap[key] = { slider: sliderEl, row, btnX };
  });
}

// ===== Data =====
function collectData() {
  const weekly = {};
  const general = {};

  DAYS.forEach((day) => {
    const key = day.toLowerCase();
    const ws = weeklySliders[key];
    const gs = generalSliders[key];

    if (ws) {
      const unavail = ws.row.classList.contains("unavailable");
      const vals = ws.slider.noUiSlider.get().map(Number);
      weekly[key] = unavail
        ? { available: false }
        : { available: true, from: hoursToTime(vals[0]), to: hoursToTime(vals[1]) };
    }

    if (gs) {
      const unavail = gs.row.classList.contains("unavailable");
      const vals = gs.slider.noUiSlider.get().map(Number);
      general[key] = unavail
        ? { available: false }
        : { available: true, from: hoursToTime(vals[0]), to: hoursToTime(vals[1]) };
    }
  });

  return {
    moderator: selectedModerator,
    kw: selectedKW,
    year: selectedYear,
    timestamp: new Date().toISOString(),
    weekly,
    general,
  };
}

function saveData() {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  if (!all[selectedModerator]) all[selectedModerator] = { weeks: {}, general: {} };
  const data = collectData();
  all[selectedModerator].weeks[`${selectedKW}-${selectedYear}`] = data.weekly;
  all[selectedModerator].general = data.general;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function loadData() {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return all[selectedModerator] || null;
}

async function submitAvailability() {
  const btn = document.getElementById("btn-submit");
  btn.disabled = true;
  btn.textContent = "Speichern...";

  const data = collectData();
  saveData(); // localStorage backup

  const wk = weekKeyStr(selectedKW, selectedYear);
  const weeklyEntry = sliderDataToGasEntry(selectedModerator, data.weekly);
  const generalEntry = sliderDataToGasEntry(selectedModerator, data.general);

  try {
    // Server-side merge via save_single_availability (uses LockService)
    const [saveWeekly, saveGeneral] = await Promise.all([
      gasPost("save_single_availability", { week: wk, entry: weeklyEntry }),
      gasPost("save_single_availability", { week: "GENERAL", entry: generalEntry }),
    ]);

    const toast = document.getElementById("toast");
    if (saveWeekly.success && saveGeneral.success) {
      document.querySelector(".toast-text").textContent = "Verfügbarkeit gespeichert!";
    } else {
      document.querySelector(".toast-text").textContent = "Lokal gespeichert (Sync fehlgeschlagen)";
    }
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => { document.querySelector(".toast-text").textContent = "Verfügbarkeit gespeichert!"; }, 500);
    }, 3000);
  } catch (err) {
    console.error("GAS save error:", err);
    const toast = document.getElementById("toast");
    document.querySelector(".toast-text").textContent = "Lokal gespeichert (Sync fehlgeschlagen)";
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => { document.querySelector(".toast-text").textContent = "Verfügbarkeit gespeichert!"; }, 500);
    }, 3000);
  }

  btn.disabled = false;
  btn.textContent = "Speichern";
}

// ===== GAS API =====
function weekKeyStr(kw, year) {
  return `KW${String(kw).padStart(2, "0")}-${year}`;
}

async function gasPost(action, params = {}) {
  const payload = { action, ...params };
  const response = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function toGasValue(dayData) {
  if (!dayData || dayData.available === false) return "Nicht";
  if (dayData.from === "08:30" && dayData.to === "00:00") return "Voll";
  return `${dayData.from}-${dayData.to}`;
}

function fromGasValue(val) {
  if (!val || val === "Nicht") return { available: false };
  if (val === "Voll") return { available: true, from: "08:30", to: "00:00" };
  const match = val.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (match) return { available: true, from: match[1], to: match[2] };
  return { available: false };
}

function gasEntryToSliderData(entry) {
  if (!entry) return null;
  const data = {};
  for (const [webKey, gasKey] of Object.entries(DAY_MAP)) {
    data[webKey] = fromGasValue(entry[gasKey]);
  }
  return data;
}

function sliderDataToGasEntry(name, dayData) {
  const entry = { Name: name };
  for (const [webKey, gasKey] of Object.entries(DAY_MAP)) {
    entry[gasKey] = toGasValue(dayData[webKey]);
  }
  return entry;
}

function mergeEntry(entries, newEntry) {
  const idx = entries.findIndex(e => e.Name === newEntry.Name);
  if (idx >= 0) entries[idx] = newEntry;
  else entries.push(newEntry);
  return entries;
}

// ===== Date Helpers =====
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getISOWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

function getISOWeeksInYear(year) {
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return getISOWeek(dec28);
}

function getMondayOfISOWeek(week, year) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function formatDate(d) {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.`;
}

function formatDateLong(d) {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

// ===== Time Helpers =====
function hoursToTime(val) {
  val = Number(val);
  if (val >= 24) return "00:00";
  const h = Math.floor(val);
  const m = val % 1 === 0.5 ? "30" : "00";
  return `${String(h).padStart(2, "0")}:${m}`;
}

function timeToHours(str) {
  const [h, m] = str.split(":").map(Number);
  if (h === 0 && m === 0) return 24; // midnight = end of day
  return h + (m >= 30 ? 0.5 : 0);
}

function formatTimeRange(vals) {
  return `${hoursToTime(vals[0])} – ${hoursToTime(vals[1])}`;
}

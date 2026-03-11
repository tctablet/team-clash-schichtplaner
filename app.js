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
let ADMIN_CODE = "0800";

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
let shiftWeekKW = null;
let shiftWeekYear = null;
let shiftPlanCache = {};
let adminWeekKW = null;
let adminWeekYear = null;

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
    document.getElementById("hub-name").textContent = selectedModerator;
    document.getElementById("shift-mod-name").textContent = selectedModerator;
    feedback.innerHTML = `Hallo, <strong>${member.name}</strong>!`;
    feedback.className = "pin-feedback pin-success";
    digits.forEach((d) => d.classList.add("pin-ok"));
    setTimeout(() => {
      digits.forEach((d) => d.classList.remove("pin-ok"));
      showStep("hub");
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
  renderCodeTable();

  // Init admin calendar
  initAdminCalendar();

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
  // Hub
  document.getElementById("btn-back-hub").addEventListener("click", () => {
    selectedModerator = null;
    showStep(1);
    resetPin();
  });
  document.getElementById("hub-shifts").addEventListener("click", () => {
    initShiftCalendar();
    showStep("shifts");
  });
  document.getElementById("hub-availability").addEventListener("click", () => showStep(2));

  // Shifts
  document.getElementById("btn-back-shifts").addEventListener("click", () => showStep("hub"));
  document.getElementById("shift-prev").addEventListener("click", () => navigateShiftWeek(-1));
  document.getElementById("shift-next").addEventListener("click", () => navigateShiftWeek(1));

  // Availability flow
  document.getElementById("btn-back-2").addEventListener("click", () => showStep("hub"));
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
  // Admin tabs
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  // Admin calendar nav
  document.getElementById("admin-prev").addEventListener("click", () => navigateAdminWeek(-1));
  document.getElementById("admin-next").addEventListener("click", () => navigateAdminWeek(1));

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

  // Show/hide progress bar (only for availability steps 2, 3)
  const progressBar = document.querySelector(".progress-bar");
  const isAvailFlow = typeof step === "number" && step >= 2;
  progressBar.style.display = isAvailFlow ? "flex" : "none";

  // update progress for availability flow
  if (isAvailFlow) {
    document.querySelectorAll(".progress-step").forEach((el) => {
      const s = parseInt(el.dataset.step);
      el.classList.toggle("active", s === step);
      el.classList.toggle("done", s < step);
    });
    document.querySelectorAll(".progress-line").forEach((el, i) => {
      el.classList.toggle("done", i + 1 < step);
    });
  }

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

// ===== Shift Calendar =====
function initShiftCalendar() {
  const now = new Date();
  shiftWeekKW = getISOWeek(now);
  shiftWeekYear = getISOWeekYear(now);
  loadAndRenderShifts();
}

function navigateShiftWeek(delta) {
  shiftWeekKW += delta;
  const maxWeeks = getISOWeeksInYear(shiftWeekYear);
  if (shiftWeekKW > maxWeeks) {
    shiftWeekKW = 1;
    shiftWeekYear++;
  } else if (shiftWeekKW < 1) {
    shiftWeekYear--;
    shiftWeekKW = getISOWeeksInYear(shiftWeekYear);
  }
  loadAndRenderShifts();
}

async function loadAndRenderShifts() {
  const weekKey = weekKeyStr(shiftWeekKW, shiftWeekYear);
  const monday = getMondayOfISOWeek(shiftWeekKW, shiftWeekYear);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  document.getElementById("shift-week-title").textContent = `KW ${shiftWeekKW}`;
  document.getElementById("shift-date-range").textContent =
    `${formatDateLong(monday)} – ${formatDateLong(sunday)}`;

  const cal = document.getElementById("shift-calendar");
  cal.innerHTML = '<div class="shift-loading">Lade Schichtplan...</div>';

  let planData = { plan: [], support: [] };
  try {
    if (shiftPlanCache[weekKey]) {
      planData = shiftPlanCache[weekKey];
    } else {
      const res = await gasPost("get_week_plan", { week: weekKey });
      if (res.success && res.data) {
        if (res.data.plan && Array.isArray(res.data.plan)) {
          planData = { plan: res.data.plan, support: res.data.support || [] };
        } else if (Array.isArray(res.data)) {
          planData = { plan: res.data, support: [] };
        }
        shiftPlanCache[weekKey] = planData;
      }
    }
  } catch (err) {
    console.warn("Failed to load shift plan:", err);
  }

  renderShiftCalendar(planData, monday);
}

function matchDay(entry, dayFull, dayShort) {
  const d = (entry.day || "").trim().toLowerCase();
  return d === dayFull.toLowerCase() || d === dayShort.toLowerCase();
}

// ===== Time Grid Helpers =====
const GRID_START = 9; // 09:00
const GRID_END = 24;  // 00:00 (midnight)
const GRID_HOURS = GRID_END - GRID_START; // 15 hours
const DEFAULT_SLOT_DURATION = 90; // minutes

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const s = String(timeStr).trim();

  // Standard "HH:MM" format
  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    let h = parseInt(hhmm[1]), m = parseInt(hhmm[2]);
    if (h === 0 && m === 0) h = 24;
    return h * 60 + m;
  }

  // Google Sheets serialized Date (e.g. "Sat Dec 30 1899 16:00:00 GMT+0100")
  // Extract HH:MM directly from string - do NOT use Date() because 1899
  // dates have historical timezone offsets that cause wrong hour values
  const timeMatch = s.match(/(\d{1,2}):(\d{2}):\d{2}/);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]), m = parseInt(timeMatch[2]);
    if (h === 0 && m === 0) h = 24;
    return h * 60 + m;
  }

  return null;
}

function formatTimeFromValue(timeStr) {
  // Convert any time value (HH:MM or Date string) to clean "HH:MM"
  const mins = parseTimeToMinutes(timeStr);
  if (mins == null) return String(timeStr || "");
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getShiftStartEnd(shift) {
  // Determine start/end in minutes from midnight for a plan entry
  let startMin = parseTimeToMinutes(shift.slot);
  let endMin;

  if (shift.aussenslot_end) {
    endMin = parseTimeToMinutes(shift.aussenslot_end);
  } else {
    endMin = startMin != null ? startMin + DEFAULT_SLOT_DURATION : null;
  }

  if (startMin == null) startMin = GRID_START * 60;
  if (endMin == null) endMin = startMin + DEFAULT_SLOT_DURATION;
  if (endMin <= startMin) endMin = startMin + DEFAULT_SLOT_DURATION;

  return { startMin, endMin };
}

function renderTimeGrid(plan, monday, container, filterName, supportEntries) {
  supportEntries = supportEntries || [];

  // Build a lookup: day -> support entry { day, person, start, end }
  const supportByDay = {};
  supportEntries.forEach((s) => {
    const d = (s.day || "").trim().toLowerCase();
    if (d) supportByDay[d] = s;
  });

  // For filtered user view: check if user has mod shifts OR support shifts
  const modShifts = filterName
    ? plan.filter((e) => e.moderator === filterName)
    : plan;
  const userSupportDays = filterName
    ? supportEntries.filter((s) => s.person === filterName)
    : [];

  if (plan.length === 0 && supportEntries.length === 0) {
    container.innerHTML = '<div class="shift-empty">Kein Schichtplan für diese Woche vorhanden.</div>';
    return;
  }

  if (filterName && modShifts.length === 0 && userSupportDays.length === 0) {
    container.innerHTML = '<div class="shift-empty">Keine Schichten für dich in dieser Woche.</div>';
    return;
  }

  // For display: use all plan entries (admin) or only user's mod shifts (user view)
  const displayPlan = filterName ? modShifts : plan;

  // Split into assigned (has day) and unassigned
  const assigned = displayPlan.filter((e) => (e.day || "").trim() !== "");
  const unassigned = displayPlan.filter((e) => (e.day || "").trim() === "");
  const displayShifts = assigned.length > 0 ? assigned : displayPlan;
  const hasDayData = assigned.length > 0;

  const dayShorts = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const dayFull = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

  // Determine visible time range from actual data (with 1h padding)
  let minTime = GRID_END * 60, maxTime = GRID_START * 60;
  displayShifts.forEach((s) => {
    const { startMin, endMin } = getShiftStartEnd(s, null);
    if (startMin < minTime) minTime = startMin;
    if (endMin > maxTime) maxTime = endMin;
  });
  // Also consider support times
  const relevantSupport = filterName ? userSupportDays : supportEntries;
  relevantSupport.forEach((s) => {
    const st = parseTimeToMinutes(s.start);
    const en = parseTimeToMinutes(s.end);
    if (st != null && st < minTime) minTime = st;
    if (en != null && en > maxTime) maxTime = en;
  });
  const gridStartH = Math.max(GRID_START, Math.floor(minTime / 60) - 1);
  const gridEndH = Math.min(GRID_END, Math.ceil(maxTime / 60) + 1);
  const gridHours = gridEndH - gridStartH;
  const gridHeightPx = gridHours * 60; // 1px per minute

  // Build hour labels
  let hoursHtml = "";
  for (let h = gridStartH; h <= gridEndH; h++) {
    const label = h === 24 ? "00:00" : `${String(h).padStart(2, "0")}:00`;
    const pct = ((h - gridStartH) / gridHours) * 100;
    hoursHtml += `<div class="tg-hour" style="top:${pct}%"><span>${label}</span></div>`;
  }

  // Build grid lines
  let linesHtml = "";
  for (let h = gridStartH; h <= gridEndH; h++) {
    const pct = ((h - gridStartH) / gridHours) * 100;
    linesHtml += `<div class="tg-line" style="top:${pct}%"></div>`;
  }

  // Build day columns
  let colsHtml = "";
  dayShorts.forEach((ds, i) => {
    const dayDate = new Date(monday);
    dayDate.setUTCDate(monday.getUTCDate() + i);
    const dateStr = formatDate(dayDate);

    const dayShifts = hasDayData
      ? displayShifts.filter((e) => matchDay(e, dayFull[i], ds))
      : (i === 0 ? displayShifts : []);

    // Find support entry for this day
    const daySup = supportByDay[dayFull[i].toLowerCase()] || supportByDay[ds.toLowerCase()];

    // Build mod/booking events
    const eventData = dayShifts.map((shift) => {
      const { startMin, endMin } = getShiftStartEnd(shift, null);
      return { shift, startMin, endMin, type: "mod" };
    });

    // Add support event for this day (if relevant for the user or admin view)
    if (daySup && daySup.start && daySup.end) {
      const showSupport = !filterName || daySup.person === filterName;
      if (showSupport) {
        const st = parseTimeToMinutes(daySup.start);
        const en = parseTimeToMinutes(daySup.end);
        if (st != null && en != null) {
          eventData.push({
            shift: daySup,
            startMin: st,
            endMin: en,
            type: "sup"
          });
        }
      }
    }

    eventData.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    // Assign columns to overlapping events
    const columns = [];
    eventData.forEach((ev) => {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (ev.startMin >= columns[c]) {
          columns[c] = ev.endMin;
          ev.col = c;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev.col = columns.length;
        columns.push(ev.endMin);
      }
    });
    const totalCols = columns.length || 1;

    let eventsHtml = "";
    eventData.forEach((ev) => {
      const { shift, startMin, endMin } = ev;
      const topPct = ((startMin - gridStartH * 60) / (gridHours * 60)) * 100;
      const heightPct = ((endMin - startMin) / (gridHours * 60)) * 100;
      const leftPct = (ev.col / totalCols) * 100;
      const widthPct = (1 / totalCols) * 100;

      if (ev.type === "sup") {
        // Support band event
        const supPerson = shift.person || "";
        const supStart = formatTimeFromValue(shift.start);
        const supEnd = formatTimeFromValue(shift.end);
        eventsHtml += `<div class="tg-event tg-sup" style="top:${topPct}%;height:${heightPct}%;left:${leftPct}%;width:${widthPct}%" title="Support: ${supPerson}">
          <div class="tg-event-content">
            <span class="tg-event-time">${supStart}–${supEnd}</span>
            <span class="tg-event-label">${supPerson}</span>
            <span class="tg-event-room">Support</span>
          </div>
        </div>`;
      } else {
        // Moderator/booking event
        const room = shift.room || "";
        let label = filterName ? (room || formatTimeFromValue(shift.slot)) : (shift.moderator || "");
        const hasAussen = shift.aussenslot_start && shift.aussenslot_end;
        const startTime = formatTimeFromValue(shift.slot);

        eventsHtml += `<div class="tg-event tg-mod" style="top:${topPct}%;height:${heightPct}%;left:${leftPct}%;width:${widthPct}%" title="${shift.booking_code || ""}">
          <div class="tg-event-content">
            <span class="tg-event-time">${startTime}</span>
            <span class="tg-event-label">${label}</span>
            ${room && !filterName ? `<span class="tg-event-room">${room}</span>` : ""}
            ${hasAussen ? `<div class="tg-aussen-dot" title="AS ${formatTimeFromValue(shift.aussenslot_start)}–${formatTimeFromValue(shift.aussenslot_end)}"></div>` : ""}
          </div>
        </div>`;
      }
    });

    colsHtml += `<div class="tg-col">
      <div class="tg-col-header">
        <span class="tg-col-day">${ds}</span>
        <span class="tg-col-date">${dateStr}</span>
      </div>
      <div class="tg-col-body">
        ${linesHtml}
        ${eventsHtml}
      </div>
    </div>`;
  });

  let unassignedHint = "";
  if (hasDayData && unassigned.length > 0) {
    unassignedHint = `<div class="tg-unassigned-hint">${unassigned.length} weitere Schichten ohne Tageszuordnung (Godot-Neuspeicherung nötig)</div>`;
  }

  container.innerHTML = `<div class="time-grid" style="--tg-height:${gridHeightPx}px">
    <div class="tg-hours">${hoursHtml}</div>
    <div class="tg-cols">${colsHtml}</div>
  </div>${unassignedHint}`;
}

function renderShiftCalendar(planData, monday) {
  const cal = document.getElementById("shift-calendar");
  renderTimeGrid(planData.plan, monday, cal, selectedModerator, planData.support);
}

function renderShiftCard(shift) {
  const room = shift.room || "–";
  const slot = formatTimeFromValue(shift.slot) || "–";

  let aussenHtml = "";
  if (shift.aussenslot_start && shift.aussenslot_end) {
    aussenHtml = `<div class="shift-aussen">
      <span class="legend-dot aussen"></span>
      Außenslot: ${formatTimeFromValue(shift.aussenslot_start)} – ${formatTimeFromValue(shift.aussenslot_end)}
    </div>`;
  }

  return `<div class="shift-card shift-mod">
    <div class="shift-card-header">
      <span class="shift-role-badge mod">Moderator</span>
      <span class="shift-time">${slot}</span>
    </div>
    <div class="shift-card-details">
      <span class="shift-room">&#127968; ${room}</span>
      <span class="shift-code">${shift.booking_code || ""}</span>
    </div>
    ${aussenHtml}
  </div>`;
}

// ===== Admin Calendar =====
function initAdminCalendar() {
  const now = new Date();
  adminWeekKW = getISOWeek(now);
  adminWeekYear = getISOWeekYear(now);
  loadAndRenderAdminShifts();
}

function navigateAdminWeek(delta) {
  adminWeekKW += delta;
  const maxWeeks = getISOWeeksInYear(adminWeekYear);
  if (adminWeekKW > maxWeeks) { adminWeekKW = 1; adminWeekYear++; }
  else if (adminWeekKW < 1) { adminWeekYear--; adminWeekKW = getISOWeeksInYear(adminWeekYear); }
  loadAndRenderAdminShifts();
}

async function loadAndRenderAdminShifts() {
  const weekKey = weekKeyStr(adminWeekKW, adminWeekYear);
  const monday = getMondayOfISOWeek(adminWeekKW, adminWeekYear);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  document.getElementById("admin-week-title").textContent = `KW ${adminWeekKW}`;
  document.getElementById("admin-date-range").textContent =
    `${formatDateLong(monday)} – ${formatDateLong(sunday)}`;

  const cal = document.getElementById("admin-calendar");
  cal.innerHTML = '<div class="shift-loading">Lade Schichtplan...</div>';

  let planData = { plan: [], support: [] };
  try {
    if (shiftPlanCache[weekKey]) {
      planData = shiftPlanCache[weekKey];
    } else {
      const res = await gasPost("get_week_plan", { week: weekKey });
      if (res.success && res.data) {
        if (res.data.plan && Array.isArray(res.data.plan)) {
          planData = { plan: res.data.plan, support: res.data.support || [] };
        } else if (Array.isArray(res.data)) {
          planData = { plan: res.data, support: [] };
        }
        shiftPlanCache[weekKey] = planData;
      }
    }
  } catch (err) {
    console.warn("Failed to load admin shift plan:", err);
  }

  renderAdminCalendar(planData, monday);
}

function renderAdminShiftCard(shift, supportForDay) {
  const mod = shift.moderator || "–";
  const room = shift.room || "–";
  const slot = formatTimeFromValue(shift.slot) || "–";

  let aussenHtml = "";
  if (shift.aussenslot_start && shift.aussenslot_end) {
    aussenHtml = `<span class="admin-aussen" title="Außenslot">AS ${formatTimeFromValue(shift.aussenslot_start)}–${formatTimeFromValue(shift.aussenslot_end)}</span>`;
  }

  let supHtml = "";
  if (supportForDay && supportForDay.person) {
    const supTime = supportForDay.start && supportForDay.end
      ? ` (${formatTimeFromValue(supportForDay.start)}–${formatTimeFromValue(supportForDay.end)})` : "";
    supHtml = `<div class="admin-shift-support">
      <span class="legend-dot sup"></span> ${supportForDay.person}${supTime}
    </div>`;
  }

  return `<div class="admin-shift-card">
    <div class="admin-shift-top">
      <span class="admin-shift-slot">${slot}</span>
      <span class="admin-shift-room">${room}</span>
      ${aussenHtml}
    </div>
    <div class="admin-shift-crew">
      <div class="admin-shift-mod">
        <span class="legend-dot mod"></span> ${mod}
      </div>
      ${supHtml}
    </div>
    <div class="admin-shift-code">${shift.booking_code || ""}</div>
  </div>`;
}

function renderAdminCalendar(planData, monday) {
  const cal = document.getElementById("admin-calendar");
  renderTimeGrid(planData.plan, monday, cal, null, planData.support);
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

// ===== Team Codes =====
// Codes are stored directly in the TEAM array above (no backend needed).

function renderCodeTable() {
  const table = document.getElementById("code-table");
  table.innerHTML = `
    <thead>
      <tr><th>Name</th><th>Rolle</th><th>Code</th></tr>
    </thead>
    <tbody>
      ${TEAM.map((m, i) => `
        <tr>
          <td class="admin-name">${m.name}</td>
          <td class="admin-role">${m.role}</td>
          <td class="admin-code">
            <input type="text" class="code-input" data-idx="${i}" value="${m.code}" maxlength="4" inputmode="numeric" pattern="[0-9]*">
          </td>
        </tr>`).join("")}
      <tr class="admin-row-special">
        <td class="admin-name">Admin</td>
        <td class="admin-role">–</td>
        <td class="admin-code">
          <input type="text" class="code-input" data-admin="true" value="${ADMIN_CODE}" maxlength="4" inputmode="numeric" pattern="[0-9]*">
        </td>
      </tr>
    </tbody>`;

  // Bind save on change
  const btnSave = document.getElementById("btn-save-codes");
  const btnCopy = document.getElementById("btn-copy-codes");

  // Show save button, attach handler
  btnSave.style.display = "block";
  btnSave.onclick = () => {
    // Validate: all codes must be exactly 4 digits and unique
    const inputs = table.querySelectorAll(".code-input");
    const codes = new Set();
    let valid = true;

    inputs.forEach((inp) => {
      const val = inp.value.replace(/\D/g, "");
      inp.value = val;
      if (val.length !== 4) {
        inp.classList.add("code-error");
        valid = false;
      } else if (codes.has(val)) {
        inp.classList.add("code-error");
        valid = false;
      } else {
        inp.classList.remove("code-error");
        codes.add(val);
      }
    });

    if (!valid) {
      btnSave.textContent = "Codes müssen 4-stellig & einzigartig sein";
      setTimeout(() => { btnSave.textContent = "Codes speichern"; }, 2500);
      return;
    }

    // Apply to TEAM array and ADMIN_CODE
    inputs.forEach((inp) => {
      if (inp.dataset.admin === "true") {
        ADMIN_CODE = inp.value;
        return;
      }
      const idx = parseInt(inp.dataset.idx);
      if (TEAM[idx]) TEAM[idx].code = inp.value;
    });

    btnSave.textContent = "Gespeichert!";
    setTimeout(() => { btnSave.textContent = "Codes speichern"; }, 2000);
  };

  // Update copy handler
  btnCopy.onclick = () => {
    const text = TEAM.map((m) => `${m.name}: ${m.code}`).join("\n") + `\nAdmin: ${ADMIN_CODE}`;
    navigator.clipboard.writeText(text).then(() => {
      btnCopy.textContent = "Kopiert!";
      setTimeout(() => { btnCopy.textContent = "Codes kopieren"; }, 2000);
    });
  };
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

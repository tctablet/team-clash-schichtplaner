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
function roomName(id) { return /^\d+(\.\d+)?$/.test(String(id)) ? `Raum ${Math.floor(id)}` : String(id); }

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

// ===== Person Colors (from Godot app) =====
const MODERATOR_COLORS = {
  "Sascha": "#7c6aff",
  "Alexa": "#4d94ff",
  "Quynh": "#06b6d4",
  "Vanessa": "#a855f7",
  "Hannah": "#ec4899",
  "Anvi": "#f59e0b",
  "Favour": "#10b981",
  "Jasmin": "#84cc16",
  "Hamed": "#ef4444",
  "Rehan": "#f97316",
};
function personColor(name) { return MODERATOR_COLORS[name] || "var(--cyan)"; }
function personStyle(name) { return `--person-color:${personColor(name)}`; }

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
const unlockedWeeks = new Set(JSON.parse(localStorage.getItem("tc_unlocked_weeks") || "[]"));

// ===== View Mode State =====
let viewModeShifts = window.innerWidth < 768 ? "agenda" : "grid";
let viewModeAdmin = window.innerWidth < 768 ? "agenda" : "grid";
let agendaDayShifts = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Mo
let agendaDayAdmin = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
let lastPlanDataShifts = null;
let lastMondayShifts = null;
let lastPlanDataAdmin = null;
let lastMondayAdmin = null;
let availWeekKW = null;
let availWeekYear = null;
let availViewType = "weekly"; // "weekly" or "general"
let availDayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Mo
let availCache = {}; // { "KW_YEAR": { weekly: [...], general: [...] } }
let showAussenSlots = false; // Außenslot overlay toggle

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  initPinEntry();
  renderCalendar();
  bindNavigation();
  initViewToggles();
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

function unlockKey(kw, kwYear) { return `${kwYear}-KW${kw}`; }

function toggleWeekUnlock(kw, kwYear) {
  const key = unlockKey(kw, kwYear);
  if (unlockedWeeks.has(key)) unlockedWeeks.delete(key);
  else unlockedWeeks.add(key);
  localStorage.setItem("tc_unlocked_weeks", JSON.stringify([...unlockedWeeks]));
}

function getDeadlineStatus(kw, kwYear) {
  if (unlockedWeeks.has(unlockKey(kw, kwYear))) return "unlocked";
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
  if (status === "unlocked") return `<span class="deadline-text deadline-unlocked">Frist aufgehoben (Admin)</span>`;
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
      document.getElementById("btn-next-2").disabled = dlStatus === "passed" && !unlockedWeeks.has(unlockKey(selectedKW, selectedYear));

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
      if (tab.dataset.tab === "admin-avail") {
        if (!availWeekKW) initAvailWeek();
        else loadAvailData();
      }
    });
  });

  // Admin calendar nav
  document.getElementById("admin-prev").addEventListener("click", () => navigateAdminWeek(-1));
  document.getElementById("admin-next").addEventListener("click", () => navigateAdminWeek(1));

  // Availability overview nav
  document.getElementById("avail-prev").addEventListener("click", () => navigateAvailWeek(-1));
  document.getElementById("avail-next").addEventListener("click", () => navigateAvailWeek(1));
  document.querySelectorAll(".avail-type-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".avail-type-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      availViewType = btn.dataset.type;
      renderAvailTable();
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

  // Inject test week data for KW 13/2025
  const testKey = weekKeyStr(TEST_WEEK_KW, TEST_WEEK_YEAR);
  if (!shiftPlanCache[testKey]) shiftPlanCache[testKey] = TEST_PLAN_DATA;

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

function renderTimeGrid(plan, monday, container, filterName, supportEntries, ctx) {
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

  // On mobile grid: show only selected day via day tabs
  const isMobileGrid = ctx && window.innerWidth < 768;
  const mobileDay = isMobileGrid ? (ctx === "shifts" ? agendaDayShifts : agendaDayAdmin) : null;

  // Build day columns
  let colsHtml = "";
  dayShorts.forEach((ds, i) => {
    if (isMobileGrid && i !== mobileDay) return;
    const dayDate = new Date(monday);
    dayDate.setUTCDate(monday.getUTCDate() + i);
    const dateStr = formatDate(dayDate);

    const dayShifts = hasDayData
      ? displayShifts.filter((e) => matchDay(e, dayFull[i], ds))
      : (i === 0 ? displayShifts : []);

    // Find support entry for this day
    const daySup = supportByDay[dayFull[i].toLowerCase()] || supportByDay[ds.toLowerCase()];

    // Build mod events (separate from support)
    const modEvents = dayShifts.map((shift) => {
      const { startMin, endMin } = getShiftStartEnd(shift, null);
      return { shift, startMin, endMin, type: "mod" };
    });
    modEvents.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    // Assign columns to overlapping mod events (no limit)
    const columns = [];
    modEvents.forEach((ev) => {
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

    // Render mod events — all visible, equal-width columns
    let eventsHtml = "";
    let aussenHtml = "";
    modEvents.forEach((ev) => {
      const { shift, startMin, endMin } = ev;
      const topPct = ((startMin - gridStartH * 60) / (gridHours * 60)) * 100;
      const heightPct = ((endMin - startMin) / (gridHours * 60)) * 100;
      const leftPct = (ev.col / totalCols) * 100;
      const widthPct = (1 / totalCols) * 100;

      const room = shift.room ? roomName(shift.room) : "";
      let label = filterName ? (room || formatTimeFromValue(shift.slot)) : (shift.moderator || "");
      const hasAussen = shift.aussenslot_start && shift.aussenslot_end;
      const startTime = formatTimeFromValue(shift.slot);

      // Full-size mod event (always same size regardless of AS toggle)
      eventsHtml += `<div class="tg-event tg-mod" style="top:${topPct}%;height:${heightPct}%;left:${leftPct}%;width:${widthPct}%;${personStyle(shift.moderator)}" title="${shift.booking_code || ""}">
        <div class="tg-event-content">
          <span class="tg-event-time">${startTime}</span>
          <span class="tg-event-label">${label}</span>
          ${room && !filterName ? `<span class="tg-event-room">${room}</span>` : ""}
          ${hasAussen && !showAussenSlots ? `<div class="tg-aussen-dot" title="AS ${formatTimeFromValue(shift.aussenslot_start)}–${formatTimeFromValue(shift.aussenslot_end)}"></div>` : ""}
        </div>
      </div>`;

      // Außenslot overlay block (only when AS toggle is on)
      if (showAussenSlots && hasAussen) {
        const asStart = parseTimeToMinutes(shift.aussenslot_start);
        const asEnd = parseTimeToMinutes(shift.aussenslot_end);
        if (asStart != null && asEnd != null) {
          const asTopPct = ((asStart - gridStartH * 60) / (gridHours * 60)) * 100;
          const asHeightPct = ((asEnd - asStart) / (gridHours * 60)) * 100;
          const asStartTime = formatTimeFromValue(shift.aussenslot_start);
          const asEndTime = formatTimeFromValue(shift.aussenslot_end);
          aussenHtml += `<div class="tg-event tg-aussen" style="top:${asTopPct}%;height:${asHeightPct}%;left:${leftPct}%;width:${widthPct}%;${personStyle(shift.moderator)}" title="AS: ${shift.moderator}">
            <div class="tg-event-content">
              <span class="tg-event-time">${asStartTime}–${asEndTime}</span>
              <span class="tg-event-label">${shift.moderator || ""}</span>
            </div>
          </div>`;
        }
      }
    });

    // Render support as a vertical band on the right edge (like Godot app)
    let supportBandHtml = "";
    if (daySup && daySup.start && daySup.end) {
      const showSupport = !filterName || daySup.person === filterName;
      if (showSupport) {
        const st = parseTimeToMinutes(daySup.start);
        const en = parseTimeToMinutes(daySup.end);
        if (st != null && en != null) {
          const topPct = ((st - gridStartH * 60) / (gridHours * 60)) * 100;
          const heightPct = ((en - st) / (gridHours * 60)) * 100;
          const supPerson = daySup.person || "";
          const supStart = formatTimeFromValue(daySup.start);
          const supEnd = formatTimeFromValue(daySup.end);
          supportBandHtml = `<div class="tg-support-band" style="${personStyle(supPerson)}" title="Support: ${supPerson} ${supStart}–${supEnd}">
            <div class="tg-support-bg"></div>
            <div class="tg-support-fill" style="top:${topPct}%;height:${heightPct}%;${personStyle(supPerson)}">
              <span class="tg-support-name">${supPerson}</span>
              <span class="tg-support-time">${supStart}–${supEnd}</span>
            </div>
          </div>`;
        }
      }
    }

    const hasSupBand = supportBandHtml !== "";
    colsHtml += `<div class="tg-col">
      <div class="tg-col-header">
        <span class="tg-col-day">${ds}</span>
        <span class="tg-col-date">${dateStr}</span>
      </div>
      <div class="tg-col-body${hasSupBand ? " has-support" : ""}">
        ${linesHtml}
        <div class="tg-events-area">${eventsHtml}${aussenHtml}</div>
        ${supportBandHtml}
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
  lastPlanDataShifts = planData;
  lastMondayShifts = monday;
  const cal = document.getElementById("shift-calendar");
  const isMobile = window.innerWidth < 768;
  if (viewModeShifts === "agenda") {
    renderAgendaView(planData, monday, cal, selectedModerator, "shifts");
  } else {
    if (isMobile) renderDayTabs("shifts");
    renderTimeGrid(planData.plan, monday, cal, selectedModerator, planData.support, "shifts");
  }
  // Hide/show day tabs: visible for agenda always, visible for grid on mobile
  const tabs = document.getElementById("agenda-day-tabs-shifts");
  if (tabs) tabs.style.display = (viewModeShifts === "agenda" || (viewModeShifts === "grid" && isMobile)) ? "" : "none";
}

function renderShiftCard(shift) {
  const room = shift.room ? roomName(shift.room) : "–";
  const slot = formatTimeFromValue(shift.slot) || "–";

  let aussenHtml = "";
  if (shift.aussenslot_start && shift.aussenslot_end) {
    aussenHtml = `<div class="shift-aussen">
      <span class="legend-dot aussen"></span>
      Außenslot: ${formatTimeFromValue(shift.aussenslot_start)} – ${formatTimeFromValue(shift.aussenslot_end)}
    </div>`;
  }

  return `<div class="shift-card shift-mod" style="${personStyle(shift.moderator)}">
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

// ===== Test Week Data =====
const TEST_WEEK_KW = 12; // KW 12 2026 (aktuelle Woche)
const TEST_WEEK_YEAR = 2026;
const TEST_PLAN_DATA = {
  plan: [
    // Jedes Event: 2,5h total, 45min Außenslot, keine AS-Überschneidungen pro Tag
    // Montag – 3 Schichten (AS: 10:45-11:30, 11:45-12:30, 15:45-16:30)
    { day: "Montag", moderator: "Sascha", room: "1", slot: "09:00", booking_code: "BC-1001", aussenslot_start: "10:45", aussenslot_end: "11:30" },
    { day: "Montag", moderator: "Alexa", room: "2", slot: "10:00", booking_code: "BC-1002", aussenslot_start: "11:45", aussenslot_end: "12:30" },
    { day: "Montag", moderator: "Quynh", room: "3", slot: "14:00", booking_code: "BC-1003", aussenslot_start: "15:45", aussenslot_end: "16:30" },
    // Dienstag – 3 Schichten (AS: 11:15-12:00, 12:15-13:00, 16:45-17:30)
    { day: "Dienstag", moderator: "Vanessa", room: "1", slot: "09:30", booking_code: "BC-1004", aussenslot_start: "11:15", aussenslot_end: "12:00" },
    { day: "Dienstag", moderator: "Hannah", room: "2", slot: "10:30", booking_code: "BC-1005", aussenslot_start: "12:15", aussenslot_end: "13:00" },
    { day: "Dienstag", moderator: "Anvi", room: "3", slot: "15:00", booking_code: "BC-1006", aussenslot_start: "16:45", aussenslot_end: "17:30" },
    // Mittwoch – 4 Schichten (AS: 10:45-11:30, 11:45-12:30, 14:45-15:30, 15:45-16:30)
    { day: "Mittwoch", moderator: "Favour", room: "1", slot: "09:00", booking_code: "BC-1007", aussenslot_start: "10:45", aussenslot_end: "11:30" },
    { day: "Mittwoch", moderator: "Jasmin", room: "2", slot: "10:00", booking_code: "BC-1008", aussenslot_start: "11:45", aussenslot_end: "12:30" },
    { day: "Mittwoch", moderator: "Sascha", room: "3", slot: "13:00", booking_code: "BC-1009", aussenslot_start: "14:45", aussenslot_end: "15:30" },
    { day: "Mittwoch", moderator: "Alexa", room: "1", slot: "14:00", booking_code: "BC-1010", aussenslot_start: "15:45", aussenslot_end: "16:30" },
    // Donnerstag – 3 Schichten (AS: 11:15-12:00, 14:45-15:30, 15:45-16:30)
    { day: "Donnerstag", moderator: "Quynh", room: "1", slot: "09:30", booking_code: "BC-1011", aussenslot_start: "11:15", aussenslot_end: "12:00" },
    { day: "Donnerstag", moderator: "Vanessa", room: "2", slot: "13:00", booking_code: "BC-1012", aussenslot_start: "14:45", aussenslot_end: "15:30" },
    { day: "Donnerstag", moderator: "Hannah", room: "3", slot: "14:00", booking_code: "BC-1013", aussenslot_start: "15:45", aussenslot_end: "16:30" },
    // Freitag – 3 Schichten (AS: 10:45-11:30, 11:45-12:30, 16:45-17:30)
    { day: "Freitag", moderator: "Anvi", room: "1", slot: "09:00", booking_code: "BC-1014", aussenslot_start: "10:45", aussenslot_end: "11:30" },
    { day: "Freitag", moderator: "Favour", room: "2", slot: "10:00", booking_code: "BC-1015", aussenslot_start: "11:45", aussenslot_end: "12:30" },
    { day: "Freitag", moderator: "Jasmin", room: "1", slot: "15:00", booking_code: "BC-1016", aussenslot_start: "16:45", aussenslot_end: "17:30" },
    // Samstag – 2 Schichten (AS: 12:45-13:30, 13:45-14:30)
    { day: "Samstag", moderator: "Sascha", room: "1", slot: "11:00", booking_code: "BC-1017", aussenslot_start: "12:45", aussenslot_end: "13:30" },
    { day: "Samstag", moderator: "Quynh", room: "2", slot: "12:00", booking_code: "BC-1018", aussenslot_start: "13:45", aussenslot_end: "14:30" },
    // Sonntag – 1 Schicht (AS: 13:45-14:30)
    { day: "Sonntag", moderator: "Alexa", room: "1", slot: "12:00", booking_code: "BC-1019", aussenslot_start: "13:45", aussenslot_end: "14:30" },
  ],
  support: [
    { day: "Montag", person: "Hamed", start: "14:00", end: "22:00" },
    { day: "Dienstag", person: "Rehan", start: "14:00", end: "22:00" },
    { day: "Mittwoch", person: "Hamed", start: "13:00", end: "21:00" },
    { day: "Donnerstag", person: "Rehan", start: "14:00", end: "22:00" },
    { day: "Freitag", person: "Hamed", start: "12:00", end: "20:00" },
    { day: "Samstag", person: "Rehan", start: "11:00", end: "19:00" },
    { day: "Sonntag", person: "Hamed", start: "12:00", end: "18:00" },
  ],
};

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

  // Unlock button
  const unlockBtn = document.getElementById("btn-unlock-week");
  const isUnlocked = unlockedWeeks.has(unlockKey(adminWeekKW, adminWeekYear));
  const dlStatus = getDeadlineStatus(adminWeekKW, adminWeekYear);
  unlockBtn.style.display = "block";
  unlockBtn.textContent = isUnlocked ? "Frist wieder sperren" : "Frist aufheben";
  unlockBtn.className = `btn-unlock-week ${isUnlocked ? "unlocked" : ""}`;
  unlockBtn.onclick = () => {
    toggleWeekUnlock(adminWeekKW, adminWeekYear);
    loadAndRenderAdminShifts();
  };

  const cal = document.getElementById("admin-calendar");
  cal.innerHTML = '<div class="shift-loading">Lade Schichtplan...</div>';

  // Inject test week data for KW 13/2025
  const testKey = weekKeyStr(TEST_WEEK_KW, TEST_WEEK_YEAR);
  if (!shiftPlanCache[testKey]) shiftPlanCache[testKey] = TEST_PLAN_DATA;

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
  const room = shift.room ? roomName(shift.room) : "–";
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
        <span class="legend-dot mod" style="background:${personColor(mod)}"></span> ${mod}
      </div>
      ${supHtml.replace('<span class="legend-dot sup"></span>', `<span class="legend-dot sup" style="background:${supportForDay ? personColor(supportForDay.person) : 'var(--purple)'}"></span>`)}
    </div>
    <div class="admin-shift-code">${shift.booking_code || ""}</div>
  </div>`;
}

function renderAdminCalendar(planData, monday) {
  lastPlanDataAdmin = planData;
  lastMondayAdmin = monday;
  const cal = document.getElementById("admin-calendar");
  const isMobile = window.innerWidth < 768;
  if (viewModeAdmin === "agenda") {
    renderAgendaView(planData, monday, cal, null, "admin");
  } else {
    if (isMobile) renderDayTabs("admin");
    renderTimeGrid(planData.plan, monday, cal, null, planData.support, "admin");
  }
  const tabs = document.getElementById("agenda-day-tabs-admin");
  if (tabs) tabs.style.display = (viewModeAdmin === "agenda" || (viewModeAdmin === "grid" && isMobile)) ? "" : "none";
}

// ===== Agenda View =====
function initViewToggles() {
  ["shifts", "admin"].forEach((ctx) => {
    const toggle = document.getElementById(`view-toggle-${ctx}`);
    if (!toggle) return;
    const btns = toggle.querySelectorAll(".view-btn");
    const currentMode = ctx === "shifts" ? viewModeShifts : viewModeAdmin;
    btns.forEach((b) => {
      b.classList.toggle("active", b.dataset.view === currentMode);
      b.addEventListener("click", () => {
        btns.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        if (ctx === "shifts") {
          viewModeShifts = b.dataset.view;
          if (lastPlanDataShifts && lastMondayShifts) renderShiftCalendar(lastPlanDataShifts, lastMondayShifts);
        } else {
          viewModeAdmin = b.dataset.view;
          if (lastPlanDataAdmin && lastMondayAdmin) renderAdminCalendar(lastPlanDataAdmin, lastMondayAdmin);
        }
        syncAsButtons();
      });
    });
  });

  // Außenslot toggle buttons
  function syncAsButtons() {
    document.querySelectorAll(".as-toggle").forEach((b) => b.classList.toggle("active", showAussenSlots));
  }
  ["shifts", "admin"].forEach((ctx) => {
    const btn = document.getElementById(`as-toggle-${ctx}`);
    if (!btn) return;
    btn.addEventListener("click", () => {
      showAussenSlots = !showAussenSlots;
      syncAsButtons();
      if (ctx === "shifts" || lastPlanDataShifts) {
        if (lastPlanDataShifts && lastMondayShifts) renderShiftCalendar(lastPlanDataShifts, lastMondayShifts);
      }
      if (ctx === "admin" || lastPlanDataAdmin) {
        if (lastPlanDataAdmin && lastMondayAdmin) renderAdminCalendar(lastPlanDataAdmin, lastMondayAdmin);
      }
    });
  });

  // Swipe support for avail day list
  const availListEl = document.getElementById("avail-day-list");
  if (availListEl) {
    let startX = 0;
    availListEl.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    availListEl.addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) < 50) return;
      availDayIdx = Math.max(0, Math.min(6, availDayIdx + (diff < 0 ? 1 : -1)));
      renderAvailTable();
    }, { passive: true });
  }

  // Swipe support for agenda day tabs
  ["shift-calendar", "admin-calendar"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    let startX = 0;
    el.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      const ctx = id === "shift-calendar" ? "shifts" : "admin";
      const currentMode = ctx === "shifts" ? viewModeShifts : viewModeAdmin;
      // Swipe only for agenda view, not grid (grid uses day tabs on mobile)
      if (currentMode !== "agenda" || Math.abs(diff) < 50) return;
      const delta = diff < 0 ? 1 : -1;
      navigateAgendaDay(ctx, delta);
    }, { passive: true });
  });
}

let lastSwipeDir = null; // "left" or "right" for slide animation

function navigateAgendaDay(ctx, delta) {
  lastSwipeDir = delta > 0 ? "left" : "right";
  if (ctx === "shifts") {
    agendaDayShifts = Math.max(0, Math.min(6, agendaDayShifts + delta));
    if (lastPlanDataShifts && lastMondayShifts) renderShiftCalendar(lastPlanDataShifts, lastMondayShifts);
  } else {
    agendaDayAdmin = Math.max(0, Math.min(6, agendaDayAdmin + delta));
    if (lastPlanDataAdmin && lastMondayAdmin) renderAdminCalendar(lastPlanDataAdmin, lastMondayAdmin);
  }
  lastSwipeDir = null;
}

function renderDayTabs(ctx) {
  const tabsEl = document.getElementById(`agenda-day-tabs-${ctx}`);
  if (!tabsEl) return;
  const currentDay = ctx === "shifts" ? agendaDayShifts : agendaDayAdmin;
  const monday = ctx === "shifts" ? lastMondayShifts : lastMondayAdmin;
  const dayShorts = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  // Determine today's index relative to this week's monday
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let html = "";
  dayShorts.forEach((ds, i) => {
    const dayDate = monday ? new Date(monday) : new Date();
    if (monday) dayDate.setUTCDate(monday.getUTCDate() + i);
    const dateStr = monday ? `${String(dayDate.getUTCDate()).padStart(2, "0")}.${String(dayDate.getUTCMonth() + 1).padStart(2, "0")}.` : "";
    const dayDateStr = monday ? `${dayDate.getUTCFullYear()}-${String(dayDate.getUTCMonth() + 1).padStart(2, "0")}-${String(dayDate.getUTCDate()).padStart(2, "0")}` : "";
    const isToday = dayDateStr === todayStr;
    const classes = ["agenda-day-tab", i === currentDay ? "active" : "", isToday ? "today" : ""].filter(Boolean).join(" ");
    html += `<button class="${classes}" data-day="${i}">
      <span class="agenda-tab-day">${ds}</span>
      <span class="agenda-tab-date">${dateStr}</span>
    </button>`;
  });
  tabsEl.innerHTML = html;
  tabsEl.style.display = "";

  tabsEl.querySelectorAll(".agenda-day-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const day = parseInt(btn.dataset.day);
      if (ctx === "shifts") {
        agendaDayShifts = day;
        if (lastPlanDataShifts && lastMondayShifts) renderShiftCalendar(lastPlanDataShifts, lastMondayShifts);
      } else {
        agendaDayAdmin = day;
        if (lastPlanDataAdmin && lastMondayAdmin) renderAdminCalendar(lastPlanDataAdmin, lastMondayAdmin);
      }
    });
  });

  // Scroll active tab into view
  const activeTab = tabsEl.querySelector(".agenda-day-tab.active");
  if (activeTab) activeTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function renderAgendaView(planData, monday, container, filterName, ctx) {
  const plan = planData.plan || [];
  const supportEntries = planData.support || [];

  const dayShorts = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const dayFull = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const currentDay = ctx === "shifts" ? agendaDayShifts : agendaDayAdmin;

  // Show/hide day tabs
  renderDayTabs(ctx);

  // Filter shifts for selected day
  const displayPlan = filterName ? plan.filter((e) => e.moderator === filterName) : plan;
  const assigned = displayPlan.filter((e) => (e.day || "").trim() !== "");
  const hasDayData = assigned.length > 0;

  const dayShifts = hasDayData
    ? assigned.filter((e) => matchDay(e, dayFull[currentDay], dayShorts[currentDay]))
    : (currentDay === 0 ? displayPlan : []);

  // Support for this day
  const supportByDay = {};
  supportEntries.forEach((s) => {
    const d = (s.day || "").trim().toLowerCase();
    if (d) supportByDay[d] = s;
  });
  const daySup = supportByDay[dayFull[currentDay].toLowerCase()] || supportByDay[dayShorts[currentDay].toLowerCase()];
  const showSupport = daySup && daySup.start && daySup.end && (!filterName || daySup.person === filterName);

  // Check for user support days
  const userSupportDays = filterName ? supportEntries.filter((s) => s.person === filterName) : [];

  if (plan.length === 0 && supportEntries.length === 0) {
    container.innerHTML = '<div class="shift-empty">Kein Schichtplan für diese Woche vorhanden.</div>';
    return;
  }

  if (filterName && displayPlan.length === 0 && userSupportDays.length === 0) {
    container.innerHTML = '<div class="shift-empty">Keine Schichten für dich in dieser Woche.</div>';
    return;
  }

  // Build event list sorted by time
  const events = [];
  dayShifts.forEach((shift) => {
    const { startMin, endMin } = getShiftStartEnd(shift);
    events.push({ shift, startMin, endMin, type: "mod" });
  });
  if (showSupport) {
    const st = parseTimeToMinutes(daySup.start);
    const en = parseTimeToMinutes(daySup.end);
    if (st != null && en != null) {
      events.push({ shift: daySup, startMin: st, endMin: en, type: "sup" });
    }
  }
  events.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // Day header
  const dayDate = new Date(monday);
  dayDate.setUTCDate(monday.getUTCDate() + currentDay);
  const dayHeader = `${dayFull[currentDay]}, ${formatDateLong(dayDate)}`;

  const slideClass = lastSwipeDir ? ` slide-${lastSwipeDir}` : "";
  let html = `<div class="agenda-view${slideClass}">`;
  html += `<div class="agenda-day-header">${dayHeader}</div>`;

  if (events.length === 0) {
    html += `<div class="agenda-empty">Keine Schichten an diesem Tag</div>`;
  } else {
    events.forEach((ev) => {
      const { shift, startMin, endMin } = ev;
      const startTime = ev.type === "sup" ? formatTimeFromValue(shift.start) : formatTimeFromValue(shift.slot);
      const endTime = ev.type === "sup" ? formatTimeFromValue(shift.end)
        : formatTimeFromValue(shift.aussenslot_end || "");
      const duration = endMin - startMin;
      const durationStr = `${Math.floor(duration / 60)}h${duration % 60 > 0 ? ` ${duration % 60}min` : ""}`;

      if (ev.type === "sup") {
        html += `<div class="agenda-card agenda-sup" style="${personStyle(shift.person)}">
          <div class="agenda-card-accent"></div>
          <div class="agenda-card-body">
            <div class="agenda-card-header">
              <span class="agenda-card-time">${startTime} – ${endTime}</span>
              <span class="agenda-card-duration">${durationStr}</span>
            </div>
            <div class="agenda-card-title">${shift.person || ""}</div>
            <div class="agenda-card-meta">
              <span class="agenda-card-badge sup">Support</span>
            </div>
          </div>
        </div>`;
      } else {
        const room = shift.room ? roomName(shift.room) : "";
        const label = filterName ? room : (shift.moderator || "");
        const hasAussen = shift.aussenslot_start && shift.aussenslot_end;
        const aussenStr = hasAussen ? `AS ${formatTimeFromValue(shift.aussenslot_start)}–${formatTimeFromValue(shift.aussenslot_end)}` : "";

        html += `<div class="agenda-card agenda-mod" style="${personStyle(shift.moderator)}">
          <div class="agenda-card-accent"></div>
          <div class="agenda-card-body">
            <div class="agenda-card-header">
              <span class="agenda-card-time">${startTime}${endTime ? ` – ${endTime}` : ""}</span>
              <span class="agenda-card-duration">${durationStr}</span>
            </div>
            <div class="agenda-card-title">${label}</div>
            <div class="agenda-card-meta">
              <span class="agenda-card-badge mod">Moderator</span>
              ${room && !filterName ? `<span class="agenda-card-room">${room}</span>` : ""}
              ${shift.booking_code ? `<span class="agenda-card-code">${shift.booking_code}</span>` : ""}
            </div>
            ${hasAussen && !showAussenSlots ? `<div class="agenda-card-aussen"><span class="legend-dot aussen"></span> ${aussenStr}</div>` : ""}
          </div>
        </div>`;

        // Separate Außenslot card when AS mode is on
        if (hasAussen && showAussenSlots) {
          const asStart = formatTimeFromValue(shift.aussenslot_start);
          const asEnd = formatTimeFromValue(shift.aussenslot_end);
          const asStartMin = parseTimeToMinutes(shift.aussenslot_start);
          const asEndMin = parseTimeToMinutes(shift.aussenslot_end);
          const asDur = asEndMin - asStartMin;
          const asDurStr = `${Math.floor(asDur / 60)}h${asDur % 60 > 0 ? ` ${asDur % 60}min` : ""}`;
          html += `<div class="agenda-card agenda-aussen" style="${personStyle(shift.moderator)}">
            <div class="agenda-card-accent" style="background:#2dd4bf"></div>
            <div class="agenda-card-body">
              <div class="agenda-card-header">
                <span class="agenda-card-time">${asStart} – ${asEnd}</span>
                <span class="agenda-card-duration">${asDurStr}</span>
              </div>
              <div class="agenda-card-title">${shift.moderator || ""}</div>
              <div class="agenda-card-meta">
                <span class="agenda-card-badge" style="background:rgba(45,212,191,0.15);color:#2dd4bf">Außenslot</span>
                ${room ? `<span class="agenda-card-room">${room}</span>` : ""}
              </div>
            </div>
          </div>`;
        }
      }
    });
  }

  html += `</div>`;
  container.innerHTML = html;
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

// ===== Availability Overview (Admin) =====
function initAvailWeek() {
  const now = new Date();
  availWeekKW = getISOWeek(now);
  availWeekYear = getISOWeekYear(now);
  let lastMobile = isMobileAvail();
  window.addEventListener("resize", () => {
    const mobile = isMobileAvail();
    if (mobile !== lastMobile && availCache[`${availWeekKW}_${availWeekYear}`]) {
      lastMobile = mobile;
      renderAvailTable();
    }
  });
  loadAvailData();
}

function navigateAvailWeek(delta) {
  availWeekKW += delta;
  const maxWeeks = getISOWeeksInYear(availWeekYear);
  if (availWeekKW > maxWeeks) { availWeekKW = 1; availWeekYear++; }
  else if (availWeekKW < 1) { availWeekYear--; availWeekKW = getISOWeeksInYear(availWeekYear); }
  loadAvailData();
}

async function loadAvailData() {
  const titleEl = document.getElementById("avail-week-title");
  const rangeEl = document.getElementById("avail-date-range");
  const loadingEl = document.getElementById("avail-loading");
  const tableEl = document.getElementById("avail-table");

  titleEl.textContent = `KW ${availWeekKW}`;
  const monday = getMondayOfISOWeek(availWeekKW, availWeekYear);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  rangeEl.textContent = `${formatDate(monday)} – ${formatDate(sunday)}`;

  const cacheKey = `${availWeekKW}_${availWeekYear}`;
  if (availCache[cacheKey]) {
    renderAvailTable();
    return;
  }

  loadingEl.style.display = "block";
  tableEl.style.display = "none";

  try {
    const wk = weekKeyStr(availWeekKW, availWeekYear);
    const [weeklyRes, generalRes] = await Promise.all([
      gasPost("get_parsed_availability", { week: wk }),
      gasPost("get_parsed_availability", { week: "GENERAL" }),
    ]);
    availCache[cacheKey] = {
      weekly: weeklyRes.success && Array.isArray(weeklyRes.data) ? weeklyRes.data : [],
      general: generalRes.success && Array.isArray(generalRes.data) ? generalRes.data : [],
    };
  } catch (err) {
    console.error("Failed to load availability:", err);
    availCache[cacheKey] = { weekly: [], general: [] };
  }

  loadingEl.style.display = "none";
  renderAvailTable();
}

function isMobileAvail() { return window.innerWidth < 768; }

function renderAvailTable() {
  const tableEl = document.getElementById("avail-table");
  const listEl = document.getElementById("avail-day-list");
  const tabsEl = document.getElementById("avail-day-tabs");
  const cacheKey = `${availWeekKW}_${availWeekYear}`;
  const cached = availCache[cacheKey];
  if (!cached) return;

  const dayKeys = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const entries = availViewType === "weekly" ? cached.weekly : cached.general;

  if (isMobileAvail()) {
    // Mobile: day tabs + card list
    tableEl.style.display = "none";
    listEl.style.display = "";
    renderAvailDayTabs();

    const dk = dayKeys[availDayIdx];
    const dayFull = DAYS[availDayIdx];
    let html = `<h4 class="avail-day-title">${dayFull}</h4>`;

    TEAM.forEach(member => {
      const entry = entries.find(e => e.Name === member.name);
      const fallback = availViewType === "general" && GENERAL_DEFAULTS[member.name];
      let val = entry ? entry[dk] : null;
      if (!val && fallback) val = fallback[dk];
      const cls = availCellClass(val);
      const label = availCellLabel(val);
      const icon = cls === "avail-full" ? "&#10003;" : cls === "avail-partial" ? "&#9201;" : "&#10005;";

      html += `<div class="avail-card ${cls}">
        <span class="avail-card-icon">${icon}</span>
        <span class="avail-card-name">${member.name}</span>
        <span class="avail-card-val">${label}</span>
      </div>`;
    });

    listEl.innerHTML = html;
  } else {
    // Desktop: full table
    tableEl.style.display = "";
    listEl.style.display = "none";
    tabsEl.style.display = "none";

    let html = `<thead><tr><th>Name</th>`;
    dayKeys.forEach(d => { html += `<th>${d}</th>`; });
    html += `</tr></thead><tbody>`;

    TEAM.forEach(member => {
      const entry = entries.find(e => e.Name === member.name);
      const fallback = availViewType === "general" && GENERAL_DEFAULTS[member.name];

      html += `<tr><td class="avail-name">${member.name}</td>`;
      dayKeys.forEach(d => {
        let val = entry ? entry[d] : null;
        if (!val && fallback) val = fallback[d];
        html += `<td class="avail-cell ${availCellClass(val)}">${availCellLabel(val)}</td>`;
      });
      html += `</tr>`;
    });

    html += `</tbody>`;
    tableEl.innerHTML = html;
  }
}

function renderAvailDayTabs() {
  const tabsEl = document.getElementById("avail-day-tabs");
  if (!tabsEl) return;
  const monday = getMondayOfISOWeek(availWeekKW, availWeekYear);
  const dayShorts = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let html = "";
  dayShorts.forEach((ds, i) => {
    const dayDate = new Date(monday);
    dayDate.setUTCDate(monday.getUTCDate() + i);
    const dateStr = `${String(dayDate.getUTCDate()).padStart(2, "0")}.${String(dayDate.getUTCMonth() + 1).padStart(2, "0")}.`;
    const dayDateStr = `${dayDate.getUTCFullYear()}-${String(dayDate.getUTCMonth() + 1).padStart(2, "0")}-${String(dayDate.getUTCDate()).padStart(2, "0")}`;
    const isToday = dayDateStr === todayStr;
    const classes = ["agenda-day-tab", i === availDayIdx ? "active" : "", isToday ? "today" : ""].filter(Boolean).join(" ");
    html += `<button class="${classes}" data-day="${i}">
      <span class="agenda-tab-day">${ds}</span>
      <span class="agenda-tab-date">${dateStr}</span>
    </button>`;
  });
  tabsEl.innerHTML = html;
  tabsEl.style.display = "";

  tabsEl.querySelectorAll(".agenda-day-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      availDayIdx = parseInt(btn.dataset.day);
      renderAvailTable();
    });
  });

  const activeTab = tabsEl.querySelector(".agenda-day-tab.active");
  if (activeTab) activeTab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

function availCellClass(val) {
  if (!val || val === "Nicht") return "avail-no";
  if (val === "Voll") return "avail-full";
  return "avail-partial";
}

function availCellLabel(val) {
  if (!val || val === "Nicht") return "—";
  if (val === "Voll") return "Voll";
  return val.replace("-", "–");
}

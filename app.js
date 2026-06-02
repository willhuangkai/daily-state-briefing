const STORAGE_KEY = "daily-state-briefing-log";
const TESTER_KEY = "daily-state-briefing-tester";
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwIPfH14BmXWhQYU2ygimM4inE3x18D8-pqF6DtHMoF7uIFrNG3NcmoTwd8nZJe29uIYw/exec";

const testerForm = document.querySelector("#tester-form");
const testerNameInput = document.querySelector("#tester-name");
const testerStatus = document.querySelector("#tester-status");
const morningForm = document.querySelector("#morning-form");
const nightForm = document.querySelector("#night-form");
const morningReport = document.querySelector("#morning-report");
const nightReport = document.querySelector("#night-report");
const testingLog = document.querySelector("#testing-log");
const clearLogButton = document.querySelector("#clear-log");
const energyInput = document.querySelector("#energy");
const pressureInput = document.querySelector("#pressure");
const energyValue = document.querySelector("#energy-value");
const pressureValue = document.querySelector("#pressure-value");

const statusCopy = {
  "Mental Overload": {
    explanation: "Pressure and input are both high, so your brain is likely carrying too many open loops.",
    decision: "Pick one task that matters, close extra tabs, and avoid context switching until it is done."
  },
  "Low Recovery": {
    explanation: "Sleep or energy is low enough that normal work may feel slow, foggy, or heavier than usual.",
    decision: "Do the minimum useful version of the day and make recovery the main plan tonight."
  },
  "Dopamine Scatter": {
    explanation: "Screen input is pulling your attention toward quick hits, which can make steady work feel irritating.",
    decision: "Do one 25-minute block before feeds, messages, or short-form input."
  },
  "Stable Focus": {
    explanation: "Energy, pressure, and input look balanced enough for clean work without much extra friction.",
    decision: "Use your best attention on the highest-value task before taking on new commitments."
  },
  "Burnout Drift": {
    explanation: "Energy is low while pressure is still high, which points to slow drain rather than a single bad moment.",
    decision: "Lower the bar, remove one obligation if possible, and end the day earlier than usual."
  }
};

function getLog() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveLog(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  renderLog();
}

function isGoogleSheetsConfigured() {
  return GOOGLE_SHEETS_WEB_APP_URL.startsWith("https://script.google.com/");
}

function sendLogEntryToGoogleSheets(entry, eventName) {
  if (!isGoogleSheetsConfigured()) return;

  const payload = JSON.stringify({
    eventName,
    submittedAt: new Date().toISOString(),
    pageUrl: window.location.href,
    entry
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    if (navigator.sendBeacon(GOOGLE_SHEETS_WEB_APP_URL, blob)) {
      return;
    }
  }

  fetch(GOOGLE_SHEETS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: payload
  }).catch(() => {
    // localStorage remains the backup if the network request fails.
  });
}

function getTesterName() {
  return localStorage.getItem(TESTER_KEY) || "";
}

function getDisplayTesterName() {
  return getTesterName().trim() || "Unnamed tester";
}

function getLocalDate() {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function updateTesterUI() {
  const testerName = getTesterName();
  testerNameInput.value = testerName;
  testerStatus.textContent = testerName ? `Saved: ${testerName}` : "No tester saved yet.";
}

function addLogEntry(entry) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const entries = getLog();
  const logEntry = {
    id,
    localDate: getLocalDate(),
    tester: getDisplayTesterName(),
    ...entry,
    feedback: {
      accurate: null,
      willFollow: null,
      followUp: null
    },
    createdAt: new Date().toLocaleString()
  };
  entries.unshift(logEntry);
  saveLog(entries.slice(0, 30));
  sendLogEntryToGoogleSheets(logEntry, "report_submission");
  return id;
}

function updateFeedback(entryId, field, value) {
  const entries = getLog();
  let syncedEntry = null;
  const updated = entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    syncedEntry = {
      ...entry,
      feedback: {
        accurate: null,
        willFollow: null,
        followUp: null,
        ...entry.feedback,
        [field]: value
      }
    };
    return syncedEntry;
  });
  saveLog(updated);
  if (syncedEntry) {
    sendLogEntryToGoogleSheets(syncedEntry, "feedback_update");
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderFeedback(entryId, type) {
  const fields = [
    ["accurate", "Was this accurate?"],
    ["willFollow", "Will you follow the decision?"],
    ["followUp", "Do you want to ask a follow-up?"]
  ];

  return `
    <form class="feedback-form" data-entry-id="${entryId}">
      ${fields
        .map(
          ([field, label]) => `
            <fieldset class="feedback-group">
              <legend>${label}</legend>
              <label class="choice-pill">
                <input type="radio" name="${type}-${entryId}-${field}" value="yes" data-feedback-field="${field}">
                Yes
              </label>
              <label class="choice-pill">
                <input type="radio" name="${type}-${entryId}-${field}" value="no" data-feedback-field="${field}">
                No
              </label>
            </fieldset>
          `
        )
        .join("")}
    </form>
  `;
}

function renderReport(target, rows, entryId, type) {
  target.innerHTML = `
    <div class="report-grid">
      ${rows
        .map(
          (row) => `
            <div class="report-row">
              <span class="report-label">${escapeHTML(row.label)}</span>
              <p class="report-value">${escapeHTML(row.value)}</p>
            </div>
          `
        )
        .join("")}
    </div>
    ${renderFeedback(entryId, type)}
  `;
}

function scoreSleep(sleep) {
  if (sleep === "lt5") return 1;
  if (sleep === "5to6") return 2;
  if (sleep === "6to7") return 3;
  return 4;
}

function generateTodayStatus({ sleep, energy, pressure, screenInput }) {
  const sleepScore = scoreSleep(sleep);
  const inputIsHigh = screenInput === "high" || screenInput === "extreme";

  if (energy <= 2 && pressure >= 4) return "Burnout Drift";
  if (sleepScore <= 2 || energy <= 2) return "Low Recovery";
  if (pressure >= 4 && inputIsHigh) return "Mental Overload";
  if (screenInput === "extreme" || (inputIsHigh && energy >= 3)) return "Dopamine Scatter";
  if (energy >= 4 && pressure <= 3 && !inputIsHigh) return "Stable Focus";
  if (pressure >= 4) return "Mental Overload";
  return "Stable Focus";
}

function buildMorningCopy(state, { sleep, energy, pressure, screenInput }) {
  const sleepLabels = {
    lt5: "less than 5 hours of sleep",
    "5to6": "5-6 hours of sleep",
    "6to7": "6-7 hours of sleep",
    "7plus": "7+ hours of sleep"
  };
  const inputLabels = {
    low: "low screen input",
    normal: "normal screen input",
    high: "high screen input",
    extreme: "extreme screen input"
  };
  const base = statusCopy[state];

  return {
    explanation: `${base.explanation} Today shows ${sleepLabels[sleep]}, energy ${energy}/5, pressure ${pressure}/5, and ${inputLabels[screenInput]}.`,
    decision: base.decision
  };
}

function classifyNightState({ drain, felt, useful }) {
  const hasFog = felt.includes("brain fog");
  const hasIrritation = felt.includes("irritation");
  const hasRestlessness = felt.includes("restlessness");

  if (drain === "low-recovery" || (hasFog && useful === "no")) return "Low Recovery";
  if (drain === "screens" || hasRestlessness) return "Dopamine Scatter";
  if (drain === "switching" || (hasFog && hasIrritation)) return "Mental Overload";
  if ((drain === "people" || drain === "unclear-work") && useful === "no") return "Burnout Drift";
  if (!felt.length && useful === "yes") return "Stable Focus";
  if (hasIrritation && useful !== "yes") return "Burnout Drift";
  return "Mental Overload";
}

function generateNightReport({ drain, felt, useful, worry }) {
  const feltText = felt.length ? felt.join(", ") : "no major fog, irritation, or restlessness";
  const drainLabels = {
    switching: "too much switching",
    people: "people pressure",
    screens: "screen input",
    "low-recovery": "low recovery",
    "unclear-work": "unclear work"
  };
  const usefulText = {
    yes: "The morning decision seems worth repeating.",
    somewhat: "The morning decision helped a little, but it may need to be simpler.",
    no: "The morning decision did not fit the day. Tomorrow needs a more conservative call."
  };
  const state = classifyNightState({ drain, felt, useful });
  const tomorrow = worry.trim()
    ? `Tomorrow, reduce friction around "${worry.trim()}" before the day starts.`
    : "Tomorrow, choose the first useful task before opening new input.";

  return {
    state,
    explanation: `The main drain was ${drainLabels[drain]}. You noticed ${feltText}. ${usefulText[useful]}`,
    decision: tomorrow,
    mainDrain: drainLabels[drain]
  };
}

function renderLog() {
  const entries = getLog();

  if (!entries.length) {
    testingLog.innerHTML = '<p class="empty-state">No reports saved yet.</p>';
    return;
  }

  testingLog.innerHTML = `
    <div class="log-table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Tester</th>
            <th>Report type</th>
            <th>State</th>
            <th>Accurate</th>
            <th>Will follow</th>
            <th>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (entry) => `
                <tr>
                  <td>${escapeHTML(entry.localDate || entry.createdAt || "not set")}</td>
                  <td>${escapeHTML(entry.tester || "Unnamed tester")}</td>
                  <td>${escapeHTML(entry.type)}</td>
                  <td>${escapeHTML(entry.state)}</td>
                  <td>${escapeHTML(entry.feedback?.accurate || "not set")}</td>
                  <td>${escapeHTML(entry.feedback?.willFollow || "not set")}</td>
                  <td>${escapeHTML(entry.feedback?.followUp || "not set")}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function updateRangeLabels() {
  energyValue.textContent = energyInput.value;
  pressureValue.textContent = pressureInput.value;
}

energyInput.addEventListener("input", updateRangeLabels);
pressureInput.addEventListener("input", updateRangeLabels);

testerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  localStorage.setItem(TESTER_KEY, testerNameInput.value.trim());
  updateTesterUI();
});

morningForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = {
    sleep: document.querySelector("#sleep").value,
    energy: Number(energyInput.value),
    pressure: Number(pressureInput.value),
    screenInput: document.querySelector("#screen-input").value
  };
  const state = generateTodayStatus(data);
  const report = buildMorningCopy(state, data);
  const entryId = addLogEntry({
    type: "Morning",
    state,
    explanation: report.explanation,
    decision: report.decision,
    inputs: data
  });

  renderReport(morningReport, [
    { label: "State", value: state },
    { label: "Explanation", value: report.explanation },
    { label: "Decision", value: report.decision }
  ], entryId, "morning");
});

nightForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = {
    drain: document.querySelector("#drain").value,
    felt: Array.from(document.querySelectorAll('input[name="felt"]:checked')).map(
      (input) => input.value
    ),
    useful: document.querySelector("#useful").value,
    worry: document.querySelector("#tomorrow-worry").value
  };
  const report = generateNightReport(data);
  const entryId = addLogEntry({
    type: "Night",
    state: report.state,
    explanation: report.explanation,
    decision: report.decision,
    inputs: data
  });

  renderReport(nightReport, [
    { label: "State", value: report.state },
    { label: "Explanation", value: report.explanation },
    { label: "Decision", value: report.decision }
  ], entryId, "night");
});

document.addEventListener("change", (event) => {
  const field = event.target.dataset.feedbackField;
  if (!field) return;

  const feedbackForm = event.target.closest(".feedback-form");
  updateFeedback(feedbackForm.dataset.entryId, field, event.target.value);
});

clearLogButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderLog();
});

updateTesterUI();
updateRangeLabels();
renderLog();

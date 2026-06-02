const STORAGE_KEY = "daily-state-briefing-log";
const TESTER_KEY = "daily-state-briefing-tester";
const AGE_RANGE_KEY = "daily-state-briefing-age-range";
const ROLE_KEY = "daily-state-briefing-role";
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwIPfH14BmXWhQYU2ygimM4inE3x18D8-pqF6DtHMoF7uIFrNG3NcmoTwd8nZJe29uIYw/exec";

const testerForm = document.querySelector("#tester-form");
const testerNameInput = document.querySelector("#tester-name");
const ageRangeInput = document.querySelector("#age-range");
const testerRoleInput = document.querySelector("#tester-role");
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

const STATES = {
  overload: "脑力过载 / Mental Overload",
  recovery: "恢复不足 / Low Recovery",
  scatter: "注意力飘散 / Dopamine Scatter",
  stable: "稳定专注 / Stable Focus",
  burnout: "精力透支 / Burnout Drift"
};

const statusCopy = {
  [STATES.overload]: {
    explanation: "压力和输入都偏高，你的大脑可能同时挂着太多未完成的事情。 / Pressure and input are both high, so your brain is likely carrying too many open loops.",
    decision: "先选一个最重要的任务，关掉多余输入，在完成前尽量不要切换。 / Pick one task that matters, close extra tabs, and avoid context switching until it is done."
  },
  [STATES.recovery]: {
    explanation: "睡眠或精力偏低，正常工作今天可能会显得更慢、更重、更容易脑雾。 / Sleep or energy is low enough that normal work may feel slow, foggy, or heavier than usual.",
    decision: "今天做最低限度但有用的版本，晚上把恢复放在第一位。 / Do the minimum useful version of the day and make recovery the main plan tonight."
  },
  [STATES.scatter]: {
    explanation: "屏幕输入正在把注意力拉向快速刺激，稳定工作可能会更容易烦躁。 / Screen input is pulling your attention toward quick hits, which can make steady work feel irritating.",
    decision: "先做一个25分钟专注块，再打开信息流、消息或短内容。 / Do one 25-minute block before feeds, messages, or short-form input."
  },
  [STATES.stable]: {
    explanation: "精力、压力和输入相对平衡，今天适合做清晰、重要的工作。 / Energy, pressure, and input look balanced enough for clean work without much extra friction.",
    decision: "先把最好的注意力给最高价值任务，再接受新的安排。 / Use your best attention on the highest-value task before taking on new commitments."
  },
  [STATES.burnout]: {
    explanation: "精力低但压力还在，这更像持续消耗，而不是单个糟糕时刻。 / Energy is low while pressure is still high, which points to slow drain rather than a single bad moment.",
    decision: "降低今天的标准，能删掉一个义务就删掉，并尽量早点结束。 / Lower the bar, remove one obligation if possible, and end the day earlier than usual."
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

function getAgeRange() {
  return localStorage.getItem(AGE_RANGE_KEY) || "";
}

function getTesterRole() {
  return localStorage.getItem(ROLE_KEY) || "";
}

function getDisplayTesterName() {
  return getTesterName().trim() || "未命名测试者 / Unnamed tester";
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
  const ageRange = getAgeRange();
  const role = getTesterRole();
  testerNameInput.value = testerName;
  ageRangeInput.value = ageRange;
  testerRoleInput.value = role;
  testerStatus.textContent = testerName ? `已保存 / Saved: ${testerName}` : "还没有保存测试者 / No tester saved yet.";
}

function addLogEntry(entry) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const entries = getLog();
  const logEntry = {
    id,
    localDate: getLocalDate(),
    tester: getDisplayTesterName(),
    ageRange: getAgeRange(),
    role: getTesterRole(),
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

function formatFeedbackValue(value) {
  if (value === "yes") return "是 / Yes";
  if (value === "no") return "否 / No";
  return "未设置 / not set";
}

function renderFeedback(entryId, type) {
  const fields = [
    ["accurate", "这个判断准确吗？ / Was this accurate?"],
    ["willFollow", "你会执行这个决定吗？ / Will you follow the decision?"],
    ["followUp", "你想问后续问题吗？ / Do you want to ask a follow-up?"]
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
                是 / Yes
              </label>
              <label class="choice-pill">
                <input type="radio" name="${type}-${entryId}-${field}" value="no" data-feedback-field="${field}">
                否 / No
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

  if (energy <= 2 && pressure >= 4) return STATES.burnout;
  if (sleepScore <= 2 || energy <= 2) return STATES.recovery;
  if (pressure >= 4 && inputIsHigh) return STATES.overload;
  if (screenInput === "extreme" || (inputIsHigh && energy >= 3)) return STATES.scatter;
  if (energy >= 4 && pressure <= 3 && !inputIsHigh) return STATES.stable;
  if (pressure >= 4) return STATES.overload;
  return STATES.stable;
}

function buildMorningCopy(state, { sleep, energy, pressure, screenInput }) {
  const sleepLabels = {
    lt5: "少于5小时睡眠 / less than 5 hours of sleep",
    "5to6": "5-6小时睡眠 / 5-6 hours of sleep",
    "6to7": "6-7小时睡眠 / 6-7 hours of sleep",
    "7plus": "7小时以上睡眠 / 7+ hours of sleep"
  };
  const inputLabels = {
    low: "低屏幕输入 / low screen input",
    normal: "正常屏幕输入 / normal screen input",
    high: "高屏幕输入 / high screen input",
    extreme: "极高屏幕输入 / extreme screen input"
  };
  const base = statusCopy[state];

  return {
    explanation: `${base.explanation} 今天的数据是：${sleepLabels[sleep]}，精力 ${energy}/5，压力 ${pressure}/5，${inputLabels[screenInput]}。 / Today shows ${sleepLabels[sleep]}, energy ${energy}/5, pressure ${pressure}/5, and ${inputLabels[screenInput]}.`,
    decision: base.decision
  };
}

function classifyNightState({ drain, felt, useful }) {
  const hasFog = felt.includes("brain fog");
  const hasIrritation = felt.includes("irritation");
  const hasRestlessness = felt.includes("restlessness");

  if (drain === "low-recovery" || (hasFog && useful === "no")) return STATES.recovery;
  if (drain === "screens" || hasRestlessness) return STATES.scatter;
  if (drain === "switching" || (hasFog && hasIrritation)) return STATES.overload;
  if ((drain === "people" || drain === "unclear-work") && useful === "no") return STATES.burnout;
  if (!felt.length && useful === "yes") return STATES.stable;
  if (hasIrritation && useful !== "yes") return STATES.burnout;
  return STATES.overload;
}

function generateNightReport({ drain, felt, useful, worry }) {
  const feltLabels = {
    "brain fog": "脑雾 / brain fog",
    irritation: "烦躁 / irritation",
    restlessness: "坐不住 / restlessness"
  };
  const feltText = felt.length
    ? felt.map((item) => feltLabels[item] || item).join(", ")
    : "没有明显脑雾、烦躁或坐不住 / no major fog, irritation, or restlessness";
  const drainLabels = {
    switching: "切换太多 / too much switching",
    people: "人际压力 / people pressure",
    screens: "屏幕输入 / screen input",
    "low-recovery": "恢复不足 / low recovery",
    "unclear-work": "工作不清晰 / unclear work"
  };
  const usefulText = {
    yes: "早晨决定值得继续使用。 / The morning decision seems worth repeating.",
    somewhat: "早晨决定有一点帮助，但明天可能需要更简单。 / The morning decision helped a little, but it may need to be simpler.",
    no: "早晨决定不太适合今天，明天需要更保守一点。 / The morning decision did not fit the day. Tomorrow needs a more conservative call."
  };
  const state = classifyNightState({ drain, felt, useful });
  const tomorrow = worry.trim()
    ? `明天开始前，先降低这件事的阻力："${worry.trim()}"。 / Tomorrow, reduce friction around "${worry.trim()}" before the day starts.`
    : "明天先选第一个有用任务，再打开新的输入。 / Tomorrow, choose the first useful task before opening new input.";

  return {
    state,
    explanation: `今天主要消耗来自 ${drainLabels[drain]}。你注意到 ${feltText}。${usefulText[useful]} / The main drain was ${drainLabels[drain]}. You noticed ${feltText}. ${usefulText[useful]}`,
    decision: tomorrow,
    mainDrain: drainLabels[drain]
  };
}

function renderLog() {
  const entries = getLog();

  if (!entries.length) {
    testingLog.innerHTML = '<p class="empty-state">还没有保存报告。 / No reports saved yet.</p>';
    return;
  }

  testingLog.innerHTML = `
    <div class="log-table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th>日期 / Date</th>
            <th>测试者 / Tester</th>
            <th>年龄 / Age</th>
            <th>角色 / Role</th>
            <th>报告 / Report type</th>
            <th>状态 / State</th>
            <th>准确 / Accurate</th>
            <th>会执行 / Will follow</th>
            <th>追问 / Follow-up</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (entry) => `
                <tr>
                  <td>${escapeHTML(entry.localDate || entry.createdAt || "not set")}</td>
                  <td>${escapeHTML(entry.tester || "未命名测试者 / Unnamed tester")}</td>
                  <td>${escapeHTML(entry.ageRange || "")}</td>
                  <td>${escapeHTML(entry.role || "")}</td>
                  <td>${escapeHTML(entry.type)}</td>
                  <td>${escapeHTML(entry.state)}</td>
                  <td>${escapeHTML(formatFeedbackValue(entry.feedback?.accurate))}</td>
                  <td>${escapeHTML(formatFeedbackValue(entry.feedback?.willFollow))}</td>
                  <td>${escapeHTML(formatFeedbackValue(entry.feedback?.followUp))}</td>
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
  localStorage.setItem(AGE_RANGE_KEY, ageRangeInput.value);
  localStorage.setItem(ROLE_KEY, testerRoleInput.value);
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
    type: "早晨 / Morning",
    state,
    explanation: report.explanation,
    decision: report.decision,
    inputs: data
  });

  renderReport(morningReport, [
    { label: "状态 / State", value: state },
    { label: "解释 / Explanation", value: report.explanation },
    { label: "决定 / Decision", value: report.decision }
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
    type: "夜晚 / Night",
    state: report.state,
    explanation: report.explanation,
    decision: report.decision,
    inputs: data
  });

  renderReport(nightReport, [
    { label: "状态 / State", value: report.state },
    { label: "解释 / Explanation", value: report.explanation },
    { label: "决定 / Decision", value: report.decision }
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

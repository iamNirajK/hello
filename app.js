const STORAGE_KEY = "privacy-suite-data";
const HISTORY_LIMIT = 200;

const calcInput = document.getElementById("calcInput");
const calcOutput = document.getElementById("calcOutput");
const basicPad = document.getElementById("basicPad");
const scientificPad = document.getElementById("scientificPad");
const financialPad = document.getElementById("financialPad");
const converterPad = document.getElementById("converterPad");
const formulaList = document.getElementById("formulaList");
const historyList = document.getElementById("historyList");
const historySearch = document.getElementById("historySearch");
const monthlySummary = document.getElementById("monthlySummary");
const calendarGrid = document.getElementById("calendarGrid");
const currentPeriod = document.getElementById("currentPeriod");
const eventList = document.getElementById("eventList");

const eventDate = document.getElementById("eventDate");
const eventTime = document.getElementById("eventTime");
const eventTitle = document.getElementById("eventTitle");
const eventColor = document.getElementById("eventColor");
const eventRepeat = document.getElementById("eventRepeat");

const notesArea = document.getElementById("notesArea");
const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");

const pomodoroDisplay = document.getElementById("pomodoroDisplay");
const stopwatchDisplay = document.getElementById("stopwatchDisplay");
const clockDisplay = document.getElementById("clockDisplay");

const themeToggle = document.getElementById("themeToggle");

const baseData = {
  theme: "dark",
  history: [],
  formulas: [],
  events: [],
  notes: "",
  todos: [],
  calcsByDate: {},
  notifiedEvents: {},
};

let data = loadData();
let selectedDate = new Date();
let calendarView = "month";
let pomodoroTimer = null;
let pomodoroSeconds = 1500;
let stopwatchTimer = null;
let stopwatchSeconds = 0;

const holidayMap = {
  "2024-01-26": "Republic Day",
  "2024-08-15": "Independence Day",
  "2024-10-02": "Gandhi Jayanti",
  "2024-11-01": "Diwali",
  "2025-01-26": "Republic Day",
  "2025-08-15": "Independence Day",
  "2025-10-02": "Gandhi Jayanti",
  "2025-10-20": "Diwali",
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...baseData };
  try {
    return { ...baseData, ...JSON.parse(raw) };
  } catch {
    return { ...baseData };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function updateTheme() {
  document.body.classList.toggle("theme-light", data.theme === "light");
  document.body.classList.toggle("theme-dark", data.theme === "dark");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
}

function createButton(label, value, extraClass) {
  const btn = document.createElement("button");
  btn.textContent = label;
  if (extraClass) btn.classList.add(extraClass);
  btn.addEventListener("click", () => handleCalcInput(value || label));
  return btn;
}

function handleCalcInput(value) {
  if (value === "CLEAR") {
    calcInput.value = "";
    calcOutput.textContent = "0";
    return;
  }
  if (value === "BACK") {
    calcInput.value = calcInput.value.slice(0, -1);
    return;
  }
  if (value === "=") {
    const expression = calcInput.value.trim();
    if (!expression) return;
    const result = evaluateExpression(expression);
    calcOutput.textContent = result;
    addHistory(expression, result);
    return;
  }
  if (value === "ANS") {
    calcInput.value += calcOutput.textContent;
    return;
  }
  calcInput.value += value;
}

function evaluateExpression(expression) {
  const sanitized = expression
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .replace(/\^/g, "**")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\be\b/gi, "Math.E")
    .replace(/sin/gi, "Math.sin")
    .replace(/cos/gi, "Math.cos")
    .replace(/tan/gi, "Math.tan")
    .replace(/log/gi, "Math.log10")
    .replace(/sqrt/gi, "Math.sqrt");

  const normalized = sanitized.replace(/Math\./g, "");
  if (!/^[0-9+\-*/().\sPIElog10sqrtincota%]+$/.test(normalized)) {
    return "Invalid";
  }
  try {
    const value = Function(`"use strict"; return (${sanitized})`)();
    return Number.isFinite(value) ? value.toString() : "Error";
  } catch {
    return "Error";
  }
}

function addHistory(expression, result) {
  const entry = {
    id: crypto.randomUUID(),
    expression,
    result,
    timestamp: new Date().toISOString(),
  };
  data.history = [entry, ...data.history].slice(0, HISTORY_LIMIT);
  data.lastCalculation = entry;
  saveData();
  renderHistory();
}

function renderHistory() {
  const query = historySearch.value.toLowerCase();
  historyList.innerHTML = "";
  const filtered = data.history.filter(
    (entry) =>
      entry.expression.toLowerCase().includes(query) ||
      entry.result.toString().toLowerCase().includes(query)
  );
  filtered.forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${entry.expression}</strong> = ${entry.result}<br />
        <small>${new Date(entry.timestamp).toLocaleString()}</small>
      </div>
      <button class="chip">Reuse</button>
    `;
    li.querySelector("button").addEventListener("click", () => {
      calcInput.value = entry.expression;
      calcOutput.textContent = entry.result;
    });
    historyList.appendChild(li);
  });
}

function renderFormulas() {
  formulaList.innerHTML = "";
  data.formulas.forEach((formula) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${formula.name}</strong><br />
        <small>${formula.expression}</small>
      </div>
      <div class="actions">
        <button class="chip">Use</button>
        <button class="chip">Delete</button>
      </div>
    `;
    const [useBtn, deleteBtn] = li.querySelectorAll("button");
    useBtn.addEventListener("click", () => {
      calcInput.value = formula.expression;
    });
    deleteBtn.addEventListener("click", () => {
      data.formulas = data.formulas.filter((item) => item.id !== formula.id);
      saveData();
      renderFormulas();
    });
    formulaList.appendChild(li);
  });
}

function renderTodos() {
  todoList.innerHTML = "";
  data.todos.forEach((todo) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <label>
        <input type="checkbox" ${todo.done ? "checked" : ""} />
        <span>${todo.text}</span>
      </label>
      <button class="chip">Delete</button>
    `;
    const checkbox = li.querySelector("input");
    checkbox.addEventListener("change", () => {
      todo.done = checkbox.checked;
      saveData();
    });
    li.querySelector("button").addEventListener("click", () => {
      data.todos = data.todos.filter((item) => item.id !== todo.id);
      saveData();
      renderTodos();
    });
    todoList.appendChild(li);
  });
}

function buildKeypads() {
  const basicButtons = [
    "7",
    "8",
    "9",
    "÷",
    "4",
    "5",
    "6",
    "×",
    "1",
    "2",
    "3",
    "-",
    "0",
    ".",
    "%",
    "+",
    "(",
    ")",
    "ANS",
    "=",
  ];
  basicButtons.forEach((label) => {
    const btn = createButton(label, label, label === "=" ? "primary" : "");
    basicPad.appendChild(btn);
  });
  basicPad.appendChild(createButton("Clear", "CLEAR", "secondary"));
  basicPad.appendChild(createButton("Back", "BACK", "secondary"));

  const sciButtons = [
    ["sin(", "sin("],
    ["cos(", "cos("],
    ["tan(", "tan("],
    ["log(", "log("],
    ["sqrt(", "sqrt("],
    ["x^y", "^"],
    ["π", "pi"],
    ["e", "e"],
  ];
  sciButtons.forEach(([label, value]) => {
    scientificPad.appendChild(createButton(label, value, "secondary"));
  });

  const financeLayout = `
    <div class="finance-grid">
      <label>Calculator Type
        <select id="financeType">
          <option value="gst">GST</option>
          <option value="emi">EMI</option>
          <option value="loan">Loan Interest</option>
          <option value="profit">Profit / Loss</option>
          <option value="discount">Discount</option>
          <option value="percentage">Percentage</option>
        </select>
      </label>
      <input id="financeA" placeholder="Value A" />
      <input id="financeB" placeholder="Value B" />
      <input id="financeC" placeholder="Value C" />
      <button id="financeCalculate">Calculate</button>
      <div id="financeResult">Enter values to calculate.</div>
    </div>
  `;
  financialPad.innerHTML = financeLayout;

  const converterLayout = `
    <label>Category
      <select id="convertCategory">
        <option value="length">Length</option>
        <option value="weight">Weight</option>
        <option value="time">Time</option>
        <option value="data">Data</option>
      </select>
    </label>
    <div class="converter-row">
      <input id="convertInput" placeholder="Value" />
      <select id="convertFrom"></select>
    </div>
    <div class="converter-row">
      <input id="convertOutput" placeholder="Result" readonly />
      <select id="convertTo"></select>
    </div>
    <button id="convertSwap">Swap</button>
  `;
  converterPad.innerHTML = converterLayout;
}

const unitMap = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    ft: 0.3048,
    in: 0.0254,
  },
  weight: {
    kg: 1,
    g: 0.001,
    lb: 0.453592,
    oz: 0.0283495,
  },
  time: {
    s: 1,
    min: 60,
    hr: 3600,
    day: 86400,
  },
  data: {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
  },
};

function setupConverter() {
  const category = document.getElementById("convertCategory");
  const from = document.getElementById("convertFrom");
  const to = document.getElementById("convertTo");
  const input = document.getElementById("convertInput");
  const output = document.getElementById("convertOutput");
  const swap = document.getElementById("convertSwap");

  const populateUnits = () => {
    const units = Object.keys(unitMap[category.value]);
    from.innerHTML = units.map((unit) => `<option value="${unit}">${unit}</option>`).join("");
    to.innerHTML = units.map((unit) => `<option value="${unit}">${unit}</option>`).join("");
  };

  const convert = () => {
    const value = parseFloat(input.value);
    if (Number.isNaN(value)) {
      output.value = "";
      return;
    }
    const base = value * unitMap[category.value][from.value];
    output.value = (base / unitMap[category.value][to.value]).toFixed(4);
  };

  category.addEventListener("change", () => {
    populateUnits();
    convert();
  });
  from.addEventListener("change", convert);
  to.addEventListener("change", convert);
  input.addEventListener("input", convert);
  swap.addEventListener("click", () => {
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    convert();
  });

  populateUnits();
}

function setupFinance() {
  const financeType = document.getElementById("financeType");
  const financeA = document.getElementById("financeA");
  const financeB = document.getElementById("financeB");
  const financeC = document.getElementById("financeC");
  const financeResult = document.getElementById("financeResult");

  const calculate = () => {
    const a = parseFloat(financeA.value) || 0;
    const b = parseFloat(financeB.value) || 0;
    const c = parseFloat(financeC.value) || 0;
    let result = 0;
    let label = "";

    switch (financeType.value) {
      case "gst":
        result = a + (a * b) / 100;
        label = `Total with GST: ${result.toFixed(2)}`;
        break;
      case "emi": {
        const rate = b / 1200;
        const months = c;
        result = (a * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1 || 1);
        label = `Monthly EMI: ${result.toFixed(2)}`;
        break;
      }
      case "loan":
        result = a * (b / 100) * (c / 12);
        label = `Interest: ${result.toFixed(2)}`;
        break;
      case "profit":
        result = ((b - a) / a) * 100;
        label = `Profit/Loss: ${result.toFixed(2)}%`;
        break;
      case "discount":
        result = a - (a * b) / 100;
        label = `Discounted Price: ${result.toFixed(2)}`;
        break;
      case "percentage":
        result = (a * b) / 100;
        label = `Result: ${result.toFixed(2)}`;
        break;
      default:
        break;
    }

    financeResult.textContent = label;
    if (label) {
      addHistory(`${financeType.value}: ${a}, ${b}, ${c}`, label);
    }
  };

  document.getElementById("financeCalculate").addEventListener("click", calculate);
}

function setCalendarView(view) {
  calendarView = view;
  renderCalendar();
}

function getEventsForDate(date) {
  const dayKey = formatDate(date);
  return data.events.filter((event) => eventOccursOn(event, dayKey));
}

function eventOccursOn(event, dayKey) {
  if (event.date === dayKey) return true;
  if (event.repeat === "none") return false;
  const eventDate = new Date(event.date);
  const target = new Date(dayKey);
  if (event.repeat === "daily") return target >= eventDate;
  if (event.repeat === "weekly") return target >= eventDate && target.getDay() === eventDate.getDay();
  if (event.repeat === "monthly") return target >= eventDate && target.getDate() === eventDate.getDate();
  if (event.repeat === "yearly")
    return target >= eventDate && target.getDate() === eventDate.getDate() && target.getMonth() === eventDate.getMonth();
  return false;
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const base = new Date(selectedDate);
  const periodLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  currentPeriod.textContent = periodLabel;

  let datesToRender = [];
  if (calendarView === "month") {
    const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startOffset);
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      datesToRender.push(day);
    }
  } else if (calendarView === "week") {
    const dayOfWeek = base.getDay();
    const startDate = new Date(base);
    startDate.setDate(base.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      datesToRender.push(day);
    }
  } else {
    datesToRender = [base];
    calendarGrid.style.gridTemplateColumns = "repeat(1, minmax(0, 1fr))";
  }

  if (calendarView !== "day") {
    calendarGrid.style.gridTemplateColumns = "repeat(7, minmax(0, 1fr))";
  }

  datesToRender.forEach((date) => {
    const dayKey = formatDate(date);
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    if (date.getDay() === 0 || date.getDay() === 6) {
      cell.classList.add("weekend");
    }
    if (formatDate(selectedDate) === dayKey) {
      cell.classList.add("selected");
    }
    cell.addEventListener("click", () => {
      selectedDate = date;
      eventDate.value = dayKey;
      renderCalendar();
      renderEvents();
    });
    const holiday = holidayMap[dayKey];
    cell.innerHTML = `<h4>${date.getDate()}</h4>`;
    if (holiday) {
      const badge = document.createElement("div");
      badge.textContent = holiday;
      badge.className = "holiday";
      cell.appendChild(badge);
    }
    const events = getEventsForDate(date);
    events.slice(0, 3).forEach((event) => {
      const pill = document.createElement("div");
      pill.className = "event-pill";
      pill.style.background = event.color || "#38bdf8";
      pill.textContent = event.title;
      cell.appendChild(pill);
    });
    calendarGrid.appendChild(cell);
  });

  renderMonthlySummary();
}

function renderMonthlySummary() {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const entries = Object.entries(data.calcsByDate).filter(([key]) => key.startsWith(prefix));
  const total = entries.reduce((sum, [, list]) => sum + list.length, 0);
  monthlySummary.textContent = total
    ? `${total} calculations saved for ${prefix}.`
    : "No calculations yet.";
}

function renderEvents() {
  eventList.innerHTML = "";
  const events = data.events.slice().sort((a, b) => a.date.localeCompare(b.date));
  events.forEach((event) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${event.title}</strong> <small>(${event.date}${event.time ? ` ${event.time}` : ""})</small><br />
        <small>Repeat: ${event.repeat}</small>
      </div>
      <div>
        <span class="event-pill" style="background:${event.color}">#${event.type}</span>
        <button class="chip">Delete</button>
      </div>
    `;
    li.querySelector("button").addEventListener("click", () => {
      data.events = data.events.filter((item) => item.id !== event.id);
      saveData();
      renderCalendar();
      renderEvents();
    });
    eventList.appendChild(li);
  });
}

function saveEvent(type = "event") {
  if (!eventTitle.value || !eventDate.value) return;
  const entry = {
    id: crypto.randomUUID(),
    title: eventTitle.value,
    date: eventDate.value,
    time: eventTime.value,
    color: eventColor.value,
    repeat: eventRepeat.value,
    type,
  };
  data.events.push(entry);
  saveData();
  renderCalendar();
  renderEvents();
  eventTitle.value = "";
}

function attachLastCalculation() {
  if (!data.lastCalculation) return;
  const dayKey = eventDate.value || formatDate(selectedDate);
  const list = data.calcsByDate[dayKey] || [];
  list.push(data.lastCalculation);
  data.calcsByDate[dayKey] = list;
  data.events.push({
    id: crypto.randomUUID(),
    title: `Calc: ${data.lastCalculation.expression} = ${data.lastCalculation.result}`,
    date: dayKey,
    time: "",
    color: "#facc15",
    repeat: "none",
    type: "calculation",
  });
  saveData();
  renderCalendar();
  renderEvents();
}

function handleNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const upcoming = data.events.filter((event) => event.time);
  upcoming.forEach((event) => {
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const diff = eventDateTime - now;
    if (diff > 0 && diff <= 60000 && !data.notifiedEvents[event.id]) {
      new Notification(event.title, {
        body: `Reminder at ${event.time}`,
      });
      data.notifiedEvents[event.id] = new Date().toISOString();
      saveData();
    }
  });
}

function initTimers() {
  setInterval(() => {
    const now = new Date();
    clockDisplay.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, 1000);

  setInterval(handleNotifications, 60000);
}

function updatePomodoroDisplay() {
  const minutes = String(Math.floor(pomodoroSeconds / 60)).padStart(2, "0");
  const seconds = String(pomodoroSeconds % 60).padStart(2, "0");
  pomodoroDisplay.textContent = `${minutes}:${seconds}`;
}

function updateStopwatchDisplay() {
  const hours = String(Math.floor(stopwatchSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((stopwatchSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(stopwatchSeconds % 60).padStart(2, "0");
  stopwatchDisplay.textContent = `${hours}:${minutes}:${seconds}`;
}

function setupShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "/") {
      event.preventDefault();
      historySearch.focus();
    }
    if (event.key.toLowerCase() === "c") {
      calcInput.focus();
    }
    if (event.key.toLowerCase() === "n") {
      eventTitle.focus();
    }
  });
}

function exportJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setupEventListeners() {
  document.getElementById("calcTabs").addEventListener("click", (event) => {
    if (event.target.tagName !== "BUTTON") return;
    const tab = event.target.dataset.tab;
    document.querySelectorAll("#calcTabs button").forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");
    basicPad.classList.toggle("hidden", tab !== "basic");
    scientificPad.classList.toggle("hidden", tab !== "scientific");
    financialPad.classList.toggle("hidden", tab !== "financial");
    converterPad.classList.toggle("hidden", tab !== "converter");
  });

  document.getElementById("calendarTabs").addEventListener("click", (event) => {
    if (event.target.tagName !== "BUTTON") return;
    document.querySelectorAll("#calendarTabs button").forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");
    setCalendarView(event.target.dataset.view);
  });

  document.getElementById("prevPeriod").addEventListener("click", () => {
    const date = new Date(selectedDate);
    if (calendarView === "month") date.setMonth(date.getMonth() - 1);
    if (calendarView === "week") date.setDate(date.getDate() - 7);
    if (calendarView === "day") date.setDate(date.getDate() - 1);
    selectedDate = date;
    renderCalendar();
  });

  document.getElementById("nextPeriod").addEventListener("click", () => {
    const date = new Date(selectedDate);
    if (calendarView === "month") date.setMonth(date.getMonth() + 1);
    if (calendarView === "week") date.setDate(date.getDate() + 7);
    if (calendarView === "day") date.setDate(date.getDate() + 1);
    selectedDate = date;
    renderCalendar();
  });

  document.getElementById("saveFormula").addEventListener("click", () => {
    const name = document.getElementById("formulaName").value.trim();
    const expression = document.getElementById("formulaExpression").value.trim();
    if (!name || !expression) return;
    data.formulas.push({ id: crypto.randomUUID(), name, expression });
    saveData();
    renderFormulas();
    document.getElementById("formulaName").value = "";
    document.getElementById("formulaExpression").value = "";
  });

  historySearch.addEventListener("input", renderHistory);
  document.getElementById("clearHistory").addEventListener("click", () => {
    data.history = [];
    saveData();
    renderHistory();
  });
  document.getElementById("exportHistory").addEventListener("click", () => {
    exportJson("calculation-history.json", data.history);
  });

  document.getElementById("saveEvent").addEventListener("click", () => saveEvent("event"));

  document.getElementById("requestNotifications").addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      handleNotifications();
    }
  });

  document.getElementById("attachCalculation").addEventListener("click", attachLastCalculation);

  notesArea.addEventListener("input", () => {
    data.notes = notesArea.value;
    saveData();
  });

  document.getElementById("addTodo").addEventListener("click", () => {
    const text = todoInput.value.trim();
    if (!text) return;
    data.todos.push({ id: crypto.randomUUID(), text, done: false });
    todoInput.value = "";
    saveData();
    renderTodos();
  });

  document.getElementById("pomodoroStart").addEventListener("click", () => {
    if (pomodoroTimer) return;
    pomodoroTimer = setInterval(() => {
      pomodoroSeconds = Math.max(0, pomodoroSeconds - 1);
      updatePomodoroDisplay();
      if (pomodoroSeconds === 0) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
      }
    }, 1000);
  });

  document.getElementById("pomodoroPause").addEventListener("click", () => {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  });

  document.getElementById("pomodoroReset").addEventListener("click", () => {
    pomodoroSeconds = 1500;
    updatePomodoroDisplay();
  });

  document.getElementById("stopwatchStart").addEventListener("click", () => {
    if (stopwatchTimer) return;
    stopwatchTimer = setInterval(() => {
      stopwatchSeconds += 1;
      updateStopwatchDisplay();
    }, 1000);
  });

  document.getElementById("stopwatchStop").addEventListener("click", () => {
    clearInterval(stopwatchTimer);
    stopwatchTimer = null;
  });

  document.getElementById("stopwatchReset").addEventListener("click", () => {
    stopwatchSeconds = 0;
    updateStopwatchDisplay();
  });

  themeToggle.addEventListener("click", () => {
    data.theme = data.theme === "dark" ? "light" : "dark";
    saveData();
    updateTheme();
  });

  document.getElementById("exportAll").addEventListener("click", () => {
    exportJson("privacy-suite-backup.json", data);
  });

  document.getElementById("importAll").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        data = { ...baseData, ...JSON.parse(reader.result) };
        saveData();
        hydrate();
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("resetAll").addEventListener("click", () => {
    if (!confirm("Reset all local data?")) return;
    data = { ...baseData };
    saveData();
    hydrate();
  });
}

function hydrate() {
  updateTheme();
  notesArea.value = data.notes;
  renderHistory();
  renderFormulas();
  renderTodos();
  renderCalendar();
  renderEvents();
  updatePomodoroDisplay();
  updateStopwatchDisplay();
}

buildKeypads();
setupEventListeners();
setupConverter();
setupFinance();
setupShortcuts();
initTimers();
registerServiceWorker();

const now = new Date();
eventDate.value = formatDate(now);
eventTime.value = now.toTimeString().slice(0, 5);

hydrate();

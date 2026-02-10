const STORAGE_KEY = 'privacy_productivity_data_v1';
const historyLimit = 200;

const holidayMap = {
  '01-01': 'New Year',
  '01-26': 'Republic Day',
  '03-29': 'Holi',
  '04-14': 'Ambedkar Jayanti',
  '05-01': 'Labour Day',
  '08-15': 'Independence Day',
  '10-02': 'Gandhi Jayanti',
  '11-01': 'Diwali',
  '12-25': 'Christmas'
};

const unitOptions = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001 },
  weight: { kg: 1, g: 0.001, lb: 0.453592 },
  time: { s: 1, min: 60, hr: 3600 },
  data: { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }
};

const defaultData = {
  history: [],
  formulas: [],
  notes: '',
  todos: [],
  events: {},
  theme: 'light'
};

let data = loadData();
let selectedDate = new Date();
let notificationEnabled = false;
let pomodoroTimer = null;
let pomodoroRemaining = 25 * 60;
let stopwatchTimer = null;
let stopwatchSeconds = 0;

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? { ...defaultData, ...JSON.parse(saved) } : { ...defaultData };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function safeEval(expression) {
  const sanitized = expression.replace(/[^0-9+\-*/().%^ ]/g, '');
  return Function(`"use strict"; return (${sanitized})`)();
}

function calcExpression(expression) {
  const mapped = expression
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/\^/g, '**');
  return Function(`"use strict"; return (${mapped})`)();
}

function addHistory(entry) {
  data.history.unshift(entry);
  data.history = data.history.slice(0, historyLimit);
  saveData();
  renderHistory();
  renderMonthlySummary();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const search = document.getElementById('historySearch').value.toLowerCase();
  list.innerHTML = '';
  data.history
    .filter(item => item.expression.toLowerCase().includes(search))
    .forEach(item => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `
        <div>
          <strong>${item.expression} = ${item.result}</strong><br />
          <small>${item.type} • ${formatTime(item.timestamp)}</small>
        </div>
        <button data-id="${item.id}" class="ghost">Copy</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        navigator.clipboard?.writeText(`${item.expression} = ${item.result}`);
      });
      list.appendChild(row);
    });

  const attachSelect = document.getElementById('attachCalc');
  attachSelect.innerHTML = '<option value="">Select calculation</option>';
  data.history.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.expression} = ${item.result}`;
    attachSelect.appendChild(option);
  });
}

function renderFormulaMemory() {
  const select = document.getElementById('formulaSelect');
  select.innerHTML = '<option value="">Formula Memory</option>';
  data.formulas.forEach(formula => {
    const option = document.createElement('option');
    option.value = formula.value;
    option.textContent = formula.name;
    select.appendChild(option);
  });
}

function renderTodos() {
  const list = document.getElementById('todoList');
  list.innerHTML = '';
  data.todos.forEach(todo => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <div>
        <input type="checkbox" ${todo.done ? 'checked' : ''} data-id="${todo.id}" />
        <span>${todo.text}</span>
      </div>
      <button data-id="${todo.id}" class="ghost">Delete</button>
    `;
    row.querySelector('input').addEventListener('change', () => {
      todo.done = !todo.done;
      saveData();
    });
    row.querySelector('button').addEventListener('click', () => {
      data.todos = data.todos.filter(item => item.id !== todo.id);
      saveData();
      renderTodos();
    });
    list.appendChild(row);
  });
}

function getEventsForDate(dateStr) {
  const events = data.events[dateStr] || [];
  const list = [...events];
  Object.entries(data.events).forEach(([key, entries]) => {
    entries.forEach(entry => {
      if (entry.repeat === 'daily' && key <= dateStr) list.push({ ...entry, repeatFrom: key });
      if (entry.repeat === 'weekly' && key <= dateStr) {
        const diff = Math.abs(new Date(dateStr) - new Date(key));
        if (diff % (7 * 24 * 3600 * 1000) === 0) list.push({ ...entry, repeatFrom: key });
      }
      if (entry.repeat === 'monthly' && key <= dateStr) {
        if (key.split('-')[2] === dateStr.split('-')[2]) list.push({ ...entry, repeatFrom: key });
      }
    });
  });
  return list;
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const view = document.getElementById('calendarView').value;
  grid.innerHTML = '';

  const label = document.getElementById('selectedDateLabel');
  label.textContent = selectedDate.toDateString();

  if (view === 'month') {
    const current = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const startDay = current.getDay();
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

    for (let i = 0; i < startDay; i += 1) {
      const empty = document.createElement('div');
      grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const dateStr = formatDate(cellDate);
      const cell = document.createElement('div');
      const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
      const holidayKey = dateStr.slice(5);
      cell.className = `calendar-cell ${isWeekend ? 'weekend' : ''} ${holidayMap[holidayKey] ? 'holiday' : ''}`;
      const events = getEventsForDate(dateStr);
      const dots = events.slice(0, 3).map(event => `<span class="event-dot" style="background:${event.color}"></span>`).join('');
      cell.innerHTML = `<div class="date-label">${day}</div>${dots}<div class="helper">${holidayMap[holidayKey] || ''}</div>`;
      cell.addEventListener('click', () => {
        selectedDate = cellDate;
        document.getElementById('eventDate').value = dateStr;
        renderCalendar();
      });
      grid.appendChild(cell);
    }
  } else {
    const start = new Date(selectedDate);
    if (view === 'week') {
      start.setDate(start.getDate() - start.getDay());
    }
    const count = view === 'week' ? 7 : 1;
    for (let i = 0; i < count; i += 1) {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + i);
      const dateStr = formatDate(dayDate);
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      const events = getEventsForDate(dateStr)
        .map(event => `<div><span class="event-dot" style="background:${event.color}"></span>${event.title}</div>`)
        .join('');
      cell.innerHTML = `<div class="date-label">${dayDate.toDateString()}</div>${events}`;
      cell.addEventListener('click', () => {
        selectedDate = dayDate;
        document.getElementById('eventDate').value = dateStr;
        renderCalendar();
      });
      grid.appendChild(cell);
    }
  }

  renderEventList();
}

function renderEventList() {
  const list = document.getElementById('eventList');
  const dateStr = formatDate(selectedDate);
  list.innerHTML = '';
  const events = getEventsForDate(dateStr);
  if (events.length === 0) {
    list.innerHTML = '<p class="helper">No events for this date.</p>';
    return;
  }
  events.forEach(event => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <div>
        <strong>${event.title}</strong><br />
        <small>${event.time || 'All day'} • ${event.repeat !== 'none' ? event.repeat : 'One-time'}</small>
        ${event.notes ? `<div class="helper">${event.notes}</div>` : ''}
      </div>
      <button data-id="${event.id}" class="ghost">Delete</button>
    `;
    row.querySelector('button').addEventListener('click', () => {
      const key = event.repeatFrom || dateStr;
      data.events[key] = (data.events[key] || []).filter(item => item.id !== event.id);
      saveData();
      renderCalendar();
    });
    list.appendChild(row);
  });
}

function renderMonthlySummary() {
  const summary = document.getElementById('monthlySummary');
  const monthKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
  const count = data.history.filter(item => item.timestamp.startsWith(monthKey)).length;
  summary.textContent = `Calculations this month: ${count}`;
}

function updateTheme() {
  document.body.classList.toggle('dark', data.theme === 'dark');
  document.body.classList.toggle('light', data.theme !== 'dark');
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
    });
  });
}

function setupCalculator() {
  const display = document.getElementById('calcDisplay');
  document.querySelectorAll('.calc-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.key) {
        display.value += btn.dataset.key;
      } else if (btn.dataset.fn) {
        if (btn.dataset.fn === 'pow') {
          display.value += '^';
        } else {
          display.value += `${btn.dataset.fn}(`;
        }
      }
    });
  });

  document.getElementById('calcEqual').addEventListener('click', () => {
    if (!display.value.trim()) return;
    try {
      const result = calcExpression(display.value);
      addHistory({
        id: crypto.randomUUID(),
        expression: display.value,
        result,
        type: 'Calculator',
        timestamp: new Date().toISOString()
      });
      display.value = result;
    } catch (error) {
      alert('Invalid expression');
    }
  });

  document.getElementById('calcClear').addEventListener('click', () => {
    display.value = '';
  });

  document.getElementById('saveFormula').addEventListener('click', () => {
    if (!display.value.trim()) return;
    const name = prompt('Name this formula');
    if (!name) return;
    data.formulas.push({ name, value: display.value });
    saveData();
    renderFormulaMemory();
  });

  document.getElementById('formulaSelect').addEventListener('change', event => {
    if (event.target.value) {
      display.value = event.target.value;
    }
  });
}

function setupQuickCalculators() {
  document.getElementById('percentCalc').addEventListener('click', () => {
    const value = Number(document.getElementById('percentValue').value || 0);
    const percent = Number(document.getElementById('percentPercent').value || 0);
    const result = (value * percent) / 100;
    document.getElementById('percentResult').textContent = `Result: ${result.toFixed(2)}`;
    addHistory({ id: crypto.randomUUID(), expression: `${percent}% of ${value}`, result, type: 'Percentage', timestamp: new Date().toISOString() });
  });

  document.getElementById('gstCalc').addEventListener('click', () => {
    const amount = Number(document.getElementById('gstAmount').value || 0);
    const rate = Number(document.getElementById('gstRate').value || 0);
    const gst = (amount * rate) / 100;
    const total = amount + gst;
    const result = `GST: ${gst.toFixed(2)}, Total: ${total.toFixed(2)}`;
    document.getElementById('gstResult').textContent = result;
    addHistory({ id: crypto.randomUUID(), expression: `GST ${rate}% on ${amount}`, result, type: 'GST', timestamp: new Date().toISOString() });
  });

  document.getElementById('loanCalc').addEventListener('click', () => {
    const principal = Number(document.getElementById('loanAmount').value || 0);
    const rate = Number(document.getElementById('loanRate').value || 0) / 1200;
    const months = Number(document.getElementById('loanMonths').value || 0);
    const emi = rate ? (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1) : principal / months;
    const result = `EMI: ${emi.toFixed(2)}`;
    document.getElementById('loanResult').textContent = result;
    addHistory({ id: crypto.randomUUID(), expression: `EMI ${principal} @ ${rate * 1200}% for ${months}m`, result, type: 'Loan', timestamp: new Date().toISOString() });
  });

  document.getElementById('profitCalc').addEventListener('click', () => {
    const cost = Number(document.getElementById('costPrice').value || 0);
    const sell = Number(document.getElementById('sellPrice').value || 0);
    const diff = sell - cost;
    const result = diff >= 0 ? `Profit: ${diff.toFixed(2)}` : `Loss: ${Math.abs(diff).toFixed(2)}`;
    document.getElementById('profitResult').textContent = result;
    addHistory({ id: crypto.randomUUID(), expression: `Cost ${cost}, Sell ${sell}`, result, type: 'Profit/Loss', timestamp: new Date().toISOString() });
  });

  document.getElementById('discountCalc').addEventListener('click', () => {
    const price = Number(document.getElementById('discountPrice').value || 0);
    const rate = Number(document.getElementById('discountRate').value || 0);
    const discount = (price * rate) / 100;
    const finalPrice = price - discount;
    const result = `Final: ${finalPrice.toFixed(2)} (Saved ${discount.toFixed(2)})`;
    document.getElementById('discountResult').textContent = result;
    addHistory({ id: crypto.randomUUID(), expression: `Discount ${rate}% on ${price}`, result, type: 'Discount', timestamp: new Date().toISOString() });
  });

  const unitType = document.getElementById('unitType');
  const unitFrom = document.getElementById('unitFrom');
  const unitTo = document.getElementById('unitTo');

  function renderUnits() {
    const options = unitOptions[unitType.value];
    unitFrom.innerHTML = '';
    unitTo.innerHTML = '';
    Object.keys(options).forEach(unit => {
      const opt1 = document.createElement('option');
      opt1.value = unit;
      opt1.textContent = unit;
      const opt2 = opt1.cloneNode(true);
      unitFrom.appendChild(opt1);
      unitTo.appendChild(opt2);
    });
  }

  unitType.addEventListener('change', renderUnits);
  renderUnits();

  document.getElementById('unitCalc').addEventListener('click', () => {
    const value = Number(document.getElementById('unitValue').value || 0);
    const options = unitOptions[unitType.value];
    const result = (value * options[unitFrom.value]) / options[unitTo.value];
    document.getElementById('unitResult').textContent = `Converted: ${result.toFixed(4)} ${unitTo.value}`;
    addHistory({ id: crypto.randomUUID(), expression: `${value} ${unitFrom.value} to ${unitTo.value}`, result, type: 'Unit', timestamp: new Date().toISOString() });
  });
}

function setupCalendarControls() {
  document.getElementById('calendarView').addEventListener('change', renderCalendar);
  document.getElementById('prevPeriod').addEventListener('click', () => {
    const view = document.getElementById('calendarView').value;
    if (view === 'month') selectedDate.setMonth(selectedDate.getMonth() - 1);
    else if (view === 'week') selectedDate.setDate(selectedDate.getDate() - 7);
    else selectedDate.setDate(selectedDate.getDate() - 1);
    renderCalendar();
  });
  document.getElementById('nextPeriod').addEventListener('click', () => {
    const view = document.getElementById('calendarView').value;
    if (view === 'month') selectedDate.setMonth(selectedDate.getMonth() + 1);
    else if (view === 'week') selectedDate.setDate(selectedDate.getDate() + 7);
    else selectedDate.setDate(selectedDate.getDate() + 1);
    renderCalendar();
  });

  document.getElementById('addEvent').addEventListener('click', () => {
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value || formatDate(selectedDate);
    if (!title) return alert('Title required');
    const event = {
      id: crypto.randomUUID(),
      title,
      time: document.getElementById('eventTime').value,
      color: document.getElementById('eventColor').value,
      repeat: document.getElementById('eventRepeat').value,
      notes: document.getElementById('eventNotes').value
    };
    data.events[date] = data.events[date] || [];
    data.events[date].push(event);
    saveData();
    renderCalendar();
  });
}

function setupNotes() {
  const notesArea = document.getElementById('notesArea');
  notesArea.value = data.notes;
  notesArea.addEventListener('input', () => {
    data.notes = notesArea.value;
    saveData();
  });
}

function setupTodos() {
  document.getElementById('addTodo').addEventListener('click', () => {
    const text = document.getElementById('todoInput').value.trim();
    if (!text) return;
    data.todos.push({ id: crypto.randomUUID(), text, done: false });
    document.getElementById('todoInput').value = '';
    saveData();
    renderTodos();
  });
}

function setupAttachCalc() {
  document.getElementById('attachCalcBtn').addEventListener('click', () => {
    const date = document.getElementById('attachDate').value;
    const calcId = document.getElementById('attachCalc').value;
    if (!date || !calcId) return;
    const calc = data.history.find(item => item.id === calcId);
    if (!calc) return;
    const event = {
      id: crypto.randomUUID(),
      title: `Calc: ${calc.expression} = ${calc.result}`,
      time: '',
      color: '#10b981',
      repeat: 'none',
      notes: 'Attached calculation'
    };
    data.events[date] = data.events[date] || [];
    data.events[date].push(event);
    saveData();
    renderCalendar();
  });
}

function setupSearch() {
  document.getElementById('historySearch').addEventListener('input', renderHistory);
  document.getElementById('clearHistory').addEventListener('click', () => {
    data.history = [];
    saveData();
    renderHistory();
  });
}

function setupTheme() {
  updateTheme();
  document.getElementById('themeToggle').addEventListener('click', () => {
    data.theme = data.theme === 'dark' ? 'light' : 'dark';
    saveData();
    updateTheme();
  });
}

function setupTimers() {
  const pomodoroDisplay = document.getElementById('pomodoroDisplay');
  const pomodoroMinutes = document.getElementById('pomodoroMinutes');

  function renderPomodoro() {
    const minutes = String(Math.floor(pomodoroRemaining / 60)).padStart(2, '0');
    const seconds = String(pomodoroRemaining % 60).padStart(2, '0');
    pomodoroDisplay.textContent = `${minutes}:${seconds}`;
  }

  document.getElementById('pomodoroStart').addEventListener('click', () => {
    if (pomodoroTimer) return;
    pomodoroRemaining = Number(pomodoroMinutes.value) * 60;
    renderPomodoro();
    pomodoroTimer = setInterval(() => {
      pomodoroRemaining -= 1;
      renderPomodoro();
      if (pomodoroRemaining <= 0) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
        alert('Pomodoro complete');
      }
    }, 1000);
  });

  document.getElementById('pomodoroStop').addEventListener('click', () => {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  });

  const stopwatchDisplay = document.getElementById('stopwatchDisplay');
  const renderStopwatch = () => {
    const hours = String(Math.floor(stopwatchSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((stopwatchSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(stopwatchSeconds % 60).padStart(2, '0');
    stopwatchDisplay.textContent = `${hours}:${minutes}:${seconds}`;
  };

  document.getElementById('stopwatchStart').addEventListener('click', () => {
    if (stopwatchTimer) return;
    stopwatchTimer = setInterval(() => {
      stopwatchSeconds += 1;
      renderStopwatch();
    }, 1000);
  });

  document.getElementById('stopwatchStop').addEventListener('click', () => {
    clearInterval(stopwatchTimer);
    stopwatchTimer = null;
  });

  document.getElementById('stopwatchReset').addEventListener('click', () => {
    stopwatchSeconds = 0;
    renderStopwatch();
  });

  const clockDisplay = document.getElementById('clockDisplay');
  setInterval(() => {
    clockDisplay.textContent = new Date().toLocaleTimeString();
  }, 1000);
}

function setupExportImport() {
  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'privacy-productivity-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importInput').addEventListener('change', event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        data = { ...defaultData, ...imported };
        saveData();
        location.reload();
      } catch (error) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Reset all local data?')) {
      data = { ...defaultData };
      saveData();
      location.reload();
    }
  });
}

function setupNotifications() {
  const button = document.getElementById('notifyToggle');
  button.addEventListener('click', async () => {
    if (!('Notification' in window)) return alert('Notifications not supported.');
    const result = await Notification.requestPermission();
    notificationEnabled = result === 'granted';
    button.textContent = notificationEnabled ? 'Notifications On' : 'Enable Notifications';
  });

  setInterval(() => {
    if (!notificationEnabled) return;
    const now = new Date();
    const dateStr = formatDate(now);
    const events = getEventsForDate(dateStr);
    events.forEach(event => {
      if (!event.time) return;
      const [hour, minute] = event.time.split(':').map(Number);
      if (now.getHours() === hour && now.getMinutes() === minute && now.getSeconds() < 2) {
        new Notification(event.title, { body: event.notes || 'Reminder', silent: false });
      }
    });
  }, 1000);
}

function setupShortcuts() {
  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement.tagName !== 'INPUT') {
      event.preventDefault();
      document.getElementById('historySearch').focus();
    }
    if (event.key === 'Enter' && document.activeElement.id === 'calcDisplay') {
      document.getElementById('calcEqual').click();
    }
    if (event.key.toLowerCase() === 't') {
      document.getElementById('themeToggle').click();
    }
    if (event.altKey) {
      const tabIndex = Number(event.key) - 1;
      const tabs = document.querySelectorAll('.tab');
      if (tabs[tabIndex]) tabs[tabIndex].click();
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
}

function init() {
  setupTabs();
  setupCalculator();
  setupQuickCalculators();
  setupCalendarControls();
  setupNotes();
  setupTodos();
  setupAttachCalc();
  setupSearch();
  setupTheme();
  setupTimers();
  setupExportImport();
  setupNotifications();
  setupShortcuts();

  document.getElementById('attachDate').value = formatDate(selectedDate);
  document.getElementById('eventDate').value = formatDate(selectedDate);

  renderHistory();
  renderFormulaMemory();
  renderTodos();
  renderCalendar();
  renderMonthlySummary();

  registerServiceWorker();
}

init();

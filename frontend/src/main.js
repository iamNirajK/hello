import './styles.css';

const app = document.querySelector('#app');
const storageKeys = {
  db: 'boardmcq_db',
  attempts: 'boardmcq_attempts',
  quiz: 'boardmcq_quiz_session'
};
const localAdmin = {
  email: 'admin@boardmcq.xyz',
  passHash: 'd8d0b1dd2010faca19d6b0d5f93a129d418d2b8f256143b2fbf28b4711c5bb86'
};
let db;

const titleCase = (value) => value.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');

async function hash(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function updateSEO({ title, description, breadcrumb = [] }) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = description;
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogTitle) ogTitle.content = title;
  if (ogDesc) ogDesc.content = description;

  document.querySelectorAll('script[data-dynamic-schema="true"]').forEach((n) => n.remove());
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'BoardMCQ.xyz',
    url: 'https://boardmcq.xyz',
    description: 'Free chapter-wise MCQ quizzes for Class 9 to Class 12 students.'
  };
  const schemas = [orgSchema];
  if (breadcrumb.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumb.map((item, idx) => ({ '@type': 'ListItem', position: idx + 1, name: item.name, item: item.url }))
    });
  }
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.dynamicSchema = 'true';
  script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
  document.head.appendChild(script);
}

function saveDb() {
  localStorage.setItem(storageKeys.db, JSON.stringify(db));
}

function normalizeDb(raw) {
  return raw.classes || raw;
}

async function loadDb() {
  const local = localStorage.getItem(storageKeys.db);
  if (local) return JSON.parse(local);
  const res = await fetch('/data/content.json');
  const seed = await res.json();
  const normalized = normalizeDb(seed);
  localStorage.setItem(storageKeys.db, JSON.stringify(normalized));
  return normalized;
}

function layout(content, showHero = false) {
  app.innerHTML = `
    <header class="topbar">
      <a href="/" data-link class="brand">BoardMCQ.xyz</a>
      <nav>
        <a href="/" data-link>Home</a>
        <a href="/classes" data-link>Classes</a>
        <a href="/admin" data-link>Admin</a>
      </nav>
    </header>
    ${showHero ? `<section class="hero"><h1>Free Chapter-wise MCQ Quiz for Class 9–12</h1><p>Practice smarter with chapter-wise tests, instant analytics, and progress tracking.</p><div class="cta-row"><a data-link href="/classes" class="btn primary">Start Free Quiz</a><a data-link href="/classes" class="btn">Select Class</a></div></section>` : ''}
    <main class="container">${content}</main>
    <footer><a href="/about" data-link>About</a><a href="/privacy-policy" data-link>Privacy Policy</a><a href="/disclaimer" data-link>Disclaimer</a><a href="/contact" data-link>Contact</a></footer>`;
}

function classCards() {
  return Object.keys(db).map((c) => `<a data-link href="/${slugify(c)}" class="card"><h3>${titleCase(c)}</h3><p>Chapter-wise quizzes for ${titleCase(c)}.</p></a>`).join('');
}

function homePage() {
  updateSEO({
    title: 'BoardMCQ.xyz | Free Chapter-wise MCQ Quiz for Class 9–12',
    description: 'Take free chapter-wise MCQ quizzes for Class 9, 10, 11, and 12. No signup needed for students.'
  });
  layout(`<section><h2>Select Your Class</h2><div class="grid">${classCards()}</div></section>
  <section><h2>Why BoardMCQ?</h2><p>BoardMCQ.xyz helps students prepare chapter by chapter using exam-style MCQs with timer, score analytics, and answer review. Mobile-first layout, lightning-fast loading, and structured content help improve consistency for board exam preparation.</p></section>`, true);
}

function classesPage() {
  updateSEO({ title: 'Select Class | BoardMCQ.xyz', description: 'Choose your class and start free subject-wise MCQ practice.' });
  layout(`<h1>Choose Class</h1><div class="grid">${classCards()}</div>`);
}

function classPage(classSlug) {
  const classKey = Object.keys(db).find((k) => slugify(k) === classSlug);
  if (!classKey) return notFound();
  const subjects = Object.keys(db[classKey]).map((s) => `<a data-link href="/${classSlug}/${slugify(s)}" class="card"><h3>${s}</h3><p>Chapter-wise ${s} MCQs.</p></a>`).join('');
  updateSEO({ title: `${titleCase(classSlug)} Subjects | BoardMCQ.xyz`, description: `Choose a subject in ${titleCase(classSlug)} and start chapter-wise MCQ practice.` });
  layout(`<h1>${titleCase(classSlug)} Subjects</h1><div class="grid">${subjects}</div>`);
}

function chapterListPage(classSlug, subjectSlug) {
  const classKey = Object.keys(db).find((k) => slugify(k) === classSlug);
  const subjectKey = classKey && Object.keys(db[classKey]).find((s) => slugify(s) === subjectSlug);
  if (!classKey || !subjectKey) return notFound();
  const chapters = db[classKey][subjectKey].chapters.map((ch) => `<a data-link href="/${classSlug}/${subjectSlug}/${ch.slug}" class="card"><h3>${ch.name}</h3><p>${ch.description}</p></a>`).join('');
  updateSEO({ title: `${titleCase(classSlug)} ${subjectKey} Chapters | BoardMCQ.xyz`, description: `Select chapter-wise ${subjectKey} MCQ for ${titleCase(classSlug)}.` });
  layout(`<h1>${titleCase(classSlug)} → ${subjectKey}</h1><div class="grid">${chapters}</div>`);
}

function quizPage(classSlug, subjectSlug, chapterSlug) {
  const cls = Object.keys(db).find((k) => slugify(k) === classSlug);
  const sub = cls && Object.keys(db[cls]).find((s) => slugify(s) === subjectSlug);
  const chapter = sub && db[cls][sub].chapters.find((c) => c.slug === chapterSlug);
  if (!chapter) return notFound();
  updateSEO({
    title: `${titleCase(classSlug)} ${sub} ${chapter.name} MCQ | BoardMCQ.xyz`,
    description: `Practice free ${titleCase(classSlug)} ${sub} chapter-wise MCQ with instant results. No login required.`,
    breadcrumb: [
      { name: 'Home', url: 'https://boardmcq.xyz/' },
      { name: titleCase(classSlug), url: `https://boardmcq.xyz/${classSlug}` },
      { name: sub, url: `https://boardmcq.xyz/${classSlug}/${subjectSlug}` },
      { name: chapter.name, url: `https://boardmcq.xyz/${classSlug}/${subjectSlug}/${chapterSlug}` }
    ]
  });

  const bank = chapter.mcqs.length ? chapter.mcqs : Array.from({ length: 20 }, (_, i) => ({
    id: `${chapter.slug}-auto-${i + 1}`,
    question: `${chapter.name}: Sample practice question ${i + 1}?`,
    options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
    answer: ['A', 'B', 'C', 'D'][i % 4]
  }));

  const session = {
    cls, sub, chapter,
    size: 10,
    timerOn: true,
    qIndex: 0,
    answers: {},
    started: false,
    quiz: []
  };

  layout(`<nav class="breadcrumbs"><a data-link href="/">Home</a> / <a data-link href="/${classSlug}">${titleCase(classSlug)}</a> / <a data-link href="/${classSlug}/${subjectSlug}">${sub}</a> / ${chapter.name}</nav>
    <h1>${chapter.name} Quiz</h1>
    <div class="quiz-config">
      <label>Question Count
        <select id="quiz-size"><option>10</option><option>15</option><option>20</option></select>
      </label>
      <label class="toggle"><input checked type="checkbox" id="timer-toggle" /> Timer ON (1 min per question)</label>
      <button id="start-quiz" class="btn primary">Start Quiz</button>
    </div>
    <section id="quiz-area"></section>`);

  const area = document.querySelector('#quiz-area');

  const renderQuestion = () => {
    const q = session.quiz[session.qIndex];
    const total = session.quiz.length;
    const selected = session.answers[q.id];
    const left = session.endTime ? Math.max(0, Math.floor((session.endTime - Date.now()) / 1000)) : 0;
    area.innerHTML = `
      <div class="progress"><span style="width:${((session.qIndex + 1) / total) * 100}%"></span></div>
      <div class="qhead"><strong>Q${session.qIndex + 1}/${total}</strong> ${session.timerOn ? `<span class="timer ${left <= 60 ? 'warn' : ''}">⏳ ${left}s</span>` : ''}</div>
      <h3>${q.question}</h3>
      <div class="options">${Object.entries(q.options).map(([key, val]) => `<button class="option ${selected === key ? 'active' : ''}" data-opt="${key}">${key}. ${val}</button>`).join('')}</div>
      <div class="nav-row"><button id="prev-btn" class="btn" ${session.qIndex === 0 ? 'disabled' : ''}>Previous</button><button id="next-btn" class="btn primary">${session.qIndex === total - 1 ? 'Submit' : 'Next'}</button></div>`;
  };

  const showResult = () => {
    const total = session.quiz.length;
    let correct = 0;
    const review = session.quiz.map((q, idx) => {
      const got = session.answers[q.id];
      const isCorrect = got === q.answer;
      if (isCorrect) correct += 1;
      return `<li class="${isCorrect ? 'ok' : 'bad'}"><strong>Q${idx + 1}.</strong> ${q.question}<br/>Your answer: ${got || 'Not Answered'} | Correct: ${q.answer}</li>`;
    }).join('');
    const wrong = total - correct;
    const accuracy = Math.round((correct / total) * 100);
    const attempts = Number(localStorage.getItem(storageKeys.attempts) || 0) + 1;
    localStorage.setItem(storageKeys.attempts, String(attempts));
    localStorage.removeItem(storageKeys.quiz);
    area.innerHTML = `<div class="result"><h2>Result</h2><p>Total Questions: ${total}</p><p>Correct Answers: ${correct}</p><p>Wrong Answers: ${wrong}</p><p>Final Score: ${correct}/${total}</p><p>Accuracy: ${accuracy}%</p><ol>${review}</ol><div class="nav-row"><a class="btn" data-link href="/${classSlug}/${subjectSlug}/${chapterSlug}">Restart Quiz</a><a class="btn primary" data-link href="/${classSlug}/${subjectSlug}">Try another chapter</a></div></div>`;
  };

  let tick;
  const begin = () => {
    session.size = Number(document.querySelector('#quiz-size').value);
    session.timerOn = document.querySelector('#timer-toggle').checked;
    session.quiz = bank.slice(0, session.size);
    session.started = true;
    if (session.timerOn) session.endTime = Date.now() + session.quiz.length * 60 * 1000;
    renderQuestion();

    if (session.timerOn) {
      tick = setInterval(() => {
        if (Date.now() >= session.endTime) {
          clearInterval(tick);
          showResult();
          return;
        }
        renderQuestion();
      }, 1000);
    }
  };

  app.addEventListener('click', (e) => {
    if (e.target.id === 'start-quiz') begin();
    if (!session.started) return;
    if (e.target.classList.contains('option')) {
      const q = session.quiz[session.qIndex];
      session.answers[q.id] = e.target.dataset.opt;
      renderQuestion();
    }
    if (e.target.id === 'prev-btn') {
      session.qIndex = Math.max(0, session.qIndex - 1);
      renderQuestion();
    }
    if (e.target.id === 'next-btn') {
      if (session.qIndex === session.quiz.length - 1) {
        if (tick) clearInterval(tick);
        showResult();
      } else {
        session.qIndex += 1;
        renderQuestion();
      }
    }
  }, { once: true });
}

function legalPage(title, text) {
  updateSEO({ title: `${title} | BoardMCQ.xyz`, description: `${title} of BoardMCQ.xyz` });
  layout(`<h1>${title}</h1><p>${text}</p>`);
}

function adminPage() {
  updateSEO({ title: 'Admin Panel | BoardMCQ.xyz', description: 'Manage classes, subjects, chapters and MCQs.' });
  layout('<h1>Admin Panel</h1><section id="admin-root"></section>');
  const root = document.querySelector('#admin-root');

  const netlifyUser = window.netlifyIdentity?.currentUser();
  const state = { loggedIn: Boolean(netlifyUser), selectedClass: '', selectedSubject: '', selectedChapter: '' };

  const render = () => {
    if (!state.loggedIn) {
      root.innerHTML = `<div class="admin-card"><h2>Secure Login</h2><p>Use Netlify Identity or fallback local admin.</p><button id="netlify-login" class="btn">Login with Netlify Identity</button><form id="local-login"><input required type="email" placeholder="Email" /><input required type="password" placeholder="Password" /><button class="btn primary">Login</button></form><small>Default local admin: ${localAdmin.email}</small></div>`;
      return;
    }
    const classes = Object.keys(db).map((k) => `<option value="${k}" ${state.selectedClass === k ? 'selected' : ''}>${k}</option>`).join('');
    const subjects = state.selectedClass ? Object.keys(db[state.selectedClass]).map((s) => `<option value="${s}" ${state.selectedSubject === s ? 'selected' : ''}>${s}</option>`).join('') : '';
    const chapters = state.selectedClass && state.selectedSubject ? db[state.selectedClass][state.selectedSubject].chapters.map((c) => `<option value="${c.slug}" ${state.selectedChapter === c.slug ? 'selected' : ''}>${c.name}</option>`).join('') : '';
    const attempts = Number(localStorage.getItem(storageKeys.attempts) || 0);
    const questionCount = Object.values(db).flatMap((subs) => Object.values(subs).flatMap((x) => x.chapters.flatMap((c) => c.mcqs))).length;
    const quizCount = Object.values(db).flatMap((subs) => Object.values(subs).flatMap((x) => x.chapters)).length;

    root.innerHTML = `<div class="admin-card"><p><strong>Total quizzes:</strong> ${quizCount} | <strong>Total questions:</strong> ${questionCount} | <strong>Total attempts:</strong> ${attempts}</p>
      <div class="admin-grid">
      <form id="add-class"><h3>Add Class</h3><input name="class" placeholder="class-13" required /><button class="btn">Add</button></form>
      <form id="add-subject"><h3>Add Subject</h3><select name="class">${classes}</select><input name="subject" placeholder="Economics" required /><button class="btn">Add</button></form>
      <form id="add-chapter"><h3>Add Chapter</h3><select name="class">${classes}</select><select name="subject">${subjects}</select><input name="name" placeholder="Chapter Name" required /><textarea name="description" placeholder="Short description"></textarea><button class="btn">Add</button></form>
      <form id="add-mcq"><h3>Add MCQ</h3><select name="class">${classes}</select><select name="subject">${subjects}</select><select name="chapter">${chapters}</select><input name="question" placeholder="Question" required /><input name="A" placeholder="Option A" required /><input name="B" placeholder="Option B" required /><input name="C" placeholder="Option C" required /><input name="D" placeholder="Option D" required /><select name="answer"><option>A</option><option>B</option><option>C</option><option>D</option></select><button class="btn">Add</button></form>
      <form id="json-upload"><h3>Upload JSON</h3><textarea name="json" placeholder='{"classes":{...}}' required></textarea><button class="btn">Merge JSON</button></form>
      </div>
      <button id="export-json" class="btn primary">Export JSON</button>
      <button id="admin-logout" class="btn">Logout</button>
      </div>`;
  };

  render();

  root.addEventListener('click', () => {
    const btn = document.querySelector('#netlify-login');
    if (btn) window.netlifyIdentity?.open('login');
  });

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    if (form.id === 'local-login') {
      const email = fd.get('email');
      const pwdHash = await hash(fd.get('password'));
      if (email === localAdmin.email && pwdHash === localAdmin.passHash) {
        state.loggedIn = true;
        render();
      } else alert('Invalid credentials');
      return;
    }
    if (form.id === 'add-class') {
      const c = fd.get('class');
      if (!db[c]) db[c] = {};
    }
    if (form.id === 'add-subject') {
      const c = fd.get('class');
      const s = fd.get('subject');
      if (!db[c][s]) db[c][s] = { chapters: [] };
    }
    if (form.id === 'add-chapter') {
      const c = fd.get('class');
      const s = fd.get('subject');
      db[c][s].chapters.push({ name: fd.get('name'), slug: slugify(fd.get('name')), description: fd.get('description') || '', mcqs: [] });
    }
    if (form.id === 'add-mcq') {
      const c = fd.get('class'); const s = fd.get('subject'); const ch = fd.get('chapter');
      const target = db[c][s].chapters.find((x) => x.slug === ch);
      target.mcqs.push({ id: crypto.randomUUID(), question: fd.get('question'), options: { A: fd.get('A'), B: fd.get('B'), C: fd.get('C'), D: fd.get('D') }, answer: fd.get('answer') });
    }
    if (form.id === 'json-upload') {
      const parsed = JSON.parse(fd.get('json'));
      db = { ...db, ...normalizeDb(parsed) };
    }
    saveDb();
    render();
  });

  root.addEventListener('click', (e) => {
    if (e.target.id === 'export-json') {
      const blob = new Blob([JSON.stringify({ classes: db }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'boardmcq-content.json';
      a.click();
    }
    if (e.target.id === 'admin-logout') {
      state.loggedIn = false;
      window.netlifyIdentity?.logout();
      render();
    }
  });

  window.netlifyIdentity?.on('login', () => {
    state.loggedIn = true;
    window.netlifyIdentity.close();
    render();
  });
}

function notFound() {
  updateSEO({ title: 'Page Not Found | BoardMCQ.xyz', description: 'Requested page not found.' });
  layout('<h1>404</h1><p>The page you requested does not exist.</p>');
}

function router() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  const segments = path.split('/').filter(Boolean);
  if (path === '/') return homePage();
  if (path === '/classes') return classesPage();
  if (path === '/admin') return adminPage();
  if (path === '/about') return legalPage('About', 'BoardMCQ.xyz offers free board exam MCQ practice for classes 9 to 12.');
  if (path === '/privacy-policy') return legalPage('Privacy Policy', 'We store quiz progress and attempts locally in your browser.');
  if (path === '/disclaimer') return legalPage('Disclaimer', 'Questions are educational and may vary from official board papers.');
  if (path === '/contact') return legalPage('Contact', 'Email us at support@boardmcq.xyz');
  if (segments.length === 1) return classPage(segments[0]);
  if (segments.length === 2) return chapterListPage(segments[0], segments[1]);
  if (segments.length === 3) return quizPage(segments[0], segments[1], segments[2]);
  return notFound();
}

window.addEventListener('click', (e) => {
  const link = e.target.closest('[data-link]');
  if (!link) return;
  e.preventDefault();
  history.pushState({}, '', link.getAttribute('href'));
  router();
});
window.addEventListener('popstate', router);

(async () => {
  db = await loadDb();
  router();
})();

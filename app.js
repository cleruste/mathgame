// Frontend math game app.js (static-only)
// Question generation logic runs entirely in the browser so the site
// can be hosted as a static site (GitHub Pages, Netlify, etc.).

// Configuration (defaults are used if no saved preference exists)
const DEFAULT_QUESTIONS_PER_MODULE = 10;
const DEFAULT_TIME_PER_QUESTION_SEC = 10; // seconds
const DEFAULT_DIFFICULTY = 1; // 0=easy,1=medium,2=hard

function getDifficulty() {
  return Number(localStorage.getItem('mathgame_difficulty') || DEFAULT_DIFFICULTY);
}
function setDifficulty(d) {
  // Avoid treating 0 as falsy when using `||` — explicitly coerce and validate
  const n = Number(d);
  const v = Number.isFinite(n) ? Math.max(0, Math.min(2, Math.floor(n))) : DEFAULT_DIFFICULTY;
  localStorage.setItem('mathgame_difficulty', String(v));
}

function getNumQuestions() {
  return Number(localStorage.getItem('mathgame_num_questions') || DEFAULT_QUESTIONS_PER_MODULE);
}
function setNumQuestions(n) {
  const v = Math.max(1, Math.floor(Number(n) || DEFAULT_QUESTIONS_PER_MODULE));
  localStorage.setItem('mathgame_num_questions', String(v));
}

function getTimePerQuestionSec() {
  return Number(localStorage.getItem('mathgame_time_per_question_sec') || DEFAULT_TIME_PER_QUESTION_SEC);
}
function setTimePerQuestionSec(s) {
  const v = Math.max(1, Math.floor(Number(s) || DEFAULT_TIME_PER_QUESTION_SEC));
  localStorage.setItem('mathgame_time_per_question_sec', String(v));
}

function getTimePerQuestionMs() {
  return getTimePerQuestionSec() * 1000;
}

/**
 * Count carry operations for grade-school addition/subtraction/multiplication.
 * This version is used by the modules to choose numbers that produce a
 * specific number of carry events for addition.
 */
function countCarryOperations(a, b, op) {
  const A = Math.abs(Math.floor(Number(a) || 0));
  const B = Math.abs(Math.floor(Number(b) || 0));
  const operator = String(op).trim();
  const toDigits = n => String(n).split('').reverse().map(d => Number(d));

  if (operator === '+') {
    const da = toDigits(A);
    const db = toDigits(B);
    const n = Math.max(da.length, db.length);
    let carry = 0;
    let carryCount = 0;
    for (let i = 0; i < n; i++) {
      const s = (da[i] || 0) + (db[i] || 0) + carry;
      if (s >= 10) {
        carry = Math.floor(s / 10);
        carryCount += 1;
      } else {
        carry = 0;
      }
    }
    carryCount += Math.max(da.length + db.length - 4,0)
    return carryCount;
  }

  if (operator === '-') {
    const minuend = Math.max(A, B);
    const subtrahend = Math.min(A, B);
    const da = toDigits(minuend);
    const db = toDigits(subtrahend);
    const n = da.length;
    let borrow = 0;
    let borrowCount = 0;
    for (let i = 0; i < n; i++) {
      const ai = da[i] || 0;
      const bi = db[i] || 0;
      if ((ai - borrow) < bi) {
        borrow = 1;
        borrowCount += 1;
      } else {
        borrow = 0;
      }
    }
    borrowCount += Math.max(da.length + db.length - 4,0)
    return borrowCount;
  }

  if (operator === 'x' || operator === '*') {
    if (A === 0 || B === 0) return 0;
    const da = toDigits(A);
    const db = toDigits(B);
    const res = new Array(da.length * db.length).fill(0);
    for (let i = 0; i < da.length; i++) {
      for (let j = 0; j < db.length; j++) {
        res[i + da.length*j] += da[i] * db[j] * Math.pow(10, i+j);
      }
    }
    let temp = 0;
    let carryCount = 0;
    for (let k = 0; k < res.length; k++) {
      carryCount += countCarryOperations(temp, res[k], '+');
      temp += res[k];
    }
    carryCount += (da.length - 1) + (db.length - 1) + (da.length - 1) * (db.length - 1); // rough estimate for cross-digit carries  
    return carryCount;
  }

  throw new Error("Unsupported operator: use '+', '-' or 'x' (or '*').");
}

// App state
let state = {
  module: null,
  questionIndex: 0,
  score: 0,
  correctCount: 0,
  currentAnswer: '',
  currentCorrectAnswer: '',
  timer: null,
  timerStart: 0,
  isWaiting: false
};

// DOM refs
const landingEl = document.getElementById('landing');
const modulesEl = document.getElementById('modules');
const gameEl = document.getElementById('game');
const resultsEl = document.getElementById('results');
const moduleTitleEl = document.getElementById('moduleTitle');
const questionTextEl = document.getElementById('questionText');
const inputDisplayEl = document.getElementById('inputDisplay');
const scoreDisplayEl = document.getElementById('scoreDisplay');
const feedbackEl = document.getElementById('feedback');
const timerProgressEl = document.getElementById('timerProgress');
const numpadEl = document.getElementById('numpad');
const backBtn = document.getElementById('backToLanding');
const returnHomeBtn = document.getElementById('returnHome');
const resultsTextEl = document.getElementById('resultsText');
const numQuestionsInput = document.getElementById('numQuestionsInput');
const timePerQuestionInput = document.getElementById('timePerQuestionInput');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const resetHighscoresBtn = document.getElementById('resetHighscoresBtn');

// Fetch modules from backend and render
// Local modules: add new modules here. Each module must provide
// { id, title, generateQuestion() } where generateQuestion returns { text, answer }
const modules = [
  {
    id: 'addition',
    title: 'Add numbers',
    generateQuestion() {
      // generate until the number of carry operations equals selected difficulty
      const targetCarries = getDifficulty();
      let a, b, sum, carries;
      let attempts = 0;
      const MAX_ATTEMPTS = 10000;
      do {
        a = Math.floor(Math.random() * 1000) + 1;
        b = Math.floor(Math.random() * 1000) + 1;
        sum = a + b;
        carries = countCarryOperations(a, b, '+');
        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) break;
      } while (carries > targetCarries);
      if (carries > targetCarries) console.warn(`addition generator: gave up after ${attempts} attempts (target ${targetCarries}, got ${carries})`);
      return { text: `${a} + ${b} = ?`, answer: String(sum) };
    }
  },
  {
    id: 'subtract',
    title: 'Subtract numbers',
    generateQuestion() {
      // generate until number of borrow operations equals selected difficulty
      // ensure a >= b so result is non-negative
      const targetBorrows = getDifficulty();
      let a, b, result, borrows;
      let attempts = 0;
      const MAX_ATTEMPTS = 10000;
      do {
        a = Math.floor(Math.random() * 1000) + 1;
        b = Math.floor(Math.random() * 1000) + 1;
        if (a < b) {
          const t = a; a = b; b = t;
        }
        result = a - b;
        borrows = countCarryOperations(a, b, '-');
        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) break;
      } while (borrows > targetBorrows);
      if (borrows > targetBorrows) console.warn(`subtract generator: gave up after ${attempts} attempts (target ${targetBorrows}, got ${borrows})`);
      return { text: `${a} - ${b} = ?`, answer: String(result) };
    }
  },
  {
    id: 'multiply',
    title: 'Multiply',
    generateQuestion() {
      // generate until the number of carry operations equals selected difficulty
      const targetCarries = getDifficulty();
      let baseA, baseB, a, b, product, carries;
      let attempts = 0;
      const MAX_ATTEMPTS = 10000;
      const SCALE_PROB = 0.35; // chance to scale one operand by 10^k (k up to 3)
      do {
        baseA = Math.floor(Math.random() * 100) + 2;
        baseB = Math.floor(Math.random() * 100) + 2;
        a = baseA;
        b = baseB;
        product = a * b;
        carries = countCarryOperations(a, b, 'x');

        if (Math.random() < SCALE_PROB) {
            const k = Math.floor(Math.random() * 3) + 1; // 1..3
            b = b * Math.pow(10, k);
            carries += 1;
    }
        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) break;
      } while (carries > targetCarries);
      if (carries > targetCarries+1) console.warn(`multiply generator: gave up after ${attempts} attempts (target ${targetCarries}, got ${carries})`);
      return { text: `${a} x ${b} = ? (complexity ${carries})`, answer: String(a*b) };
    }
  }
  ,
  {
    id: 'fraction',
    title: 'Fraction',
    generateQuestion() {
      // generate q and r like the multiply module (1..50, sometimes scaled by 10^k)
      const targetCarries = getDifficulty();
      let p, q, r, N, carries;
      let attempts = 0;
      const MAX_ATTEMPTS = 10000;
      const SCALE_PROB = 0.35; // chance to scale one operand by 10^k (k up to 3)
      do {
        q = Math.floor(Math.random() * 7) + 2;
        r = Math.floor(Math.random() * 100) + 2;
        
        carries = countCarryOperations(q, r, 'x');

        if (Math.random() < SCALE_PROB) {
            const k = Math.floor(Math.random() * 3) + 1; // 1..3
            r = r * Math.pow(10, k);
            carries += 1;
        }
        N = q * r;

        p = Math.floor(Math.random() * (q-1)) + 1;
        carries += countCarryOperations(p, r, 'x');

        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) break;
      } while (carries > targetCarries);
      if (carries > targetCarries+1) console.warn(`multiply generator: gave up after ${attempts} attempts (target ${targetCarries}, got ${carries})`);

      // render as a vertical fraction (numerator above denominator)
      const html = `
  <div class="fraction-expression">
    <span class="multiplier">${N} ×</span>
    <div class="fraction">
      <span class="numerator">${p}</span>
      <span class="bar"></span>
      <span class="denominator">${q}</span>
    </div>
  </div>
`;

      return { html, answer: String(N*p/q) };
    }
  }
];

function renderModules() {
  modulesEl.innerHTML = '';
  const diffLabels = ['Easy','Medium','Hard'];
  modules.forEach(m => {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.tabIndex = 0;
    const d = getDifficulty();
    const diffText = diffLabels[d] || 'Medium';
    const diffClass = d === 0 ? 'diff-easy' : (d === 2 ? 'diff-hard' : '');
    const diffHtml = diffClass ? `<span class="${diffClass}">${diffText}</span>` : diffText;
    card.innerHTML = `<h3>${m.title}</h3><p>${getNumQuestions()} questions • ${getTimePerQuestionSec()}s each • ${diffHtml}</p>`;
    card.addEventListener('click', () => startModule(m));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') startModule(m); });
    modulesEl.appendChild(card);
  });
}

function startModule(module) {
  state.module = module;
  state.questionIndex = 0;
  state.score = 0;
  state.correctCount = 0;
  showScreen('game');
  moduleTitleEl.textContent = module.title;
  scoreDisplayEl.textContent = `Score: ${state.score}`;
  nextQuestion();
}

function showScreen(name) {
  landingEl.classList.toggle('hidden', name !== 'landing');
  gameEl.classList.toggle('hidden', name !== 'game');
  resultsEl.classList.toggle('hidden', name !== 'results');
}

function nextQuestion() {
  feedbackEl.className = 'feedback hidden';
  state.currentAnswer = '';
  updateInputDisplay();
  if (state.questionIndex >= getNumQuestions()) {
    finishModule();
    return;
  }
  const q = state.module.generateQuestion();
  state.currentCorrectAnswer = String(q.answer);
  // support modules that return `html` for richer rendering (e.g. fraction)
  if (q && q.html) {
    questionTextEl.innerHTML = q.html;
  } else {
    questionTextEl.textContent = q.text || '';
  }
  state.questionIndex += 1;
  startTimer();
}

function startTimer() {
  clearInterval(state.timer);
  state.timerStart = Date.now();
  timerProgressEl.style.width = '100%';
  const total = getTimePerQuestionMs();
  state.timer = setInterval(() => {
    const elapsed = Date.now() - state.timerStart;
    const pct = Math.max(0, 100 - (elapsed / total * 100));
    timerProgressEl.style.width = pct + '%';
    if (elapsed >= total) {
      clearInterval(state.timer);
      submitAnswer(null, true); // timed out
    }
  }, 50);
}

function stopTimer() {
  clearInterval(state.timer);
}

function updateInputDisplay() {
  inputDisplayEl.textContent = state.currentAnswer === '' ? '—' : state.currentAnswer;
}

function submitAnswer(provided = null, timedOut = false) {
  if (state.isWaiting) return;
  state.isWaiting = true;
  stopTimer();
  const answer = timedOut ? null : (provided !== null ? String(provided) : state.currentAnswer);
  let correct = false;
  let points = 0;
  if (answer !== null && answer === state.currentCorrectAnswer) {
    correct = true;
    // compute elapsed time in seconds
    const elapsedMs = Date.now() - state.timerStart;
    const gracePeriod = 3; // 3 seconds grace period
    const t = Math.max(0, elapsedMs / 1000 - gracePeriod);
    // score for this question: int(10 * 10^(-t/10))
    points = Math.floor(10 * Math.pow(10, -t / 10));
    if (!Number.isFinite(points) || points < 0) points = 0;
    state.score += points;
    state.correctCount = (state.correctCount || 0) + 1;
    scoreDisplayEl.textContent = `Score: ${state.score}`;
  }

  showFeedback(correct, timedOut, points);

  setTimeout(() => {
    state.isWaiting = false;
    nextQuestion();
  }, 900);
}

function showFeedback(correct, timedOut, points = 0) {
  feedbackEl.classList.remove('hidden');
  if (correct) {
    feedbackEl.className = 'feedback success';
    // show points earned when correct
    feedbackEl.textContent = `Correct! +${points} points`;
  } else if (timedOut) {
    feedbackEl.className = 'feedback error';
    feedbackEl.textContent = `Time's up! Answer: ${state.currentCorrectAnswer}`;
  } else {
    feedbackEl.className = 'feedback error';
    feedbackEl.textContent = `Not quite — correct: ${state.currentCorrectAnswer}`;
  }
}

function finishModule() {
  showScreen('results');
  const totalQ = getNumQuestions();
  // show points-based score and number of correct answers
  resultsTextEl.textContent = `You scored ${state.score} points (${state.correctCount || 0} / ${totalQ} correct)`;
  // Save high score per-module in localStorage
  try {
    const key = `mathgame_highscore_${state.module.id}`;
    const prev = Number(localStorage.getItem(key) || '0');
    if (state.score > prev) {
      localStorage.setItem(key, String(state.score));
    }
    const best = localStorage.getItem(key) || '0';
    const bestEl = document.createElement('div');
    bestEl.style.marginTop = '8px';
    bestEl.style.fontWeight = '700';
    bestEl.textContent = `Best for this module: ${best} points`;
    resultsTextEl.appendChild(bestEl);
  } catch (e) { /* ignore storage errors */ }
}

// Numpad
function createNumpad() {
  numpadEl.innerHTML = '';
  const keys = ['1','2','3','4','5','6','7','8','9','←','0','OK'];
  keys.forEach(k => {
    const b = document.createElement('button');
    b.textContent = k;
    if (k === '0') b.classList.add('wide');
    b.addEventListener('click', () => handleKey(k));
    numpadEl.appendChild(b);
  });
}

function handleKey(k) {
  if (state.isWaiting) return;
  if (k === '←') {
    state.currentAnswer = state.currentAnswer.slice(0, -1);
  } else if (k === 'OK') {
    submitAnswer();
    return;
  } else {
    // append digit, limit length to avoid huge numbers
    if (state.currentAnswer.length < 6) state.currentAnswer += k;
  }
  updateInputDisplay();
}

// Keyboard support and navigation handlers are attached after DOM is ready

// Boot and settings initialization after DOM is ready
function initSettings() {
  try {
    if (numQuestionsInput) {
      numQuestionsInput.value = String(getNumQuestions());
      numQuestionsInput.addEventListener('change', (e) => {
        const v = Number(e.target.value) || DEFAULT_QUESTIONS_PER_MODULE;
        setNumQuestions(Math.max(1, Math.floor(v)));
      });
    }
    if (timePerQuestionInput) {
      timePerQuestionInput.value = String(getTimePerQuestionSec());
      timePerQuestionInput.addEventListener('change', (e) => {
        const v = Number(e.target.value) || DEFAULT_TIME_PER_QUESTION_SEC;
        setTimePerQuestionSec(Math.max(1, Math.floor(v)));
      });
    }
    // difficulty select
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
      difficultySelect.value = String(getDifficulty());
      difficultySelect.addEventListener('change', (e) => {
        setDifficulty(Number(e.target.value));
        // reflect change in module cards immediately
        renderModules();
      });
    }
  } catch (err) {
    console.error('Settings initialization failed', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // initialize settings inputs and UI
  initSettings();
  renderModules();
  createNumpad();
  showScreen('landing');

  // ensure settings panel is closed on load
  if (settingsPanel) settingsPanel.classList.remove('open');

  // Settings panel behavior (defined inside DOMContentLoaded so elements exist)
  function openSettings() {
    if (settingsPanel) settingsPanel.classList.add('open');
  }
  function closeSettings() {
    if (settingsPanel) settingsPanel.classList.remove('open');
  }

  if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
    // refresh inputs
    if (numQuestionsInput) numQuestionsInput.value = String(getNumQuestions());
    if (timePerQuestionInput) timePerQuestionInput.value = String(getTimePerQuestionSec());
    openSettings();
  });

  if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closeSettings();
  });

  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // save current input values and re-render modules
    if (numQuestionsInput) setNumQuestions(Number(numQuestionsInput.value) || DEFAULT_QUESTIONS_PER_MODULE);
    if (timePerQuestionInput) setTimePerQuestionSec(Number(timePerQuestionInput.value) || DEFAULT_TIME_PER_QUESTION_SEC);
    // also persist difficulty in case the select change event didn't fire
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) setDifficulty(Number(difficultySelect.value));
    renderModules();
    closeSettings();
  });

  if (resetHighscoresBtn) resetHighscoresBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!confirm('Reset all high scores? This cannot be undone.')) return;
    try {
      const prefix = 'mathgame_highscore_';
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      alert('High scores reset.');
    } catch (err) {
      console.error('Failed to reset highscores', err);
      alert('Failed to reset highscores');
    }
  });

  // (no overlay) clicking outside is handled by layout; panel slides in/out from left

  // Keyboard support (only when game screen is visible)
  window.addEventListener('keydown', (e) => {
    // if necessary elements are missing, ignore
    if (!landingEl || !resultsEl || !gameEl) return;
    // if results screen visible, ignore
    if (!landingEl.classList.contains('hidden') && resultsEl.classList.contains('hidden')) return;
    // if game not visible, ignore
    if (gameEl.classList.contains('hidden')) return;
    if (e.key >= '0' && e.key <= '9') {
      handleKey(e.key);
    } else if (e.key === 'Backspace') {
      handleKey('←');
    } else if (e.key === 'Enter') {
      handleKey('OK');
    } else if (e.key === 'Escape') {
      // close settings panel if open
      if (settingsPanel && settingsPanel.classList.contains('open')) closeSettings();
    }
  });

  // Navigation buttons
  if (backBtn) backBtn.addEventListener('click', () => {
    stopTimer();
    showScreen('landing');
  });
  if (returnHomeBtn) returnHomeBtn.addEventListener('click', () => showScreen('landing'));
});


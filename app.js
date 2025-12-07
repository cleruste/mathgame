// Frontend math game app.js (static-only)
// Question generation logic runs entirely in the browser so the site
// can be hosted as a static site (GitHub Pages, Netlify, etc.).

// Configuration (defaults are used if no saved preference exists)
const DEFAULT_QUESTIONS_PER_MODULE = 10;
const DEFAULT_TIME_PER_QUESTION_SEC = 10; // seconds

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

// App state
let state = {
  module: null,
  questionIndex: 0,
  score: 0,
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
    id: 'addition_1_100',
    title: 'Add numbers (1 to 100)',
    generateQuestion() {
      const a = Math.floor(Math.random() * 100) + 1;
      const b = Math.floor(Math.random() * 100) + 1;
      return { text: `${a} + ${b} = ?`, answer: String(a + b) };
    }
  },
  {
    id: 'subtract_1_100',
    title: 'Subtract numbers (1 to 100)',
    generateQuestion() {
      const a = Math.floor(Math.random() * 100) + 1;
      const b = Math.floor(Math.random() * 100) + 1;
      return { text: `${a} - ${b} = ?`, answer: String(a - b) };
    }
  },
  {
    id: 'multiply_1_12',
    title: 'Multiply (1 to 12)',
    generateQuestion() {
      const a = Math.floor(Math.random() * 12) + 1;
      const b = Math.floor(Math.random() * 12) + 1;
      return { text: `${a} × ${b} = ?`, answer: String(a * b) };
    }
  }
];

function renderModules() {
  modulesEl.innerHTML = '';
  modules.forEach(m => {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.tabIndex = 0;
    card.innerHTML = `<h3>${m.title}</h3><p>${getNumQuestions()} questions • ${getTimePerQuestionSec()}s each</p>`;
    card.addEventListener('click', () => startModule(m));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') startModule(m); });
    modulesEl.appendChild(card);
  });
}

function startModule(module) {
  state.module = module;
  state.questionIndex = 0;
  state.score = 0;
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
  questionTextEl.textContent = q.text;
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
  if (answer !== null && answer === state.currentCorrectAnswer) {
    correct = true;
    state.score += 1;
    scoreDisplayEl.textContent = `Score: ${state.score}`;
  }

  showFeedback(correct, timedOut);

  setTimeout(() => {
    state.isWaiting = false;
    nextQuestion();
  }, 900);
}

function showFeedback(correct, timedOut) {
  feedbackEl.classList.remove('hidden');
  if (correct) {
    feedbackEl.className = 'feedback success';
    feedbackEl.textContent = 'Correct!';
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
  const percent = Math.round((state.score / totalQ) * 100);
  resultsTextEl.textContent = `You got ${state.score} out of ${totalQ} — ${percent}%`;
  // Save high score per-module in localStorage
  try {
    const key = `mathgame_highscore_${state.module.id}`;
    const prev = Number(localStorage.getItem(key) || '0');
    if (state.score > prev) {
      localStorage.setItem(key, String(state.score));
    }
    const best = localStorage.getItem(key);
    const bestEl = document.createElement('div');
    bestEl.style.marginTop = '8px';
    bestEl.style.fontWeight = '700';
    bestEl.textContent = `Best for this module: ${best} / ${getNumQuestions()}`;
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

// Keyboard support
window.addEventListener('keydown', (e) => {
  if (landingEl.classList.contains('hidden') && !resultsEl.classList.contains('hidden')) return;
  if (resultsEl.classList.contains('hidden') && !landingEl.classList.contains('hidden')) return;
  if (gameEl.classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') {
    handleKey(e.key);
  } else if (e.key === 'Backspace') {
    handleKey('←');
  } else if (e.key === 'Enter') {
    handleKey('OK');
  }
});

// Navigation
backBtn.addEventListener('click', () => {
  stopTimer();
  showScreen('landing');
});
returnHomeBtn.addEventListener('click', () => {
  showScreen('landing');
});

// Boot
// Initialize settings UI and boot the app
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
  } catch (err) {
    console.error('Settings initialization failed', err);
  }
}

initSettings();
renderModules();
createNumpad();
showScreen('landing');

// Settings panel behavior
function openSettings() {
  if (settingsPanel) settingsPanel.classList.remove('hidden');
}
function closeSettings() {
  if (settingsPanel) settingsPanel.classList.add('hidden');
}

if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => {
  // refresh inputs
  if (numQuestionsInput) numQuestionsInput.value = String(getNumQuestions());
  if (timePerQuestionInput) timePerQuestionInput.value = String(getTimePerQuestionSec());
  openSettings();
});
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => closeSettings());
if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => {
  // save current input values and re-render modules
  if (numQuestionsInput) setNumQuestions(Number(numQuestionsInput.value) || DEFAULT_QUESTIONS_PER_MODULE);
  if (timePerQuestionInput) setTimePerQuestionSec(Number(timePerQuestionInput.value) || DEFAULT_TIME_PER_QUESTION_SEC);
  renderModules();
  closeSettings();
});

if (resetHighscoresBtn) resetHighscoresBtn.addEventListener('click', () => {
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
  } catch (e) {
    console.error('Failed to reset highscores', e);
    alert('Failed to reset highscores');
  }
});


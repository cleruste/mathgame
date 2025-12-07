// Frontend math game app.js (static-only)
// Question generation logic runs entirely in the browser so the site
// can be hosted as a static site (GitHub Pages, Netlify, etc.).

// Configuration
const QUESTIONS_PER_MODULE = 10;
const TIME_PER_QUESTION_MS = 10_000; // 10 seconds

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
    card.innerHTML = `<h3>${m.title}</h3><p>${QUESTIONS_PER_MODULE} questions • ${TIME_PER_QUESTION_MS/1000}s each</p>`;
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
  if (state.questionIndex >= QUESTIONS_PER_MODULE) {
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
  const total = TIME_PER_QUESTION_MS;
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
  const percent = Math.round((state.score / QUESTIONS_PER_MODULE) * 100);
  resultsTextEl.textContent = `You got ${state.score} out of ${QUESTIONS_PER_MODULE} — ${percent}%`;
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
renderModules();
createNumpad();
showScreen('landing');


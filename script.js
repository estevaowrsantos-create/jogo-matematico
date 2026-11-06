/* ==================== SINTETIZADOR DE ÁUDIO (Web Audio API) ==================== */
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  playIncorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  playLevelUp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  playGameOver() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }
}

const sounds = new SoundEffects();

/* ==================== ESTADO GLOBAL DO JOGO ==================== */
const GameState = {
  mode: 'menu', // 'menu', '2d', 'vr'
  level: 1,
  score: 0,
  streak: 0,
  consecutiveSuccesses: 0,
  highScore: 0,
  currentQuestion: null,
  timer: null,
  timeLeft: 15,
  maxTime: 15,
  isAnswering: false,

  levelNames: {
    1: 'Nível 1 - Fácil',
    2: 'Nível 2 - Intermediário',
    3: 'Nível 3 - Avançado',
    4: 'Nível 4 - Difícil',
    5: 'Nível 5 - Especialista'
  }
};

/* ==================== GERADOR DE EQUAÇÕES ==================== */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDistractors(correctAnswer, count = 3) {
  const distractors = new Set();
  let attempts = 0;

  while (distractors.size < count && attempts < 100) {
    attempts++;
    let delta = getRandomInt(1, 8) * (Math.random() < 0.5 ? 1 : -1);
    let wrong = correctAnswer + delta;

    if (wrong !== correctAnswer && wrong >= 0) {
      distractors.add(wrong);
    }
  }

  while (distractors.size < count) {
    let wrong = correctAnswer + distractors.size + 1;
    distractors.add(wrong);
  }

  return Array.from(distractors);
}

function generateQuestion(level) {
  let equationStr = '';
  let answer = 0;

  switch (level) {
    case 1: {
      // Adição e Subtração de 1 a 20
      const a = getRandomInt(1, 20);
      const b = getRandomInt(1, 20);
      if (Math.random() < 0.5) {
        equationStr = `${a} + ${b}`;
        answer = a + b;
      } else {
        const max = Math.max(a, b);
        const min = Math.min(a, b);
        equationStr = `${max} - ${min}`;
        answer = max - min;
      }
      break;
    }
    case 2: {
      // Multiplicação e Divisão (1 a 50)
      if (Math.random() < 0.5) {
        const a = getRandomInt(2, 10);
        const b = getRandomInt(2, 10);
        equationStr = `${a} × ${b}`;
        answer = a * b;
      } else {
        const b = getRandomInt(2, 9);
        const ans = getRandomInt(2, 10);
        const a = b * ans;
        equationStr = `${a} ÷ ${b}`;
        answer = ans;
      }
      break;
    }
    case 3: {
      // Expressões com duas operações e parênteses
      const a = getRandomInt(2, 8);
      const b = getRandomInt(2, 8);
      const c = getRandomInt(2, 10);
      if (Math.random() < 0.5) {
        equationStr = `(${a} + ${b}) × ${c}`;
        answer = (a + b) * c;
      } else {
        equationStr = `${a} × ${b} + ${c}`;
        answer = a * b + c;
      }
      break;
    }
    case 4: {
      // Potência, Raiz e Incógnita (X)
      const type = getRandomInt(1, 3);
      if (type === 1) {
        const x = getRandomInt(2, 9);
        equationStr = `${x}²`;
        answer = x * x;
      } else if (type === 2) {
        const rootAns = getRandomInt(2, 10);
        const val = rootAns * rootAns;
        equationStr = `√${val}`;
        answer = rootAns;
      } else {
        const val = getRandomInt(5, 30);
        const res = getRandomInt(35, 80);
        equationStr = `X + ${val} = ${res}`;
        answer = res - val;
      }
      break;
    }
    case 5:
    default: {
      // Equação de 1º grau e mistas complexas
      const a = getRandomInt(2, 5);
      const x = getRandomInt(2, 12);
      const b = getRandomInt(3, 20);
      const res = a * x + b;
      equationStr = `${a}X + ${b} = ${res}`;
      answer = x;
      break;
    }
  }

  const wrongOptions = generateDistractors(answer, 3);
  const options = [...wrongOptions, answer].sort(() => Math.random() - 0.5);

  return { equation: equationStr, answer: answer, options: options };
}

/* ==================== CONTROLADOR DE INTERFACE ==================== */
function loadHighScore() {
  const saved = localStorage.getItem('math_quest_highscore');
  if (saved) {
    GameState.highScore = parseInt(saved, 10);
    document.getElementById('menu-highscore').textContent = GameState.highScore;
  }
}

function saveHighScore() {
  if (GameState.score > GameState.highScore) {
    GameState.highScore = GameState.score;
    localStorage.setItem('math_quest_highscore', GameState.highScore.toString());
    document.getElementById('menu-highscore').textContent = GameState.highScore;
  }
}

function switchMode(newMode) {
  stopTimer();
  GameState.mode = newMode;

  const menuScreen = document.getElementById('menu-screen');
  const screen2D = document.getElementById('mode-2d-screen');
  const containerVR = document.getElementById('scene-vr-container');

  menuScreen.classList.add('hidden');
  screen2D.classList.add('hidden');
  containerVR.classList.add('hidden');

  if (newMode === 'menu') {
    menuScreen.classList.remove('hidden');
    saveHighScore();
  } else if (newMode === '2d') {
    screen2D.classList.remove('hidden');
    resetGame();
  } else if (newMode === 'vr') {
    containerVR.classList.remove('hidden');
    resetGame();
  }
}

function resetGame() {
  GameState.level = 1;
  GameState.score = 0;
  GameState.streak = 0;
  GameState.consecutiveSuccesses = 0;
  GameState.isAnswering = false;

  hideModals();
  updateUI();
  nextQuestion();
}

function hideModals() {
  document.getElementById('modal-level-up').classList.add('hidden');
  document.getElementById('modal-game-over').classList.add('hidden');

  const vrGameOver = document.getElementById('vr-modal-gameover');
  const vrLevelUp = document.getElementById('vr-modal-levelup');
  if (vrGameOver) vrGameOver.setAttribute('visible', 'false');
  if (vrLevelUp) vrLevelUp.setAttribute('visible', 'false');
}

function updateUI() {
  const levelName = GameState.levelNames[GameState.level] || `Nível ${GameState.level}`;
  
  // Atualiza 2D
  document.getElementById('display-level-2d').textContent = levelName;
  document.getElementById('display-score-2d').textContent = GameState.score;
  document.getElementById('display-streak-2d').textContent = `🔥 ${GameState.streak}`;
  
  const progPct = (GameState.consecutiveSuccesses / 5) * 100;
  document.getElementById('progress-fill-2d').style.width = `${progPct}%`;
  document.getElementById('progress-text-2d').textContent = `${GameState.consecutiveSuccesses}/5 para subir de nível`;

  // Cor de Fundo conforme nível (2D)
  document.body.style.background = `var(--bg-gradient-lvl${Math.min(GameState.level, 5)})`;

  // Atualiza VR
  const vrLevel = document.getElementById('vr-text-level');
  const vrScore = document.getElementById('vr-text-score');
  const vrStreak = document.getElementById('vr-text-streak');

  if (vrLevel) vrLevel.setAttribute('value', levelName.toUpperCase());
  if (vrScore) vrScore.setAttribute('value', `Pontos: ${GameState.score}`);
  if (vrStreak) vrStreak.setAttribute('value', `Sequencia: ${GameState.streak}`);
}

function nextQuestion() {
  GameState.isAnswering = false;
  GameState.currentQuestion = generateQuestion(GameState.level);
  
  const q = GameState.currentQuestion;

  // Renderiza 2D
  document.getElementById('equation-2d').textContent = q.equation;
  document.getElementById('feedback-2d').textContent = '';
  document.getElementById('feedback-2d').className = 'feedback-msg';

  const buttons2D = document.querySelectorAll('#options-2d-container .btn-option');
  buttons2D.forEach((btn, idx) => {
    btn.textContent = q.options[idx];
    btn.className = 'btn btn-option';
    btn.disabled = false;
  });

  // Renderiza VR
  const vrEq = document.getElementById('vr-text-equation');
  const vrFb = document.getElementById('vr-text-feedback');
  if (vrEq) vrEq.setAttribute('value', q.equation);
  if (vrFb) vrFb.setAttribute('value', '');

  q.options.forEach((optVal, idx) => {
    const vrOptText = document.getElementById(`vr-opt-${idx}`);
    if (vrOptText) vrOptText.setAttribute('value', optVal.toString());
  });

  startTimer();
}

/* ==================== TIMER ==================== */
function startTimer() {
  stopTimer();
  GameState.timeLeft = Math.max(8, 16 - GameState.level); // Menos tempo em níveis altos
  GameState.maxTime = GameState.timeLeft;

  updateTimerUI();

  GameState.timer = setInterval(() => {
    GameState.timeLeft -= 0.1;
    if (GameState.timeLeft <= 0) {
      GameState.timeLeft = 0;
      stopTimer();
      handleTimeOut();
    } else {
      updateTimerUI();
    }
  }, 100);
}

function stopTimer() {
  if (GameState.timer) {
    clearInterval(GameState.timer);
    GameState.timer = null;
  }
}

function updateTimerUI() {
  const pct = (GameState.timeLeft / GameState.maxTime) * 100;
  
  // Timer 2D
  const timerBar2D = document.getElementById('timer-bar-2d');
  if (timerBar2D) {
    timerBar2D.style.width = `${pct}%`;
    timerBar2D.style.backgroundColor = pct < 30 ? '#ef4444' : (pct < 60 ? '#f59e0b' : '#10b981');
  }

  // Timer VR
  const vrTimerBar = document.getElementById('vr-timer-bar');
  if (vrTimerBar) {
    const fullWidth = 3.8;
    const currentWidth = (pct / 100) * fullWidth;
    vrTimerBar.setAttribute('width', currentWidth.toString());
    vrTimerBar.setAttribute('position', `${(currentWidth - fullWidth) / 2} 0.65 0.02`);
  }
}

/* ==================== RESPOSTAS E LÓGICA DE JOGO ==================== */
function handleAnswer(selectedIndex) {
  if (GameState.isAnswering) return;
  GameState.isAnswering = true;
  stopTimer();

  const selectedValue = GameState.currentQuestion.options[selectedIndex];
  const isCorrect = selectedValue === GameState.currentQuestion.answer;

  // Feedback Visual 2D
  const buttons2D = document.querySelectorAll('#options-2d-container .btn-option');
  const feedback2D = document.getElementById('feedback-2d');

  // Feedback Visual VR
  const vrFb = document.getElementById('vr-text-feedback');

  if (isCorrect) {
    sounds.playCorrect();
    GameState.score += 10;
    GameState.streak++;
    GameState.consecutiveSuccesses++;

    if (buttons2D[selectedIndex]) buttons2D[selectedIndex].classList.add('correct-anim');
    feedback2D.textContent = '✨ RESPOSTA CORRETA! (+10)';
    feedback2D.className = 'feedback-msg correct';
    if (vrFb) vrFb.setAttribute('value', 'CORRETO! (+10)');

    saveHighScore();
    updateUI();

    setTimeout(() => {
      if (GameState.consecutiveSuccesses >= 5) {
        levelUp();
      } else {
        nextQuestion();
      }
    }, 1000);

  } else {
    sounds.playIncorrect();
    if (buttons2D[selectedIndex]) buttons2D[selectedIndex].classList.add('incorrect-anim');
    feedback2D.textContent = `❌ INCORRETO! Resposta: ${GameState.currentQuestion.answer}`;
    feedback2D.className = 'feedback-msg incorrect';
    if (vrFb) vrFb.setAttribute('value', `INCORRETO! Era: ${GameState.currentQuestion.answer}`);

    // Revela a correta nos botões 2D
    buttons2D.forEach((btn, idx) => {
      if (GameState.currentQuestion.options[idx] === GameState.currentQuestion.answer) {
        btn.classList.add('correct-anim');
      }
    });

    setTimeout(() => {
      gameOver('Você errou a resposta!');
    }, 1500);
  }
}

function handleTimeOut() {
  sounds.playIncorrect();
  const feedback2D = document.getElementById('feedback-2d');
  feedback2D.textContent = '⏱️ TEMPO ESGOTADO!';
  feedback2D.className = 'feedback-msg incorrect';

  const vrFb = document.getElementById('vr-text-feedback');
  if (vrFb) vrFb.setAttribute('value', 'TEMPO ESGOTADO!');

  setTimeout(() => {
    gameOver('Tempo esgotado!');
  }, 1200);
}

function levelUp() {
  sounds.playLevelUp();
  GameState.level++;
  GameState.consecutiveSuccesses = 0;

  const nextLevelName = GameState.levelNames[GameState.level] || `Nível ${GameState.level} - Mestre`;

  // Exibe Modal Level Up 2D
  if (GameState.mode === '2d') {
    document.getElementById('levelup-title').textContent = '🎉 SUBA DE NÍVEL!';
    document.getElementById('levelup-desc').textContent = `Você avançou para o ${nextLevelName}`;
    document.getElementById('modal-level-up').classList.remove('hidden');
  }

  // Exibe Modal Level Up VR
  if (GameState.mode === 'vr') {
    const vrLevelUp = document.getElementById('vr-modal-levelup');
    const vrText = document.getElementById('vr-levelup-text');
    if (vrText) vrText.setAttribute('value', nextLevelName);
    if (vrLevelUp) vrLevelUp.setAttribute('visible', 'true');
  }

  updateUI();
}

function gameOver(reason) {
  sounds.playGameOver();
  saveHighScore();

  if (GameState.mode === '2d') {
    document.getElementById('gameover-reason').textContent = reason;
    document.getElementById('gameover-score').textContent = GameState.score;
    document.getElementById('gameover-streak').textContent = GameState.streak;
    document.getElementById('modal-game-over').classList.remove('hidden');
  }

  if (GameState.mode === 'vr') {
    const vrGameOver = document.getElementById('vr-modal-gameover');
    const vrScoreText = document.getElementById('vr-gameover-score');
    if (vrScoreText) vrScoreText.setAttribute('value', `Pontos: ${GameState.score} | Recorde: ${GameState.highScore}`);
    if (vrGameOver) vrGameOver.setAttribute('visible', 'true');
  }
}

/* ==================== INICIALIZAÇÃO DE EVENTOS ==================== */
document.addEventListener('DOMContentLoaded', () => {
  loadHighScore();

  // Botões de Entrada do Menu
  document.getElementById('btn-start-2d').addEventListener('click', () => {
    sounds.init();
    switchMode('2d');
  });

  document.getElementById('btn-start-vr').addEventListener('click', () => {
    sounds.init();
    switchMode('vr');
  });

  // Botões Globais de Voltar ao Menu
  document.querySelectorAll('.btn-return-menu').forEach(btn => {
    btn.addEventListener('click', () => switchMode('menu'));
  });

  // Alternativas 2D
  const optionsContainer2D = document.getElementById('options-2d-container');
  optionsContainer2D.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-option');
    if (btn && !GameState.isAnswering) {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      handleAnswer(idx);
    }
  });

  // Botão Reiniciar e Som 2D
  document.getElementById('btn-restart-2d').addEventListener('click', () => resetGame());
  
  const soundBtn = document.getElementById('btn-sound-toggle');
  soundBtn.addEventListener('click', () => {
    sounds.enabled = !sounds.enabled;
    soundBtn.textContent = sounds.enabled ? '🔊 Som On' : '🔇 Som Off';
  });

  // Modais 2D
  document.getElementById('btn-continue-levelup').addEventListener('click', () => {
    document.getElementById('modal-level-up').classList.add('hidden');
    nextQuestion();
  });

  document.getElementById('btn-retry-gameover').addEventListener('click', () => {
    document.getElementById('modal-game-over').classList.add('hidden');
    resetGame();
  });

  // Eventos 3D / VR (A-Frame)
  const vrOptions = document.querySelectorAll('.vr-option-btn');
  vrOptions.forEach(optBox => {
    optBox.addEventListener('click', () => {
      if (GameState.mode === 'vr' && !GameState.isAnswering) {
        const idx = parseInt(optBox.getAttribute('data-idx'), 10);
        handleAnswer(idx);
      }
    });
  });

  const vrBtnRestart = document.getElementById('vr-btn-restart');
  if (vrBtnRestart) {
    vrBtnRestart.addEventListener('click', () => resetGame());
  }

  const vrBtnMenuGo = document.getElementById('vr-btn-menu-go');
  if (vrBtnMenuGo) {
    vrBtnMenuGo.addEventListener('click', () => switchMode('menu'));
  }

  const vrBtnContinue = document.getElementById('vr-btn-continue');
  if (vrBtnContinue) {
    vrBtnContinue.addEventListener('click', () => {
      const vrLevelUp = document.getElementById('vr-modal-levelup');
      if (vrLevelUp) vrLevelUp.setAttribute('visible', 'false');
      nextQuestion();
    });
  }
});

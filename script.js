document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Stop Master Pro iniciado");

  // =====================
  // CONFIG / DADOS
  // =====================
  const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const BLOQUEADAS = ['K', 'W', 'Y'];
  const TEMAS = [
    "Minha sogra é...",
    "Nome de pobre",
    "Coisa da geladeira",
    "Motivo de divórcio",
    "Animal",
    "Profissão",
    "Filme ou série",
    "Lugar estranho"
  ];

  const STORAGE_KEY = "stopMaster_v5";

  let estado = {
    letrasUsadas: [],
    modoJogo: false,
    tema: "Toque para sortear"
  };

  let audioCtx = null;
  let timerInterval = null;

  // =====================
  // UI
  // =====================
  const ui = {
    display: document.getElementById('display-letra'),
    btnSortear: document.getElementById('btn-sortear'),
    btnReset: document.getElementById('btn-reset'),
    listaHistorico: document.getElementById('history-list'),
    contador: document.getElementById('contador'),

    chkSom: document.getElementById('chk-som'),
    chkKXY: document.getElementById('chk-kxy'),

    tempo: document.getElementById('tempo-restante'),
    btnTimerStart: document.getElementById('btn-timer-start'),
    btnTimerStop: document.getElementById('btn-timer-stop'),
    selSegundos: document.getElementById('config-segundos'),

    btnMode: document.getElementById('btn-mode-toggle'),
    gameSheet: document.getElementById('game-sheet'),
    extraControls: document.getElementById('extra-controls'),
    gameInputs: document.querySelectorAll('.game-input'),
    btnStop: document.getElementById('btn-stop-game'),
    container: document.querySelector('.container'),

    temaTexto: document.getElementById('tema-atual'),
    btnTema: document.getElementById('btn-trocar-tema')
  };

  // =====================
  // INIT
  // =====================
  carregarEstado();
  atualizarModoJogo();

  // =====================
  // SORTEIO
  // =====================
  function poolAtual() {
    let pool = ALFABETO.filter(l => !estado.letrasUsadas.includes(l));
    if (ui.chkKXY.checked) {
      pool = pool.filter(l => !BLOQUEADAS.includes(l));
    }
    return pool;
  }

  function sortearLetra() {
    iniciarAudio();

    const pool = poolAtual();
    if (pool.length === 0) {
      ui.btnSortear.innerText = "FIM";
      ui.btnSortear.disabled = true;
      return;
    }

    ui.btnSortear.disabled = true;
    let giros = 0;

    const roleta = setInterval(() => {
      const visual = pool[Math.floor(Math.random() * pool.length)];
      ui.display.innerText = visual;
      tocarSom('click');
      giros++;

      if (giros >= 12) {
        clearInterval(roleta);
        const letraFinal = pool[Math.floor(Math.random() * pool.length)];
        finalizarRodada(letraFinal);
      }
    }, 80);
  }

  function finalizarRodada(letra) {
    estado.letrasUsadas.push(letra);
    ui.display.innerText = letra;
    tocarSom('win');
    adicionarHistorico(letra);
    salvarEstado();

    if (estado.modoJogo) iniciarRodadaJogo();
    else ui.btnSortear.disabled = false;
  }

  // =====================
  // MODO JOGO
  // =====================
  function atualizarModoJogo() {
    if (estado.modoJogo) {
      ui.gameSheet.classList.remove('hidden');
      ui.extraControls.classList.add('hidden');
      ui.container.classList.add('compact-mode');
    } else {
      ui.gameSheet.classList.add('hidden');
      ui.extraControls.classList.remove('hidden');
      ui.container.classList.remove('compact-mode');
    }
  }

  function iniciarRodadaJogo() {
    ui.gameInputs.forEach(i => {
      i.value = "";
      i.disabled = false;
      i.style.borderColor = "#555";
    });

    ui.btnStop.disabled = false;
    ui.btnStop.innerText = "✋ STOP!";
    iniciarTimer();
    setTimeout(() => ui.gameInputs[0].focus(), 100);
  }

  function pararJogo() {
    pararTimer();
    tocarSom('alarm');
    confete();

    ui.gameInputs.forEach(i => i.disabled = true);
    ui.btnStop.disabled = true;
    ui.btnStop.innerText = "TEMPO!";
    ui.btnSortear.disabled = false;
  }

  // =====================
  // TIMER
  // =====================
  function iniciarTimer() {
    clearInterval(timerInterval);
    let tempo = parseInt(ui.selSegundos.value);
    atualizarTempo(tempo);

    timerInterval = setInterval(() => {
      tempo--;
      atualizarTempo(tempo);
      if (tempo <= 10 && tempo > 0) tocarSom('tick');
      if (tempo <= 0) pararJogo();
    }, 1000);
  }

  function pararTimer() {
    clearInterval(timerInterval);
    ui.tempo.style.color = "#fff";
  }

  function atualizarTempo(s) {
    const min = String(Math.floor(s / 60)).padStart(2, '0');
    const seg = String(s % 60).padStart(2, '0');
    ui.tempo.innerText = `${min}:${seg}`;
    ui.tempo.style.color = s <= 10 ? "#cf6679" : "#7f38f0";
  }

  // =====================
  // UTIL
  // =====================
  function adicionarHistorico(letra) {
    const li = document.createElement('li');
    li.className = "bola-historico";
    li.innerText = letra;
    ui.listaHistorico.appendChild(li);
    ui.contador.innerText = ui.listaHistorico.children.length;
  }

  function trocarTema() {
    const tema = TEMAS[Math.floor(Math.random() * TEMAS.length)];
    estado.tema = tema;
    ui.temaTexto.innerText = tema;
    salvarEstado();
  }

  function salvarEstado() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }

  function carregarEstado() {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) return;
    estado = JSON.parse(salvo);
    estado.letrasUsadas.forEach(adicionarHistorico);
    if (estado.letrasUsadas.length)
      ui.display.innerText = estado.letrasUsadas.at(-1);
    ui.temaTexto.innerText = estado.tema;
  }

  // =====================
  // SOM / FX
  // =====================
  function iniciarAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function tocarSom(tipo) {
    if (!ui.chkSom.checked || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;

    if (tipo === 'click') osc.frequency.setValueAtTime(200, t);
    if (tipo === 'tick') osc.frequency.setValueAtTime(800, t);
    if (tipo === 'win') osc.frequency.setValueAtTime(500, t);
    if (tipo === 'alarm') osc.frequency.setValueAtTime(100, t);

    gain.gain.setValueAtTime(0.05, t);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  function confete() {
    if (window.confetti) confetti({ particleCount: 120, spread: 90 });
  }

  // =====================
  // EVENTOS
  // =====================
  ui.btnSortear.onclick = sortearLetra;
  ui.btnReset.onclick = () => location.reload();
  ui.btnMode.onclick = () => {
    estado.modoJogo = !estado.modoJogo;
    atualizarModoJogo();
    salvarEstado();
  };
  ui.btnStop.onclick = pararJogo;
  ui.btnTema.onclick = trocarTema;
});

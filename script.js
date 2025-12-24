document.addEventListener('DOMContentLoaded', () => {
    // --- DADOS ---
    const alfabetoCompleto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const letrasDificeis = ['K', 'W', 'Y'];
    const categorias = ["Nome", "Animal", "CEP", "Cor", "Objeto", "Comida", "Marca", "Sogra"];
    
    let letrasDisponiveis = [...alfabetoCompleto];
    let audioCtx = null;
    let intervaloTimer;
    let modoJogoAtivo = false;

    // --- DOM ---
    const ui = {
        display: document.getElementById('display-letra'),
        btnSortear: document.getElementById('btn-sortear'),
        btnReset: document.getElementById('btn-reset'),
        listaHistorico: document.getElementById('history-list'),
        contador: document.getElementById('contador'),
        inputQtd: document.getElementById('quantidade'),
        chkSom: document.getElementById('chk-som'),
        chkKXY: document.getElementById('chk-kxy'),
        tempo: document.getElementById('tempo-restante'),
        btnTimerStart: document.getElementById('btn-timer-start'),
        btnTimerStop: document.getElementById('btn-timer-stop'),
        selSegundos: document.getElementById('config-segundos'),
        
        // Elementos Novos do Modo Jogo
        btnMode: document.getElementById('btn-mode-toggle'),
        gameSheet: document.getElementById('game-sheet'),
        extraControls: document.getElementById('extra-controls'),
        gameInputs: document.querySelectorAll('.game-input'),
        btnStop: document.getElementById('btn-stop-game'),
        container: document.querySelector('.container')
    };

    // --- LÓGICA PRINCIPAL ---

    // 1. Alternar entre Modo Simples e Modo Jogo
    ui.btnMode.addEventListener('click', () => {
        modoJogoAtivo = !modoJogoAtivo;
        
        if (modoJogoAtivo) {
            ui.gameSheet.classList.remove('hidden');
            ui.extraControls.classList.add('hidden'); // Esconde histórico para dar espaço
            ui.container.classList.add('compact-mode'); // Diminui a letra
            ui.inputQtd.value = 1; // Força 1 letra por vez no modo jogo
        } else {
            ui.gameSheet.classList.add('hidden');
            ui.extraControls.classList.remove('hidden');
            ui.container.classList.remove('compact-mode');
        }
    });

    // 2. Sortear
    ui.btnSortear.addEventListener('click', () => {
        iniciarAudio();
        
        // Atualiza filtro de letras
        let pool = [...alfabetoCompleto];
        if (ui.chkKXY.checked) pool = pool.filter(l => !letrasDificeis.includes(l));
        
        // Lógica simples de sorteio (aleatória para demo)
        ui.btnSortear.disabled = true;
        
        let giros = 0;
        const intervalo = setInterval(() => {
            ui.display.innerText = pool[Math.floor(Math.random() * pool.length)];
            tocarSom('click');
            giros++;
            if (giros >= 10) {
                clearInterval(intervalo);
                const letraFinal = pool[Math.floor(Math.random() * pool.length)];
                ui.display.innerText = letraFinal;
                finalizarRodada(letraFinal);
            }
        }, 80);
    });

    function finalizarRodada(letra) {
        ui.btnSortear.disabled = false;
        tocarSom('win');
        adicionarHistorico(letra);

        // Se estiver no Modo Jogo:
        if (modoJogoAtivo) {
            prepararRodadaJogo();
        }
    }

    function prepararRodadaJogo() {
        // Limpa e habilita inputs
        ui.gameInputs.forEach(input => {
            input.value = "";
            input.disabled = false;
        });
        ui.btnStop.disabled = false;
        
        // Foca no primeiro campo (Nome)
        setTimeout(() => ui.gameInputs[0].focus(), 100);

        // Inicia o timer automaticamente
        iniciarTimer();
    }

    // 3. Botão STOP
    ui.btnStop.addEventListener('click', () => {
        pararTimer();
        tocarSom('alarm');
        dispararConfete();
        
        // Trava tudo
        ui.gameInputs.forEach(input => input.disabled = true);
        ui.btnStop.disabled = true;
    });

    // --- FUNÇÕES AUXILIARES (Timer, Som, etc) ---

    function iniciarTimer() {
        clearInterval(intervaloTimer);
        let tempo = parseInt(ui.selSegundos.value);
        atualizaVisor(tempo);
        
        intervaloTimer = setInterval(() => {
            tempo--;
            atualizaVisor(tempo);
            if (tempo <= 0) {
                pararTimer();
                tocarSom('alarm');
                if (modoJogoAtivo) ui.btnStop.click(); // Auto-stop
            }
        }, 1000);
    }

    function pararTimer() {
        clearInterval(intervaloTimer);
    }

    function atualizaVisor(s) {
        const min = Math.floor(s/60).toString().padStart(2,'0');
        const seg = (s%60).toString().padStart(2,'0');
        ui.tempo.innerText = `${min}:${seg}`;
    }

    function adicionarHistorico(letra) {
        const li = document.createElement('li');
        li.innerText = letra;
        li.className = 'bola-historico';
        ui.listaHistorico.appendChild(li);
        ui.contador.innerText = ui.listaHistorico.children.length;
    }

    // --- SOM (Mesmo do anterior) ---
    function iniciarAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    function tocarSom(tipo) {
        if (!ui.chkSom.checked || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const t = audioCtx.currentTime;
        
        if (tipo === 'click') {
            osc.frequency.setValueAtTime(200, t); osc.stop(t+0.1);
        } else if (tipo === 'win') {
            osc.frequency.setValueAtTime(400, t); osc.stop(t+0.3);
        } else if (tipo === 'alarm') {
            osc.type = 'square'; osc.frequency.setValueAtTime(800, t); 
            gain.gain.exponentialRampToValueAtTime(0.01, t+0.5);
            osc.stop(t+0.5);
        }
        osc.start(t);
    }

    function dispararConfete() {
        if(typeof confetti === 'function') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    
    // Reset
    ui.btnReset.addEventListener('click', () => location.reload());
});
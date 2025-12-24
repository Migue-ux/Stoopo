document.addEventListener('DOMContentLoaded', () => {
    console.log("Stop Master Pro Iniciado");

    // --- 1. DADOS ---
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const letrasKWY = ['K', 'W', 'Y'];
    const temas = ["Minha Sogra é...", "Nome de Pobre", "Motivo de Briga", "Animal", "Comida Ruim", "Profissão", "Filme", "Lugar"];
    
    // Estado Global (O que o jogo lembra)
    let estado = {
        usadas: [], // Letras que já saíram
        modoJogo: false,
        tema: "Toque para sortear"
    };

    let audioCtx = null;
    let timerInterval;

    // --- 2. PEGAR ELEMENTOS (DOM) ---
    // Se algum ID estiver errado no HTML, daria erro aqui. Agora está blindado.
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
        
        // Modo Jogo
        btnMode: document.getElementById('btn-mode-toggle'),
        gameSheet: document.getElementById('game-sheet'),
        extraControls: document.getElementById('extra-controls'),
        gameInputs: document.querySelectorAll('.game-input'),
        btnStop: document.getElementById('btn-stop-game'),
        container: document.querySelector('.container'),
        btnFullscreen: document.getElementById('btn-fullscreen'),
        
        // Tema
        temaTexto: document.getElementById('tema-atual'),
        btnTema: document.getElementById('btn-trocar-tema')
    };

    // Inicializa carregando dados salvos
    carregarEstado();

    // --- 3. LÓGICA DE SORTEIO (CORRIGIDA) ---
    ui.btnSortear.addEventListener('click', () => {
        iniciarAudioContext(); // Libera o som no navegador
        
        // 1. Descobrir quais letras sobraram
        let pool = alfabeto.filter(letra => !estado.usadas.includes(letra));
        
        // 2. Filtrar K, W, Y se necessário
        if (ui.chkKXY.checked) {
            pool = pool.filter(letra => !letrasKWY.includes(letra));
        }

        // 3. Verificação de Segurança: Acabaram as letras?
        if (pool.length === 0) {
            alert("Todas as letras já saíram! Clique em Reset.");
            ui.btnSortear.innerText = "FIM";
            ui.btnSortear.disabled = true;
            return;
        }

        // 4. Animação da Roleta
        ui.btnSortear.disabled = true;
        let giros = 0;
        
        const roleta = setInterval(() => {
            // Mostra letra aleatória visualmente
            const visual = pool[Math.floor(Math.random() * pool.length)];
            ui.display.innerText = visual;
            tocarSom('click');
            giros++;

            // Parar a roleta
            if (giros >= 12) {
                clearInterval(roleta);
                
                // Escolha FINAL Real
                const indexReal = Math.floor(Math.random() * pool.length);
                const letraEscolhida = pool[indexReal];
                
                finalizarSorteio(letraEscolhida);
            }
        }, 80);
    });

    function finalizarSorteio(letra) {
        ui.display.innerText = letra;
        estado.usadas.push(letra); // Adiciona na lista de bloqueio
        
        adicionarHistoricoVisual(letra);
        tocarSom('win');
        salvarEstado();

        // Se estiver no Modo Jogo, prepara os inputs
        if (estado.modoJogo) {
            iniciarRodadaJogo();
        } else {
            ui.btnSortear.disabled = false;
        }
    }

    // --- 4. MODO JOGO (STOP) ---
    ui.btnMode.addEventListener('click', () => {
        estado.modoJogo = !estado.modoJogo;
        atualizarInterfaceModo();
        salvarEstado();
    });

    function atualizarInterfaceModo() {
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
        ui.gameInputs.forEach(input => {
            input.value = "";
            input.disabled = false;
            input.style.borderColor = "#555";
        });
        ui.btnStop.disabled = false;
        ui.btnStop.innerText = "✋ STOP!";
        ui.btnStop.style.background = "#cf6679";
        
        setTimeout(() => ui.gameInputs[0].focus(), 100);
        iniciarCronometro();
    }

    ui.btnStop.addEventListener('click', () => {
        pararCronometro();
        tocarSom('alarm');
        confete();
        
        ui.gameInputs.forEach(input => input.disabled = true);
        ui.btnStop.innerText = "PAROU!";
        ui.btnStop.disabled = true;
        ui.btnStop.style.background = "#333";
        ui.btnSortear.disabled = false;
    });

    // --- 5. UTILITÁRIOS (Timer, Tema, Reset) ---
    
    // Timer
    function iniciarCronometro() {
        clearInterval(timerInterval);
        let tempo = parseInt(ui.selSegundos.value);
        atualizarVisorTempo(tempo);
        ui.btnTimerStart.disabled = true;

        timerInterval = setInterval(() => {
            tempo--;
            atualizarVisorTempo(tempo);
            
            if (tempo <= 5 && tempo > 0) tocarSom('tick'); // Tic Tac no final
            
            if (tempo <= 0) {
                if (estado.modoJogo) ui.btnStop.click(); // Auto-stop
                else {
                    pararCronometro();
                    tocarSom('alarm');
                }
            }
        }, 1000);
    }

    function pararCronometro() {
        clearInterval(timerInterval);
        ui.btnTimerStart.disabled = false;
        ui.tempo.style.color = "#fff";
    }
    
    ui.btnTimerStart.addEventListener('click', () => { iniciarAudioContext(); iniciarCronometro(); });
    ui.btnTimerStop.addEventListener('click', pararCronometro);

    function atualizarVisorTempo(s) {
        const min = Math.floor(s / 60).toString().padStart(2, '0');
        const seg = (s % 60).toString().padStart(2, '0');
        ui.tempo.innerText = `${min}:${seg}`;
        if (s <= 10) ui.tempo.style.color = "#ff4444";
    }

    // Temas
    ui.btnTema.addEventListener('click', () => {
        const novoTema = temas[Math.floor(Math.random() * temas.length)];
        ui.temaTexto.innerText = novoTema;
        estado.tema = novoTema;
        salvarEstado();
    });

    // Reset Total
    ui.btnReset.addEventListener('click', () => {
        if(confirm("Reiniciar tudo?")) {
            localStorage.removeItem('stopGame_v4');
            location.reload();
        }
    });

    ui.btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    });

    // --- 6. FUNÇÕES AUXILIARES (Save, Audio, Visual) ---

    function adicionarHistoricoVisual(letra) {
        const li = document.createElement('li');
        li.innerText = letra;
        li.className = 'bola-historico';
        ui.listaHistorico.appendChild(li);
        ui.contador.innerText = ui.listaHistorico.children.length;
    }

    function salvarEstado() {
        localStorage.setItem('stopGame_v4', JSON.stringify(estado));
    }

    function carregarEstado() {
        const salvo = localStorage.getItem('stopGame_v4');
        if (salvo) {
            estado = JSON.parse(salvo);
            // Reconstrói histórico
            estado.usadas.forEach(l => adicionarHistoricoVisual(l));
            if (estado.usadas.length > 0) ui.display.innerText = estado.usadas[estado.usadas.length - 1];
            ui.temaTexto.innerText = estado.tema;
            atualizarInterfaceModo();
        }
    }

    // Áudio Sintetizado (Não precisa de arquivos mp3)
    function iniciarAudioContext() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    function tocarSom(tipo) {
        if (!ui.chkSom.checked || !audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const t = audioCtx.currentTime;

        if (tipo === 'click') {
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.start(t); osc.stop(t + 0.1);
        } 
        else if (tipo === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(600, t + 0.2);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
        }
        else if (tipo === 'alarm') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.linearRampToValueAtTime(50, t + 0.5);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0.01, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
        }
        else if (tipo === 'tick') {
            osc.frequency.setValueAtTime(800, t);
            gain.gain.setValueAtTime(0.05, t);
            osc.stop(t + 0.05);
            osc.start(t);
        }
    }

    function confete() {
        if (window.confetti) {
            window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }
    }
});
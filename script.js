document.addEventListener('DOMContentLoaded', () => {
    // --- DADOS E CONFIGURAÇÕES ---
    const alfabetoCompleto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const letrasDificeis = ['K', 'W', 'Y'];
    const sugestoesTemas = [
        "Minha Sogra é...", "Nome de Pobre", "Coisa que tem na Geladeira", 
        "Motivo de Divórcio", "Animal Chifrudo", "Marca de Carro", 
        "Presente Ruim", "Profissão", "Filme ou Série", "Lugar para esconder corpo"
    ];

    // Estado do Jogo (O que será salvo)
    let estado = {
        letrasUsadas: [],
        modoJogo: false,
        temaAtual: "Toque para sortear"
    };

    let audioCtx = null;
    let intervaloTimer;
    let poolAtual = []; // Letras que sobraram para sortear

    // --- ELEMENTOS DO DOM (INTERFACE) ---
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
        
        // Área do Jogo (Stop)
        btnMode: document.getElementById('btn-mode-toggle'),
        gameSheet: document.getElementById('game-sheet'),
        extraControls: document.getElementById('extra-controls'),
        gameInputs: document.querySelectorAll('.game-input'),
        btnStop: document.getElementById('btn-stop-game'),
        container: document.querySelector('.container'),
        
        // Área de Temas
        temaTexto: document.getElementById('tema-atual'),
        btnTema: document.getElementById('btn-trocar-tema')
    };

    // --- INICIALIZAÇÃO ---
    carregarJogoSalvo();
    atualizarPoolDeLetras();

    // Registrar Service Worker (Para funcionar como App)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // --- FUNÇÕES DE LÓGICA ---

    function atualizarPoolDeLetras() {
        // Pega o alfabeto todo e remove o que já foi usado
        let base = alfabetoCompleto.filter(l => !estado.letrasUsadas.includes(l));
        
        // Se a caixa "Sem KWY" estiver marcada, remove elas também
        if (ui.chkKXY.checked) {
            base = base.filter(l => !letrasDificeis.includes(l));
        }
        poolAtual = base;
        
        // Verifica se acabou
        if (poolAtual.length === 0 && estado.letrasUsadas.length > 0) {
            ui.btnSortear.innerText = "FIM";
            ui.btnSortear.disabled = true;
        } else {
            ui.btnSortear.innerText = "SORTEAR";
            ui.btnSortear.disabled = false;
        }
    }

    function sortear() {
        iniciarAudio();
        atualizarPoolDeLetras(); // Garante que a lista está atualizada

        if (poolAtual.length === 0) {
            alert("Todas as letras já saíram! Clique em Reset.");
            return;
        }

        ui.btnSortear.disabled = true;
        let giros = 0;
        
        // Efeito visual de roleta
        const intervalo = setInterval(() => {
            const letraRandom = poolAtual[Math.floor(Math.random() * poolAtual.length)];
            ui.display.innerText = letraRandom;
            tocarSom('click');
            giros++;

            // Para a roleta após 10 giros
            if (giros >= 10) {
                clearInterval(intervalo);
                confirmarLetra(letraRandom); // Confirma a letra que parou visualmente? Não, melhor pegar uma real do pool.
                
                // Sorteio real final (para garantir que é válida)
                const indexFinal = Math.floor(Math.random() * poolAtual.length);
                const letraFinal = poolAtual[indexFinal];
                
                ui.display.innerText = letraFinal;
                finalizarRodada(letraFinal);
            }
        }, 80);
    }

    function finalizarRodada(letra) {
        estado.letrasUsadas.push(letra);
        ui.btnSortear.disabled = false;
        
        tocarSom('win');
        adicionarBolaHistorico(letra);
        atualizarPoolDeLetras();
        salvarJogo();

        // Se o modo jogo estiver ativo, libera os campos e inicia o timer
        if (estado.modoJogo) {
            prepararRodadaJogo();
        }
    }

    // --- MODO JOGO (STOP DIGITAL) ---

    function alternarModoJogo() {
        estado.modoJogo = !estado.modoJogo;
        aplicarVisualModoJogo();
        salvarJogo();
    }

    function aplicarVisualModoJogo() {
        if (estado.modoJogo) {
            ui.gameSheet.classList.remove('hidden');
            ui.extraControls.classList.add('hidden');
            ui.container.classList.add('compact-mode');
            ui.inputQtd.value = 1; // Força 1 letra
        } else {
            ui.gameSheet.classList.add('hidden');
            ui.extraControls.classList.remove('hidden');
            ui.container.classList.remove('compact-mode');
        }
    }

    function prepararRodadaJogo() {
        ui.gameInputs.forEach(input => {
            input.value = "";
            input.disabled = false; // Destrava
            input.style.borderColor = "#555";
        });
        ui.btnStop.disabled = false;
        ui.btnStop.innerText = "✋ STOP!";
        ui.btnStop.style.background = "#cf6679";
        
        // Foca no primeiro campo
        setTimeout(() => ui.gameInputs[0].focus(), 100);
        
        // Inicia timer sozinho
        iniciarTimer();
    }

    function pararJogoStop() {
        pararTimer();
        tocarSom('alarm');
        dispararConfete();
        
        // Trava tudo
        ui.gameInputs.forEach(input => {
            input.disabled = true;
            if(input.value.trim() !== "") input.style.borderColor = "#03DAC5"; // Verde se preencheu
        });
        ui.btnStop.disabled = true;
        ui.btnStop.innerText = "TEMPO ESGOTADO";
        ui.btnStop.style.background = "#333";
    }

    // --- SISTEMA DE SAVE (LOCAL STORAGE) ---

    function salvarJogo() {
        localStorage.setItem('stopMaster_v3', JSON.stringify(estado));
    }

    function carregarJogoSalvo() {
        const salvo = localStorage.getItem('stopMaster_v3');
        if (salvo) {
            estado = JSON.parse(salvo);
            
            // Restaura histórico visual
            ui.listaHistorico.innerHTML = '';
            estado.letrasUsadas.forEach(l => adicionarBolaHistorico(l));
            
            // Restaura última letra
            if (estado.letrasUsadas.length > 0) {
                ui.display.innerText = estado.letrasUsadas[estado.letrasUsadas.length - 1];
            }

            // Restaura tema
            ui.temaTexto.innerText = estado.temaAtual;

            // Restaura modo de jogo
            aplicarVisualModoJogo();
        }
    }

    function resetarTudo() {
        if(confirm("Tem certeza? Isso apagará todo o histórico.")) {
            localStorage.removeItem('stopMaster_v3');
            location.reload();
        }
    }

    // --- UTILITÁRIOS (Timer, Som, Historico) ---

    function trocarTema() {
        const random = sugestoesTemas[Math.floor(Math.random() * sugestoesTemas.length)];
        ui.temaTexto.innerText = random;
        estado.temaAtual = random;
        salvarJogo();
    }

    function adicionarBolaHistorico(letra) {
        const li = document.createElement('li');
        li.innerText = letra;
        li.className = 'bola-historico';
        ui.listaHistorico.appendChild(li);
        ui.contador.innerText = ui.listaHistorico.children.length;
    }

    function iniciarTimer() {
        clearInterval(intervaloTimer);
        let tempo = parseInt(ui.selSegundos.value);
        atualizaVisor(tempo);
        ui.btnTimerStart.disabled = true;

        intervaloTimer = setInterval(() => {
            tempo--;
            atualizaVisor(tempo);
            
            // Bônus: Tic-Tac nos últimos 10 segundos
            if (tempo <= 10 && tempo > 0) tocarSom('tick');

            if (tempo <= 0) {
                pararTimer();
                if (estado.modoJogo) pararJogoStop(); // Auto-stop
                else tocarSom('alarm');
            }
        }, 1000);
    }

    function pararTimer() {
        clearInterval(intervaloTimer);
        ui.btnTimerStart.disabled = false;
        ui.tempo.style.color = "#fff"; // Volta a cor normal
    }

    function atualizaVisor(s) {
        const min = Math.floor(s/60).toString().padStart(2,'0');
        const seg = (s%60).toString().padStart(2,'0');
        ui.tempo.innerText = `${min}:${seg}`;
        
        // Fica vermelho no fim
        if (s <= 10) ui.tempo.style.color = "#cf6679";
        else ui.tempo.style.color = "#7f38f0";
    }

    // --- SINTETIZADOR DE ÁUDIO ---
    function iniciarAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    
    function tocarSom(tipo) {
        if (!ui.chkSom.checked || !audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const t = audioCtx.currentTime;

        if (tipo === 'click') {
            osc.frequency.setValueAtTime(150, t);
            gain.gain.setValueAtTime(0.05, t);
            osc.stop(t+0.05);
        } else if (tipo === 'tick') { // Som de relógio
            osc.frequency.setValueAtTime(800, t);
            gain.gain.setValueAtTime(0.02, t);
            osc.stop(t+0.05);
        } else if (tipo === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(600, t+0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t+0.5);
            osc.stop(t+0.5);
        } else if (tipo === 'alarm') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.linearRampToValueAtTime(50, t+0.5);
            gain.gain.linearRampToValueAtTime(0.001, t+0.5);
            osc.stop(t+0.5);
        }
        osc.start(t);
    }

    function dispararConfete() {
        if(typeof confetti === 'function') confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    }

    // --- EVENT LISTENERS ---
    ui.btnSortear.addEventListener('click', sortear);
    ui.btnReset.addEventListener('click', resetarTudo);
    ui.btnMode.addEventListener('click', alternarModoJogo);
    ui.btnStop.addEventListener('click', pararJogoStop);
    ui.btnTimerStart.addEventListener('click', iniciarTimer);
    ui.btnTimerStop.addEventListener('click', pararTimer);
    ui.btnTema.addEventListener('click', trocarTema);
    ui.chkKXY.addEventListener('change', atualizarPoolDeLetras);
});
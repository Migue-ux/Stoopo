document.addEventListener('DOMContentLoaded', () => {
    // --- DADOS ---
    const alfabetoCompleto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const letrasDificeis = ['K', 'W', 'Y'];
    const categorias = ["Nome", "Animal", "CEP (Cidade/Estado/País)", "Cor", "Marca", "Objeto", "Comida", "Filme/Série", "Profissão", "Parte do Corpo", "Minha Sogra é...", "Inseto", "Instrumento Musical"];
    
    let letrasDisponiveis = [...alfabetoCompleto];
    let letrasUsadas = []; // Para salvar no storage
    let audioCtx = null;
    let intervaloTimer;

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
        tema: document.getElementById('tema-atual'),
        btnTrocarTema: document.getElementById('btn-trocar-tema'),
        tempo: document.getElementById('tempo-restante'),
        btnTimerStart: document.getElementById('btn-timer-start'),
        btnTimerStop: document.getElementById('btn-timer-stop'),
        selSegundos: document.getElementById('config-segundos'),
        btnFull: document.getElementById('btn-fullscreen')
    };

    // --- INICIALIZAÇÃO E STORAGE ---
    carregarJogo();

    // Registrar Service Worker (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registrado!'))
            .catch(err => console.log('Erro SW:', err));
    }

    function salvarJogo() {
        const estado = {
            usadas: letrasUsadas,
            kxy: ui.chkKXY.checked,
            som: ui.chkSom.checked
        };
        localStorage.setItem('stopGameData', JSON.stringify(estado));
    }

    function carregarJogo() {
        const salvo = localStorage.getItem('stopGameData');
        if (salvo) {
            const dados = JSON.parse(salvo);
            ui.chkKXY.checked = dados.kxy;
            ui.chkSom.checked = dados.som;
            letrasUsadas = dados.usadas || [];
            
            // Recalcula disponíveis
            atualizarBancoDeLetras(false); // false = não resetar usadas
            
            // Remove as que já foram usadas do banco disponível
            letrasDisponiveis = letrasDisponiveis.filter(l => !letrasUsadas.includes(l));
            
            // Reconstrói histórico visual
            letrasUsadas.forEach(l => criarBolaHistorico(l));
            ui.contador.innerText = letrasUsadas.length;
            
            if (letrasUsadas.length > 0) {
                ui.display.innerText = letrasUsadas[letrasUsadas.length - 1];
            }
            if (letrasDisponiveis.length === 0) travaBotaoFim();
        }
    }

    function atualizarBancoDeLetras(resetar = true) {
        if (ui.chkKXY.checked) {
            letrasDisponiveis = alfabetoCompleto.filter(l => !letrasDificeis.includes(l));
        } else {
            letrasDisponiveis = [...alfabetoCompleto];
        }
        if (resetar) letrasUsadas = [];
    }

    // --- LÓGICA DO JOGO ---
    function sortear() {
        iniciarAudio();
        let qtd = parseInt(ui.inputQtd.value);
        
        // Garante que o banco está atualizado (caso mude checkbox durante jogo)
        // Nota: Mudar KXY no meio do jogo é complexo, idealmente reseta, mas aqui filtramos apenas
        
        if (letrasDisponiveis.length === 0) {
            alert("Fim do alfabeto! Reinicie.");
            return;
        }

        if (qtd > letrasDisponiveis.length) qtd = letrasDisponiveis.length;

        ui.btnSortear.disabled = true;
        let giros = 0;
        
        // Animação Roleta
        const intervalo = setInterval(() => {
            let temp = [];
            for(let i=0; i<qtd; i++) 
                temp.push(alfabetoCompleto[Math.floor(Math.random() * alfabetoCompleto.length)]);
            
            ui.display.innerText = temp.join(" - ");
            tocarSom('click');
            giros++;

            if (giros >= 10) {
                clearInterval(intervalo);
                finalizarSorteio(qtd);
            }
        }, 80);
    }

    function finalizarSorteio(qtd) {
        let resultado = [];
        for (let i = 0; i < qtd; i++) {
            const idx = Math.floor(Math.random() * letrasDisponiveis.length);
            const letra = letrasDisponiveis.splice(idx, 1)[0];
            letrasUsadas.push(letra);
            resultado.push(letra);
            criarBolaHistorico(letra);
        }

        ui.display.innerText = resultado.join(" - ");
        ui.contador.innerText = letrasUsadas.length;
        
        tocarSom('win');
        dispararConfete();
        salvarJogo();
        novoTema();

        if (letrasDisponiveis.length > 0) {
            ui.btnSortear.disabled = false;
        } else {
            travaBotaoFim();
        }
    }

    function travaBotaoFim() {
        ui.btnSortear.innerText = "FIM";
        ui.btnSortear.disabled = true;
        dispararConfete(true); // Chuva grande no final
    }

    function criarBolaHistorico(letra) {
        const li = document.createElement('li');
        li.innerText = letra;
        li.className = 'bola-historico';
        ui.listaHistorico.appendChild(li);
    }

    function dispararConfete(muito = false) {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: muito ? 200 : 100,
                spread: muito ? 100 : 70,
                origin: { y: 0.6 }
            });
        }
    }

    function novoTema() {
        ui.tema.style.opacity = 0;
        setTimeout(() => {
            ui.tema.innerText = categorias[Math.floor(Math.random() * categorias.length)];
            ui.tema.style.opacity = 1;
        }, 200);
    }

    function reiniciarTotal() {
        if(confirm("Reiniciar todo o jogo?")) {
            localStorage.removeItem('stopGameData');
            location.reload(); // Maneira mais limpa de resetar tudo
        }
    }

    // --- SONS ---
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

        if (tipo === 'click') {
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.start(t); osc.stop(t + 0.1);
        } else if (tipo === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(600, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
        } else if (tipo === 'alarm') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, t);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.5);
            osc.start(t); osc.stop(t + 0.5);
        }
    }

    // --- TIMER ---
    function iniciarTimer() {
        iniciarAudio();
        clearInterval(intervaloTimer);
        let tempo = parseInt(ui.selSegundos.value);
        atualizaTimerDisplay(tempo);
        ui.btnTimerStart.disabled = true;

        intervaloTimer = setInterval(() => {
            tempo--;
            atualizaTimerDisplay(tempo);
            if (tempo <= 5 && tempo > 0) tocarSom('click');
            if (tempo <= 0) {
                clearInterval(intervaloTimer);
                tocarSom('alarm');
                ui.tempo.style.color = 'red';
                ui.btnTimerStart.disabled = false;
            }
        }, 1000);
    }

    function pararTimer() {
        clearInterval(intervaloTimer);
        ui.btnTimerStart.disabled = false;
        ui.tempo.style.color = '#03DAC5';
    }

    function atualizaTimerDisplay(s) {
        const min = Math.floor(s/60).toString().padStart(2,'0');
        const seg = (s%60).toString().padStart(2,'0');
        ui.tempo.innerText = `${min}:${seg}`;
    }

    // --- EVENTOS ---
    ui.btnSortear.addEventListener('click', sortear);
    ui.btnReset.addEventListener('click', reiniciarTotal);
    ui.btnTimerStart.addEventListener('click', iniciarTimer);
    ui.btnTimerStop.addEventListener('click', pararTimer);
    ui.btnTrocarTema.addEventListener('click', novoTema);
    ui.btnFull.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else if (document.exitFullscreen) document.exitFullscreen();
    });
    
    // Checkboxes salvam estado ao mudar
    ui.chkKXY.addEventListener('change', () => {
        if(confirm("Mudar essa regra reiniciará o jogo. Confirmar?")) reiniciarTotal();
        else ui.chkKXY.checked = !ui.chkKXY.checked; // desfaz a mudança
    });
    ui.chkSom.addEventListener('change', salvarJogo);
});
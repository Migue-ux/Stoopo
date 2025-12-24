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
            const visual = pool[Math.floor(randomControlado() * pool.length)];
            ui.display.innerText = visual;
            tocarSom('click');
            giros++;

            // Parar a roleta
            if (giros >= 12) {
                clearInterval(roleta);
                
                // Escolha FINAL Real
                const indexReal = MMath.floor(randomControlado() * pool.length);
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


// --- FUNÇÃO DE VALIDAÇÃO (AUTO-CORREÇÃO) ---
function conferirRespostas() {
    const letraSorteada = ui.display.innerText.trim().toUpperCase();

    ui.gameInputs.forEach(input => {
        const resposta = input.value.trim().toUpperCase();
        
        // Se estiver vazio, deixa cinza
        if (resposta === "") {
            input.style.borderColor = "#555"; 
            return;
        }

        // Verifica a primeira letra
        if (resposta.startsWith(letraSorteada)) {
            // CERTO: Borda Verde Neon e fundo levemente verde
            input.style.borderColor = "#00ff00";
            input.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
        } else {
            // ERRADO: Borda Vermelha e animação de tremor
            input.style.borderColor = "#ff0000";
            input.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
            
            // Adiciona classe de erro (opcional, se quiser animar no CSS)
            input.classList.add('erro-input');
        }
    });
}


// --- SISTEMA MULTIPLAYER (SALA SINCRONIZADA) ---
    
    // Variável para guardar a semente (o código da sala)
    let seedAtual = null;

    // Elemento do botão (coloque isso na lista 'ui' lá em cima se preferir)
    const btnMultiplayer = document.getElementById('btn-multiplayer');

    // Gerador de Números Pseudo-Aleatórios (Seeded RNG)
    // Isso garante que a sequência de letras seja IGUAL para quem tem o mesmo código
    function randomControlado() {
        if (seedAtual === null) {
            return Math.random(); // Modo normal (sozinho)
        }
        
        // Algoritmo simples de hash para gerar números baseados na string da sala
        // Cada vez que chama, ele avança o cálculo para a próxima letra ser diferente da anterior
        let t = seedAtual += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    if(btnMultiplayer) {
        btnMultiplayer.addEventListener('click', () => {
            const codigoSala = prompt("Digite um código para a sala (ex: AMIGOS123).\nTodos devem digitar o MESMO código para pegar as mesmas letras!");
            
            if (codigoSala && codigoSala.trim() !== "") {
                // Transforma o texto em um número inicial
                let hash = 0;
                for (let i = 0; i < codigoSala.length; i++) {
                    hash = ((hash << 5) - hash) + codigoSala.charCodeAt(i);
                    hash |= 0;
                }
                seedAtual = hash;
                
                alert(`Sala "${codigoSala}" ativada!\nAgora o sorteio será igual para todos.`);
                btnMultiplayer.innerText = `Sala: ${codigoSala}`;
                
                // Reinicia o histórico para começar sincronizado
                estado.usadas = [];
                ui.listaHistorico.innerHTML = '';
                ui.contador.innerText = '0';
            } else {
                seedAtual = null;
                btnMultiplayer.innerText = "👥 Online";
                alert("Modo aleatório (sozinho) ativado.");
            }
        });
    }
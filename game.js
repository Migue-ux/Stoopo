import { estado, salvarEstado } from "./state.js";
import { ui } from "./ui.js";
import { tocarSom } from "./audio.js";
import { iniciarTimer } from "./timer.js";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const BLOQUEADAS = ['K', 'W', 'Y'];

function poolAtual() {
  let pool = ALFABETO.filter(l => !estado.letrasUsadas.includes(l));
  if (ui.chkKXY.checked) {
    pool = pool.filter(l => !BLOQUEADAS.includes(l));
  }
  return pool;
}

export function sortearLetra() {
  const pool = poolAtual();
  if (pool.length === 0) return;

  ui.btnSortear.disabled = true;
  let giros = 0;

  const roleta = setInterval(() => {
    ui.display.innerText = pool[Math.floor(Math.random() * pool.length)];
    tocarSom('click', ui.chkSom.checked);
    giros++;

    if (giros >= 12) {
      clearInterval(roleta);
      finalizar(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, 80);
}

function finalizar(letra) {
  estado.letrasUsadas.push(letra);
  ui.display.innerText = letra;
  tocarSom('win', ui.chkSom.checked);
  salvarEstado();
  ui.btnSortear.disabled = false;
}

export function validarRespostas() {
  const letra = ui.display.innerText.trim().toUpperCase();
  let pontosRodada = 0;
  const usadas = new Set();

  ui.gameInputs.forEach(input => {
    const resposta = input.value.trim().toUpperCase();

    // vazio
    if (!resposta) {
      input.style.borderColor = "#555";
      return;
    }

    // começa certo
    if (resposta.startsWith(letra)) {
      if (usadas.has(resposta)) {
        pontosRodada += 5;
        input.style.borderColor = "#ffaa00"; // repetida
      } else {
        pontosRodada += 10;
        usadas.add(resposta);
        input.style.borderColor = "#00ff88"; // certo
      }
    } 
    // errado
    else {
      pontosRodada -= 5;
      input.style.borderColor = "#ff4444";
      input.classList.add("erro-input");
    }
  });

  estado.jogadores[0].pontos += pontosRodada;
  salvarEstado();
  atualizarPlacar();
}


export function atualizarPlacar() {
  ui.placar.innerText = `🔥 Pontos: ${estado.jogadores[0].pontos}`;
}


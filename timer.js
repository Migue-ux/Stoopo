let intervalo = null;

export function iniciarTimer(segundos, onTick, onEnd) {
  clearInterval(intervalo);
  let tempo = segundos;
  onTick(tempo);

  intervalo = setInterval(() => {
    tempo--;
    onTick(tempo);
    if (tempo <= 0) {
      clearInterval(intervalo);
      onEnd();
    }
  }, 1000);
}

export function pararTimer() {
  clearInterval(intervalo);
}

import { validarRespostas } from "./game.js";

function fimDaRodada() {
  validarRespostas();
  tocarSom('alarm', ui.chkSom.checked);
}


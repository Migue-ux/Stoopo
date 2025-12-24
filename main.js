import { carregarEstado, salvarEstado, estado } from "./state.js";
import { ui } from "./ui.js";
import { iniciarAudio } from "./audio.js";
import { sortearLetra } from "./game.js";

document.addEventListener("DOMContentLoaded", () => {
  carregarEstado();
  ui.temaTexto.innerText = estado.tema;

  ui.btnSortear.onclick = () => {
    iniciarAudio();
    sortearLetra();
  };

  ui.btnReset.onclick = () => {
    localStorage.clear();
    location.reload();
  };

  ui.btnTema.onclick = () => {
    const temas = ["Animal", "Lugar", "Filme", "Comida"];
    estado.tema = temas[Math.floor(Math.random() * temas.length)];
    ui.temaTexto.innerText = estado.tema;
    salvarEstado();
  };
});

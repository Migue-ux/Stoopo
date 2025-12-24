const STORAGE_KEY = "stopMaster_v6";

export const estado = {
  letrasUsadas: [],
  modoJogo: false,
  tema: "Toque para sortear",
  sala: null,
  jogadores: [
    { nome: "Jogador 1", pontos: 0 }
  ]
};


export function salvarEstado() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

export function carregarEstado() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) return;
  Object.assign(estado, JSON.parse(salvo));
}

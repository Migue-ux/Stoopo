let audioCtx = null;

export function iniciarAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

export function tocarSom(tipo, ativo = true) {
  if (!ativo || !audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const t = audioCtx.currentTime;
  const freq = {
    click: 200,
    tick: 800,
    win: 500,
    alarm: 100
  };

  osc.frequency.setValueAtTime(freq[tipo] || 300, t);
  gain.gain.setValueAtTime(0.05, t);

  osc.start(t);
  osc.stop(t + 0.1);
}

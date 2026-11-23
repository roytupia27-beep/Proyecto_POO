/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pukllay Sport - Efectos de Sonido Web Audio API para Notificaciones SMS y Autenticación
 */

export function reproducirSonidoNotificacionSMS(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tono 1: Campana armónica inicial (C6 ~ 1046 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tono 2: Resonancia de llegada (G6 ~ 1568 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1567.98, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);

    // Vibración háptica en celulares si está disponible
    if ('vibrate' in navigator) {
      navigator.vibrate([70, 40, 90]);
    }
  } catch {
    // Si el navegador bloquea audio por políticas de interacción, continúa silenciosamente
  }
}

export function reproducirSonidoExito(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const notas = [523.25, 659.25, 783.99, 1046.5]; // Do, Mi, Sol, Do agudo
    notas.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.27);
    });

    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 100]);
    }
  } catch {
    // Ignorar si el audio está silenciado
  }
}

// lib/sound.ts

export type SoundType = 
  | 'alertar'
  | 'arcade'
  | 'arma'
  | 'celular'
  | 'certo'
  | 'erro'
  | 'notificacao1'
  | 'notificacao_imponente'
  | 'notificacao_reversa'
  | 'salvar2'
  | 'salvar'
  | 'toc';

const soundMap: Record<SoundType, string> = {
  alertar: '/sounds/alertar de modificação.mp3',
  arcade: '/sounds/arcade.mp3',
  arma: '/sounds/arma.mp3',
  celular: '/sounds/celular.mp3',
  certo: '/sounds/certo.mp3',
  erro: '/sounds/erro.mp3',
  notificacao1: '/sounds/Notificação 1.mp3',
  notificacao_imponente: '/sounds/notificação mais imponetes.mp3',
  notificacao_reversa: '/sounds/notificação reversa.mp3',
  salvar2: '/sounds/salvar 2.mp3',
  salvar: '/sounds/salvar.mp3',
  toc: '/sounds/toc.mp3',
};

export const playSound = (type: SoundType, volume: number = 0.15) => {
  if (typeof window !== 'undefined') {
    try {
      // Verifica se o som está desativado pelo utilizador no localStorage (padrão é 'true' se não existir)
      const soundEnabled = localStorage.getItem('v5_sound_enabled') !== 'false';
      if (!soundEnabled) return;

      const path = soundMap[type];
      if (!path) return;

      const audio = new Audio(path);
      audio.volume = volume;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (e) {
      // Ignora erros
    }
  }
};
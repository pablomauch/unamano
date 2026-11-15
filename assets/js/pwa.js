// Registro del service worker + instalación en Android / iPhone.

let deferred = null;
const listeners = new Set();

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function canInstall() {
  if (isStandalone()) return false;
  return !!deferred || isIOS();
}

export function onInstallChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach(f => f(canInstall()));

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; emit(); });
window.addEventListener('appinstalled', () => { deferred = null; emit(); });

// Devuelve 'prompted' | 'ios' | 'none'
export async function install() {
  if (deferred) {
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null; emit();
    return 'prompted';
  }
  if (isIOS()) return 'ios';
  return 'none';
}

export function registerSW(path) {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(path).catch(err => console.warn('SW no registrado', err));
  });
}

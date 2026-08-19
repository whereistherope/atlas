// Start only after every classic module has established its shared bindings.
// Cloud initialisation is deliberately independent: local loading never awaits it.
try { window.AtlasCloud?.init(); } catch (_) {}
load();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

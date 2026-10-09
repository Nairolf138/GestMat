const DEFAULT_DURATION = 4000;
const activeToasts = new Map();

function getLayer() {
  let layer = document.querySelector('.gestmat-toast-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'gestmat-toast-layer';
    layer.setAttribute('aria-live', 'polite');
    document.body.appendChild(layer);
  }
  return layer;
}

function dismissToast(key) {
  const toast = activeToasts.get(key);
  if (!toast) return;
  activeToasts.delete(key);
  clearTimeout(toast.timer);
  toast.element.remove();
  if (!activeToasts.size) {
    document.querySelector('.gestmat-toast-layer')?.remove();
  }
  toast.onClose.forEach((callback) => callback());
}

export function showToast(message, type = 'danger', options = {}) {
  if (!message) return;
  const key = `${type}\u0000${message}`;
  let toast = activeToasts.get(key);
  if (!toast) {
    const element = document.createElement('div');
    element.className = `gestmat-toast gestmat-toast--${type}`;
    element.setAttribute('role', type === 'danger' ? 'alert' : 'status');

    const content = document.createElement('span');
    content.className = 'gestmat-toast__message';
    content.textContent = message;
    element.appendChild(content);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-close btn-close-white';
    close.setAttribute('aria-label', 'Fermer / Close');
    close.addEventListener('click', () => dismissToast(key));
    element.appendChild(close);

    getLayer().appendChild(element);
    toast = { element, timer: null, onClose: new Set() };
    activeToasts.set(key, toast);
  }

  if (options.onClose) toast.onClose.add(options.onClose);
  clearTimeout(toast.timer);
  if (options.duration !== false) {
    toast.timer = setTimeout(
      () => dismissToast(key),
      options.duration || DEFAULT_DURATION,
    );
  }
}

export function clearToasts() {
  activeToasts.forEach(({ timer, element }) => {
    clearTimeout(timer);
    element.remove();
  });
  activeToasts.clear();
  document.querySelector('.gestmat-toast-layer')?.remove();
}

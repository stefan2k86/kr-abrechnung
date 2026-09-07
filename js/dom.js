// Kleine DOM-Helfer (kein Framework).

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k in node && k !== 'list') { try { node[k] = v; } catch { node.setAttribute(k, v); } }
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: filename, style: 'display:none' });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}

let toastTimer = null;
export function toast(msg, { error = false, ms = 3500 } = {}) {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = el('div', { id: 'toast-host', style:
      'position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);z-index:80;max-width:90vw' });
    document.body.appendChild(host);
  }
  clear(host);
  host.append(el('div', {
    class: 'msg ' + (error ? 'err' : 'ok'),
    style: 'box-shadow:0 4px 16px rgba(0,0,0,.2)',
  }, msg));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => clear(host), ms);
}

export function openModal(builder) {
  const root = document.getElementById('modal-root');
  const backdrop = el('div', { class: 'modal-backdrop' });
  const box = el('div', { class: 'modal' });
  backdrop.append(box);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  builder(box, close);
  root.append(backdrop);
  return close;
}

export function fileButton(label, accept, onfile, { secondary = false } = {}) {
  const inp = el('input', {
    type: 'file', accept,
    onchange: (e) => { const f = e.target.files[0]; if (f) onfile(f); e.target.value = ''; },
  });
  return el('label', { class: 'btn filebtn' + (secondary ? ' secondary' : '') }, label, inp);
}

export function confirmDialog(text, onYes, { danger = true, jaText = 'Löschen' } = {}) {
  openModal((box, close) => {
    box.append(
      el('p', { text }),
      el('div', { class: 'modal-actions' },
        el('button', { class: 'secondary', onclick: close }, 'Abbrechen'),
        el('button', { class: danger ? 'danger' : '', onclick: () => { close(); onYes(); } }, jaText),
      ),
    );
  });
}

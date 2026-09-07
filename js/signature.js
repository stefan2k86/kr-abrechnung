// Unterschrift auf dem Tablet: Canvas mit Pointer Events -> PNG-DataURL.

export function createSignaturePad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false, last = null, hasInk = false;

  let cssW = 0, cssH = 0;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.round(rect.width || canvas.clientWidth || canvas.parentElement?.clientWidth || 480);
    cssH = Math.round(rect.height || canvas.clientHeight || 220);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.lineWidth = 2.2;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = '#10233a';
  }

  function pos(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function start(ev) {
    ev.preventDefault();
    drawing = true; last = pos(ev);
    canvas.setPointerCapture?.(ev.pointerId);
  }
  function move(ev) {
    if (!drawing) return;
    ev.preventDefault();
    const p = pos(ev);
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last = p; hasInk = true;
  }
  function end() { drawing = false; }

  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', end);

  const ro = new ResizeObserver(() => { const d = save(); resize(); if (d && hasInk) restore(d); });
  ro.observe(canvas);
  resize();

  function save() {
    if (!canvas.width || !canvas.height) return null;
    try {
      const d = canvas.toDataURL('image/png');
      return d && d.startsWith('data:image/png') ? d : null;
    } catch { return null; }
  }
  function restore(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:image/png')) return;
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, cssW, cssH);
    img.src = dataUrl;
  }

  return {
    clear() { hasInk = false; resize(); },
    isEmpty() { return !hasInk; },
    toDataURL() { return hasInk ? save() : null; },
    setFromDataURL(d) { if (d) { resize(); restore(d); hasInk = true; } },
    destroy() { ro.disconnect(); },
  };
}

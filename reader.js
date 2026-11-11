(() => {
  const d = document, root = d.documentElement, W = 1000;
  const book = d.querySelector('.rd-book'), read = d.querySelector('.rd-read'), nav = d.querySelector('.rd-nav');
  const pages = [...d.querySelectorAll('.rd-page')], tabs = [...d.querySelectorAll('.rd-tab')];
  const modes = [...d.querySelectorAll('[data-mode]')], zoomers = d.querySelector('.rd-zoom');
  const count = d.querySelector('.rd-count'), prev = d.querySelector('.rd-prev'), next = d.querySelector('.rd-next');
  const zin = d.querySelector('.rd-zin'), zout = d.querySelector('.rd-zout'), zfit = d.querySelector('.rd-zfit');
  const hint = d.querySelector('.rd-hint');
  const keep = {
    get: k => { try { return localStorage.getItem('dispatch-' + k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem('dispatch-' + k, v); } catch (e) { /* private window */ } },
  };
  let cur = 0, mode = 'read', zoom = 1;
  root.classList.add('rd-js');

  const fit = () => {                       // the page's width, inside the book's side margins
    const cs = getComputedStyle(book);
    const room = book.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.min(1, Math.max(0.2, room / W));
  };
  const scale = () => Math.min(1.6, fit() * zoom);

  function size(p) {                       // a page drawn at the current scale
    const f = p.firstElementChild, a = f.firstElementChild, s = scale();
    a.style.transform = 'scale(' + s + ')';
    f.style.width = Math.round(W * s) + 'px';
    f.style.height = Math.round(a.offsetHeight * s) + 'px';
  }
  function layout() {
    pages.forEach(p => { if (p.offsetParent !== null) size(p); });
    const s = scale();
    root.classList.toggle('rd-zoomed', zoom > 1.01);
    zfit.textContent = zoom > 1.01 ? Math.round(s * 100) + '%' : 'Fit';
    zout.disabled = zoom <= 1.01;
    zin.disabled = s >= 1.59;
  }
  function setZoom(z, cx, cy, edge) {      // keeps (cx, cy) in place, or puts `edge` at the screen's left
    const f = pages[cur].firstElementChild, s1 = scale(), r1 = f.getBoundingClientRect();
    if (cx === undefined) { cx = innerWidth / 2; cy = Math.max(0, Math.min(innerHeight / 2, r1.bottom)); }
    const px = (cx - r1.left) / s1, py = (cy - r1.top) / s1;
    const ex = edge === undefined ? null : (edge - r1.left) / s1;
    zoom = Math.max(1, Math.min(1.6 / fit(), z));
    layout();
    const s2 = scale(), r2 = f.getBoundingClientRect();
    book.scrollLeft += ex === null ? r2.left + px * s2 - cx : r2.left + ex * s2 - 10;
    window.scrollBy(0, r2.top + py * s2 - cy);
  }
  function zoomAt(x, y) {                  // double-tap: in to read the column under the finger, or back out
    if (zoom > 1.01) return setZoom(1, x, y);
    let edge;
    const el = d.elementFromPoint(x, y);
    if (el && el.closest('.rd-frame')) {
      for (const r of el.getClientRects()) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { edge = r.left; break; }
      }
    }
    setZoom(Math.max(1 / fit(), 1.45), x, y, edge);
  }

  function ui() {
    count.innerHTML = 'Page ' + (cur + 1) + ' of ' + pages.length + '<b></b>';
    count.lastChild.textContent = pages[cur].dataset.title;
    prev.disabled = cur === 0;
    next.disabled = cur === pages.length - 1;
    tabs.forEach((t, k) => t.setAttribute('aria-current', mode === 'pages' && k === cur ? 'page' : 'false'));
    modes.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  }
  function remember() {                   // the address shows the view and page (not stored: Read stays the default)
    try { history.replaceState(null, '', mode === 'read' ? '#read' : '#page-' + (cur + 1)); } catch (e) { /* sandboxed */ }
  }
  function turn(i, animate) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    if (mode !== 'pages') setMode('pages', false);
    const old = pages[cur], nw = pages[i];
    if (nw === old && nw.classList.contains('on')) return;
    const still = animate === false || matchMedia('(prefers-reduced-motion: reduce)').matches;
    pages.forEach(p => p.classList.remove('out-l', 'out-r', 'in-l', 'in-r'));
    if (old !== nw && old.classList.contains('on') && !still) {
      old.classList.add(i > cur ? 'out-l' : 'out-r');
      nw.classList.add(i > cur ? 'in-r' : 'in-l');
      setTimeout(() => { old.classList.remove('out-l', 'out-r'); if (pages[cur] !== old) old.classList.remove('on'); }, 460);
    } else if (old !== nw) {
      old.classList.remove('on');
    }
    nw.classList.add('on');
    cur = i;
    size(nw);
    window.scrollTo(0, 0);
    book.scrollLeft = 0;
    ui(); remember();
  }
  function setMode(m, toTop) {
    mode = m === 'read' ? 'read' : 'pages';
    book.hidden = mode === 'read';
    nav.hidden = mode === 'read';
    zoomers.hidden = mode === 'read';
    read.hidden = mode !== 'read';
    if (mode === 'pages') layout();
    if (toTop !== false) window.scrollTo(0, 0);
    ui(); remember();
  }

  prev.addEventListener('click', () => turn(cur - 1));
  next.addEventListener('click', () => turn(cur + 1));
  tabs.forEach((t, k) => t.addEventListener('click', () => turn(k)));
  modes.forEach(b => b.addEventListener('click', () => { setMode(b.dataset.mode); keep.set('view', mode); }));
  zin.addEventListener('click', () => setZoom(zoom * 1.5));
  zout.addEventListener('click', () => setZoom(zoom / 1.5));
  zfit.addEventListener('click', () => setZoom(1));
  d.addEventListener('keydown', ev => {
    if (mode !== 'pages' || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === 'ArrowRight') { turn(cur + 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft') { turn(cur - 1); ev.preventDefault(); }
  });
  let tap = null, lastTap = 0, touch = null;
  book.addEventListener('dblclick', ev => { if (Date.now() - lastTap > 700) zoomAt(ev.clientX, ev.clientY); });
  book.addEventListener('touchstart', ev => {
    touch = ev.touches.length === 1
      ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY, at: Date.now(), left: book.scrollLeft } : null;
  }, { passive: true });
  book.addEventListener('touchend', ev => {
    if (!touch || ev.changedTouches.length !== 1) return;
    const t = ev.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y, dt = Date.now() - touch.at;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {            // a tap: two make a double-tap
      if (tap && Date.now() - tap.at < 330 && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) < 40) {
        tap = null; lastTap = Date.now(); ev.preventDefault(); zoomAt(t.clientX, t.clientY);
      } else {
        tap = { x: t.clientX, y: t.clientY, at: Date.now() };
      }
      return;
    }
    const panned = Math.abs(book.scrollLeft - touch.left) > 2;          // reading a zoomed page sideways
    if (!panned && dt < 700 && Math.abs(dx) > 60 && Math.abs(dx) > 1.6 * Math.abs(dy)) turn(dx < 0 ? cur + 1 : cur - 1);
  }, { passive: false });
  addEventListener('hashchange', () => {                               // links to #page-2 or #read
    const m = /^#page-(\d+)$/.exec(location.hash);
    if (location.hash === '#read') setMode('read');
    else if (m) turn(+m[1] - 1, false);
  });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(layout);
  addEventListener('load', layout);

  const want = /^#page-(\d+)$/.exec(location.hash);
  cur = want ? Math.max(0, Math.min(pages.length - 1, +want[1] - 1)) : 0;
  pages.forEach((p, k) => p.classList.toggle('on', k === cur));
  setMode(location.hash === '#read' ? 'read' : (want ? 'pages' : (keep.get('view') || 'read')), false);
  if (hint && mode === 'pages' && fit() < 0.6 && !keep.get('hinted')) {
    hint.hidden = false;
    keep.set('hinted', '1');
    setTimeout(() => { hint.hidden = true; }, 7000);
    hint.addEventListener('click', () => { hint.hidden = true; });
  }
})();
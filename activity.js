/* When the Dispatch opens as a Discord Activity, greet Discord the way its Embedded App SDK
   does (a HANDSHAKE message), so Discord knows the page is up. Opened anywhere else, it does nothing. */
(() => {
  const frame = new URLSearchParams(location.search).get('frame_id');
  if (!frame) return;
  try {
    const target = (window.parent && window.parent.opener) || window.parent;
    target.postMessage([0, {v: 1, encoding: 'json', client_id: '1509082407213469817', frame_id: frame}],
                       document.referrer || '*');
  } catch (e) { /* not inside Discord after all */ }
})();

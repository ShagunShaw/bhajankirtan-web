(() => {
  const C = window.Catalog;
  const grid = document.getElementById("packGrid");

  C.getPackages()
    .then((list) => {
      grid.innerHTML = list.length
        ? list.map((p, i) => C.packCard(p, i, { full: true })).join("")
        : '<p class="empty">Packages will appear here soon.</p>';
    })
    .catch((e) => { grid.innerHTML = `<p class="empty">${C.escapeHTML(e.message)}</p>`; });
})();
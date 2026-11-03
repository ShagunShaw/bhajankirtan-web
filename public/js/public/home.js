(() => {
  const $ = (id) => document.getElementById(id);
  const C = window.Catalog;
  const PERF_LIMIT = 8, PACK_LIMIT = 3;
  let data = null;

  C.attachSuggest($("heroQ"), () => data);

  C.getPerformers()
    .then((d) => {
      data = d;
      const list = d.performers;
      $("perfGrid").innerHTML = list.length
        ? list.slice(0, PERF_LIMIT).map((p, i) => C.perfCard(p, i)).join("")
        : '<p class="empty">Artists will appear here soon.</p>';
      $("perfMore").hidden = list.length <= PERF_LIMIT;
    })
    .catch((e) => { $("perfGrid").innerHTML = `<p class="empty">${C.escapeHTML(e.message)}</p>`; });

  C.getPackages()
    .then((list) => {
      $("packGrid").innerHTML = list.length
        ? list.slice(0, PACK_LIMIT).map((p, i) => C.packCard(p, i, { stamp: true })).join("")
        : '<p class="empty">Packages will appear here soon.</p>';
      $("packMore").hidden = list.length <= PACK_LIMIT;
    })
    .catch((e) => { $("packGrid").innerHTML = `<p class="empty">${C.escapeHTML(e.message)}</p>`; });
})();
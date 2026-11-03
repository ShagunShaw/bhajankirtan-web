(() => {
  const $ = (id) => document.getElementById(id);
  const C = window.Catalog;
  let data = null;

  const apply = () => {
    if (!data) return;
    const q = $("sQ").value.trim();
    const list = C.filter(data.performers, q);

    $("sList").innerHTML = list.length
      ? list.map((p, i) => C.perfRow(p, i)).join("")
      : '<p class="empty">No artists match your search.</p>';

    $("sCount").textContent = `${list.length} artist${list.length === 1 ? "" : "s"} found${q ? ` for "${q}"` : ""}`;
    $("sAll").hidden = !q;
    history.replaceState(null, "", q ? `?q=${encodeURIComponent(q)}` : location.pathname);
  };

  C.attachSuggest($("sQ"), () => data);

  $("sForm").addEventListener("submit", (e) => {
    e.preventDefault();
    $("sQ").blur();
    apply();
  });

  $("sQ").value = new URLSearchParams(location.search).get("q") || "";

    $("sAll").addEventListener("click", () => {
    $("sQ").value = "";
    apply();
  });

  C.getPerformers()
    .then((d) => { data = d; apply(); })
    .catch((e) => {
      $("sList").innerHTML = `<p class="empty">${C.escapeHTML(e.message)}</p>`;
    });
})();
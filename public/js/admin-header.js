// Client-side fallback to ensure the active nav link matches current URL path
(() => {
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll(".admin-links a");

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (href && (currentPath === href || currentPath.startsWith(href + "/"))) {
      link.classList.add("active");
    } else if (href && currentPath !== href && !currentPath.startsWith(href + "/")) {
      link.classList.remove("active");
    }
  });
})();

// Client-side fallback to ensure the active nav link matches current URL path
(() => {
  const currentPath = window.location.pathname;
  const links = document.querySelectorAll(".admin-links a");

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (href && (currentPath === href || currentPath.startsWith(href + "/"))) {
      link.classList.add("active");
    } else if (href && currentPath !== href && !currentPath.startsWith(href + "/")) {
      link.classList.remove("active");
    }
  });
})();

document.getElementById("adminLogout")?.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    const result = await response.json();

    if (response.ok && result.success) {
      window.location.href = "/admin";
    } else {
      alert(result.message || "Logout failed.");
    }
  } catch {
    alert("Unable to logout. Please try again.");
  }
});

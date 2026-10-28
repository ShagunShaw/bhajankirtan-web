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
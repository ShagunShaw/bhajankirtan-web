
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const identifierInput = document.getElementById("identifier");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginButton");
  const errorElement = document.getElementById("loginError");
  const togglePassword = document.getElementById("togglePassword");

  togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Hide" : "Show";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) return;

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    const payload = {
      username: isEmail ? "" : identifier,
      email: isEmail ? identifier : "",
      password,
    };

    errorElement.hidden = true;
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success === true) {
        window.location.replace("/admin/dashboard");
        return;
      }

      errorElement.textContent =
        result.errMessage ||
        result.message ||
        "Login failed. Please check your credentials.";

      errorElement.hidden = false;
    } catch {
      errorElement.textContent =
        "Unable to connect to the server. Please try again.";
      errorElement.hidden = false;
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  });
});

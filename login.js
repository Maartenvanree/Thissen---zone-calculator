(() => {
  "use strict";

  const accessHash = "802e03bf48898b84a3c55bc1269b5f40ced6477f8bb6e64a7341f78c97d524e4";
  const sessionKey = "thissen-postcodecalculator-access";
  const body = document.body;
  const app = document.querySelector("#calculator-app");
  const form = document.querySelector("#login-form");
  const input = document.querySelector("#access-code");
  const error = document.querySelector("#login-error");
  const button = document.querySelector("#login-button");

  function unlock() {
    body.classList.remove("locked");
    app.setAttribute("aria-hidden", "false");
    document.querySelector("#postcode").focus();
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  try {
    if (sessionStorage.getItem(sessionKey) === accessHash) {
      unlock();
      return;
    }
  } catch (_) {
    // Session storage is optional; the code form still works without it.
  }

  input.focus();
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
    error.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    try {
      const submittedHash = await sha256(input.value);
      if (submittedHash !== accessHash) {
        error.textContent = "Onjuiste toegangscode.";
        input.value = "";
        input.focus();
        return;
      }
      try {
        sessionStorage.setItem(sessionKey, accessHash);
      } catch (_) {
        // Continue without persistence when browser storage is unavailable.
      }
      unlock();
    } catch (_) {
      error.textContent = "De toegangscode kon niet worden gecontroleerd. Probeer opnieuw.";
    } finally {
      button.disabled = false;
    }
  });
})();

const complaintInput = document.getElementById("complaint");
const charCount = document.getElementById("char-count");
const classifyBtn = document.getElementById("classify-btn");
const formError = document.getElementById("form-error");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const resultState = document.getElementById("result-state");
const unavailableState = document.getElementById("unavailable-state");

complaintInput.addEventListener("input", () => {
  charCount.textContent = `${complaintInput.value.length} / 5000 characters`;
  formError.textContent = "";
});

document.querySelectorAll(".example-chip").forEach(button => {
  button.addEventListener("click", () => {
    complaintInput.value = button.dataset.example || "";
    complaintInput.dispatchEvent(new Event("input"));
    complaintInput.focus();
  });
});

function showState(state) {
  emptyState.hidden = state !== "empty";
  loadingState.hidden = state !== "loading";
  resultState.hidden = state !== "result";
  unavailableState.hidden = state !== "unavailable";
}

function renderResult(data) {
  document.getElementById("predicted-category").textContent = data.category;
  const confidence = Math.max(0, Math.min(1, Number(data.confidence)));
  document.getElementById("confidence-text").textContent = `${(confidence * 100).toFixed(1)}%`;
  document.getElementById("confidence-bar").style.width = `${confidence * 100}%`;
  const container = document.getElementById("probabilities");
  container.replaceChildren();
  const probabilities = data.probabilities || {};
  Object.entries(probabilities)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .forEach(([label, value]) => {
      const numeric = Math.max(0, Math.min(1, Number(value)));
      const row = document.createElement("div");
      row.className = "probability-item";
      const meta = document.createElement("div");
      meta.className = "probability-meta";
      const name = document.createElement("span");
      name.textContent = label;
      const percentage = document.createElement("strong");
      percentage.textContent = `${(numeric * 100).toFixed(1)}%`;
      meta.append(name, percentage);
      const track = document.createElement("div");
      track.className = "probability-track";
      const bar = document.createElement("div");
      bar.style.width = `${numeric * 100}%`;
      track.append(bar);
      row.append(meta, track);
      container.append(row);
    });
  showState("result");
}

classifyBtn.addEventListener("click", async () => {
  const complaint = complaintInput.value.trim();
  formError.textContent = "";
  if (!complaint) {
    formError.textContent = "Please enter a complaint before classifying.";
    complaintInput.focus();
    return;
  }
  if (complaint.length > 5000) {
    formError.textContent = "Please keep the complaint under 5,000 characters.";
    return;
  }

  classifyBtn.disabled = true;
  classifyBtn.querySelector("span:first-child").textContent = "Classifying…";
  showState("loading");
  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 503) {
        document.getElementById("unavailable-message").textContent =
          data.error || "The trained model is not ready. Train the model and restart the application.";
        showState("unavailable");
      } else {
        showState("empty");
        formError.textContent = data.error || "The complaint could not be classified. Please try again.";
      }
      return;
    }
    renderResult(data);
  } catch (error) {
    showState("empty");
    formError.textContent = "Could not connect to the server. Check that the Flask application is running.";
  } finally {
    classifyBtn.disabled = false;
    classifyBtn.querySelector("span:first-child").textContent = "Classify complaint";
  }
});

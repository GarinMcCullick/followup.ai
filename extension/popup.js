function injectFollowUpWidget() {
  if (document.getElementById("followup-widget")) return;

  const widget = document.createElement("div");
  widget.id = "followup-widget";
  widget.innerHTML = `
    <div id="followup-inner">
      <strong>
        <a href="http://localhost:3000" target="_blank">
          FollowUp.ai
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="responsive-icon">
            <path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l82.7 0L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3l0 82.7c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160c0-17.7-14.3-32-32-32L320 0zM80 32C35.8 32 0 67.8 0 112L0 432c0 44.2 35.8 80 80 80l320 0c44.2 0 80-35.8 80-80l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-320c0-8.8 7.2-16 16-16l112 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 32z"/>
          </svg>
        </a>
      </strong><br>
      <button id="followup-send">Save Job</button>
    </div>
  `;
  document.body.appendChild(widget);

  // Drag-and-drop functionality
  const followupWidget = document.getElementById("followup-widget");
  let isDragging = false;
  let offsetX, offsetY;

  followupWidget.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - followupWidget.getBoundingClientRect().left;
    offsetY = e.clientY - followupWidget.getBoundingClientRect().top;
    followupWidget.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;

      // Ensure the widget doesn't go off the left or right edge of the screen
      const maxX = window.innerWidth - followupWidget.offsetWidth;
      const maxY = window.innerHeight - followupWidget.offsetHeight;

      // Restrict movement within bounds
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      followupWidget.style.left = `${newX}px`;
      followupWidget.style.top = `${newY}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    followupWidget.style.cursor = "grab";
  });

  document
    .getElementById("followup-send")
    .addEventListener("click", async () => {
      const jobTitle =
        document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')
          ?.innerText ||
        document.querySelector('[data-testid="simpler-jobTitle"]')?.innerText ||
        "Unknown Title";

      const jobDescription =
        document.querySelector("#jobDescriptionText")?.innerText ||
        "No description available.";

      const company =
        document.querySelector('[data-testid="inlineHeader-companyName"]')
          ?.innerText ||
        document.querySelector(".jobsearch-JobInfoHeader-companyNameLink")
          ?.innerText ||
        "Unknown Company";

      const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      await fetch("http://localhost:5000/api/save-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Extension-API-Key": "true",
        },
        body: JSON.stringify({
          date: date,
          title: jobTitle,
          company: company,
          jobDescription: jobDescription,
          url: window.location.href,
        }),
      });

      // Update UI to indicate success
      document.getElementById("followup-send").innerText = "✓ Sent!";
    });
}

// Inject widget immediately and when URL changes
injectFollowUpWidget();

let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(injectFollowUpWidget, 500); // Wait for DOM to change
  }
}, 1000);

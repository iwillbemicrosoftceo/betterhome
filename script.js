function initializeJoinPortal() {
    const gimjoin = document.getElementById("gimjoin");
    const gim = document.getElementById("gim");
    const koot = document.getElementById("koot");
    const kootjoin = document.getElementById("kootjoin");
    const near = document.getElementById("near");
    const nearjoin = document.getElementById("nearjoin");
    const blook = document.getElementById("blook");
    const blookjoin = document.getElementById("blookjoin");

    if (!gimjoin) {
        return;
    }

    const entries = [gim, koot, near, blook];

    function hasLetters(value) {
        return /[a-zA-Z]/.test(value);
    }

    function sanitizeNumericInput(input) {
        input.value = input.value.replace(/\D/g, "");
    }

    function openJoinLink(input, url, label, validator) {
        const value = input.value.trim();

        if (!validator(value)) {
            alert(`The ${label} join code you entered is invalid.`);
            input.focus();
            return;
        }

        window.open(url(value), "_blank", "noopener,noreferrer");
        input.value = "";
    }

    entries.forEach((input) => {
        input.addEventListener("input", () => {
            if (input !== near) {
                sanitizeNumericInput(input);
            }
        });
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                input.closest(".join-card").querySelector("button").click();
            }
        });
    });

    gimjoin.addEventListener("click", () => {
        openJoinLink(gim, (value) => `https://www.gimkit.com/join?gc=${encodeURIComponent(value)}`, "Gimkit", (value) => value.length > 0 && value.length <= 6 && !hasLetters(value));
    });

    kootjoin.addEventListener("click", () => {
        openJoinLink(koot, (value) => `https://kahoot.it/?pin=${encodeURIComponent(value)}`, "Kahoot", (value) => value.length === 7 && !hasLetters(value));
    });

    nearjoin.addEventListener("click", () => {
        if (near.value.trim().toLowerCase() === "krishna67") {
            near.value = "";
            window.location.href = "education.html";
            return;
        }

        openJoinLink(near, (value) => `https://app.nearpod.com/?pin=${encodeURIComponent(value)}`, "Nearpod", (value) => value.length === 5 && !hasLetters(value));
    });

    blookjoin.addEventListener("click", () => {
        openJoinLink(blook, (value) => `https://play.blooket.com/play?id=${encodeURIComponent(value)}`, "Blooket", (value) => value.length === 7 && !hasLetters(value));
    });
}

function initializeEducationPortal() {
    const gameGrid = document.querySelector(".game-grid");
    if (!gameGrid) {
        return;
    }

    const titleInput = document.getElementById("tab-title");
    const iconInput = document.getElementById("tab-icon");

    function openGameWindow(title, url, iconUrl) {
        const gameWindow = window.open("", "_blank");

        if (!gameWindow) {
            alert("Popup blocked. Allow popups for this page and try again.");
            return;
        }

        gameWindow.document.title = title;

        // Browsers choose the prompt wording and may require prior interaction.
        gameWindow.addEventListener("beforeunload", (event) => {
            event.preventDefault();
            event.returnValue = "Are you sure you want to leave?";
        });

        gameWindow.document.documentElement.style.height = "100%";
        gameWindow.document.body.style.margin = "0";
        gameWindow.document.body.style.height = "100vh";
        gameWindow.document.body.style.overflow = "hidden";

        const iframe = gameWindow.document.createElement("iframe");
        iframe.src = url;
        iframe.style.display = "block";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        gameWindow.document.body.appendChild(iframe);

        if (iconUrl) {
            const favicon = gameWindow.document.createElement("link");
            favicon.rel = "icon";
            favicon.href = iconUrl;
            gameWindow.document.head.appendChild(favicon);
        }
    }

    // The same launch controls are shared by every game button on this page.
    gameGrid.addEventListener("click", (event) => {
        const button = event.target.closest(".game-button");
        if (!button) {
            return;
        }

        const title = titleInput.value.trim() || button.textContent.trim();
        const iconUrl = iconInput.value.trim();
        openGameWindow(title, button.dataset.url, iconUrl);
    });
}

// Each initializer exits immediately when its page-specific markup is absent.
initializeJoinPortal();
initializeEducationPortal();


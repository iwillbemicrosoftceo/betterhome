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

    nearjoin.addEventListener("click", async () => {
        const value = near.value.trim();
        if (/^\d{5}$/.test(value)) {
            openJoinLink(near, (code) => `https://app.nearpod.com/?pin=${encodeURIComponent(code)}`, "Nearpod", (code) => code.length === 5 && !hasLetters(code));
            return;
        }

        const portalWindow = window.open("about:blank", "_blank");
        if (!portalWindow) {
            alert("Popup blocked. Allow popups for this page and try again.");
            return;
        }

        try {
            const response = await fetch("/api/portal-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: value })
            });
            if (!response.ok) {
                portalWindow.close();
                const message = response.status === 429
                    ? "Too many attempts. Try again later."
                    : response.status === 401
                        ? "The portal password is incorrect."
                        : response.status === 503
                            ? "Portal login is not configured. Check PORTAL_PASSWORD and SESSION_SECRET in Netlify."
                            : "Portal login is unavailable. Try again later.";
                alert(message);
                near.focus();
                return;
            }

            near.value = "";
            portalWindow.document.title = "Student Dashboard";
            const portalFrame = portalWindow.document.createElement("iframe");
            portalFrame.src = new URL("education.html", window.location.href).href;
            portalFrame.title = "Student Dashboard";
            portalFrame.style.cssText = "display:block;width:100%;height:100%;border:0";
            portalWindow.document.documentElement.style.height = "100%";
            portalWindow.document.body.style.cssText = "margin:0;height:100vh;overflow:hidden";
            portalWindow.document.body.appendChild(portalFrame);
        } catch {
            portalWindow.close();
            alert("Unable to reach the portal server. Try again.");
        }
    });

    blookjoin.addEventListener("click", () => {
        openJoinLink(blook, (value) => `https://play.blooket.com/play?id=${encodeURIComponent(value)}`, "Blooket", (value) => value.length === 7 && !hasLetters(value));
    });
}

async function initializeEducationPortal() {
    const gameGrid = document.getElementById("game-grid");
    if (!gameGrid) {
        return;
    }

    const pinnedSection = document.getElementById("pinned-games");
    const pinnedGameGrid = document.getElementById("pinned-game-grid");
    const allGamesSection = document.getElementById("all-games-section");

    if (window.top === window.self) {
        window.location.replace("index.html");
        return;
    }

    let sharedCatalogLoaded = false;
    try {
        const response = await fetch("/api/games", { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.games)) {
                const sharedButtons = data.games.map((game) => {
                    const url = normalizePresetUrl(game?.url);
                    if (typeof game?.name !== "string" || !game.name.trim() || !url) {
                        return null;
                    }
                    const button = document.createElement("button");
                    button.className = "game-button";
                    button.type = "button";
                    button.dataset.url = url;
                    button.textContent = game.name.trim();
                    return button;
                }).filter(Boolean);
                gameGrid.replaceChildren(...sharedButtons);
                sharedCatalogLoaded = true;
            }
        }
    } catch {}

    const titleInput = document.getElementById("tab-title");
    const iconPresets = document.getElementById("icon-presets");
    const addIconPresetButton = document.getElementById("add-icon-preset");
    const toggleIconEditButton = document.getElementById("toggle-icon-edit");
    const iconEditor = document.getElementById("icon-editor");
    const iconEditorForm = document.getElementById("icon-editor-form");
    const iconEditorTitle = document.getElementById("icon-editor-title");
    const iconEditorUrl = document.getElementById("icon-editor-url");
    const iconEditorError = document.getElementById("icon-editor-error");
    const iconEditorCancel = document.getElementById("icon-editor-cancel");
    const titleStorageKey = "betterhome.education.tabTitle";
    const iconStorageKey = "betterhome.education.tabIcon";
    const presetsStorageKey = "betterhome.education.iconPresets";
    const defaultPresets = [
        { url: "https://cms.instructure.com/favicon.ico" },
        { url: "https://600.ncsis.gov" },
        { url: "https://i-ready.com/favicon.ico" },
        { url: "https://google.com/favicon.ico" }
    ];
    let selectedIconUrl = "";

    try {
        titleInput.value = localStorage.getItem(titleStorageKey) || "";
        selectedIconUrl = localStorage.getItem(iconStorageKey) || "";
    } catch {}

    function saveAppearanceSettings() {
        try {
            localStorage.setItem(titleStorageKey, titleInput.value);
            localStorage.setItem(iconStorageKey, selectedIconUrl);
        } catch {}
    }

    function normalizePresetUrl(value) {
        if (typeof value !== "string") {
            return null;
        }
        const normalizedUrl = value.trim();
        try {
            const parsedUrl = new URL(normalizedUrl);
            return ["http:", "https:"].includes(parsedUrl.protocol) ? normalizedUrl : null;
        } catch {
            return null;
        }
    }

    function getPresetPreview(url) {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === "600.ncsis.gov" && parsedUrl.pathname === "/") {
            return `${parsedUrl.origin}/favicon.ico`;
        }
        return url;
    }

    let presets = defaultPresets;
    try {
        const savedValue = localStorage.getItem(presetsStorageKey);
        if (savedValue !== null) {
            const savedPresets = JSON.parse(savedValue);
            if (Array.isArray(savedPresets)) {
                if (savedPresets.length === 0) {
                    presets = [];
                } else if (typeof savedPresets[0] === "string") {
                    const legacyUrls = savedPresets.map(normalizePresetUrl).filter(Boolean);
                    presets = [...defaultPresets, ...legacyUrls.filter((url) => !defaultPresets.some((preset) => preset.url === url)).map((url) => ({ url }))];
                } else {
                    presets = savedPresets.map((preset) => normalizePresetUrl(preset?.url)).filter(Boolean).map((url) => ({ url }));
                }
            }
        }
    } catch {
        presets = defaultPresets;
    }

    function updateSelectedPreset() {
        iconPresets.querySelectorAll(".icon-preset").forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.iconUrl === selectedIconUrl));
        });
    }

    function savePresets() {
        try {
            localStorage.setItem(presetsStorageKey, JSON.stringify(presets));
        } catch {}
    }

    function renderPresets() {
        iconPresets.querySelectorAll(".icon-preset-item").forEach((item) => item.remove());
        presets.forEach((preset, index) => {
            const item = document.createElement("div");
            item.className = "icon-preset-item";
            item.dataset.presetIndex = String(index);

            const selectButton = document.createElement("button");
            selectButton.className = "icon-preset";
            selectButton.type = "button";
            selectButton.dataset.iconUrl = preset.url;
            selectButton.title = new URL(preset.url).hostname;
            selectButton.setAttribute("aria-label", `Use ${selectButton.title} favicon`);
            selectButton.setAttribute("aria-pressed", "false");

            const image = document.createElement("img");
            image.src = getPresetPreview(preset.url);
            image.alt = "";
            image.setAttribute("aria-hidden", "true");
            selectButton.appendChild(image);

            const actions = document.createElement("div");
            actions.className = "icon-preset-actions";
            const editButton = document.createElement("button");
            editButton.className = "icon-preset-edit";
            editButton.type = "button";
            editButton.title = "Edit favicon URL";
            editButton.setAttribute("aria-label", `Edit ${selectButton.title} favicon URL`);
            editButton.textContent = "✎";
            const deleteButton = document.createElement("button");
            deleteButton.className = "icon-preset-delete";
            deleteButton.type = "button";
            deleteButton.title = "Delete favicon preset";
            deleteButton.setAttribute("aria-label", `Delete ${selectButton.title} favicon preset`);
            deleteButton.textContent = "×";
            actions.append(editButton, deleteButton);
            item.append(selectButton, actions);
            iconPresets.insertBefore(item, addIconPresetButton);
        });
        updateSelectedPreset();
    }

    function setSelectedIcon(url) {
        selectedIconUrl = url;
        saveAppearanceSettings();
        updateSelectedPreset();
    }

    function addPreset(url) {
        presets.push({ url });
        savePresets();
        renderPresets();
        setSelectedIcon(url);
    }

    let editingPresetIndex = null;

    function openPresetEditor(index = null) {
        editingPresetIndex = index;
        iconEditorTitle.textContent = index === null ? "Add favicon preset" : "Edit favicon preset";
        iconEditorUrl.value = index === null ? "" : presets[index].url;
        iconEditorError.hidden = true;
        iconEditorError.textContent = "";
        iconEditor.showModal();
        iconEditorUrl.focus();
    }

    renderPresets();
    titleInput.addEventListener("input", saveAppearanceSettings);

    iconPresets.addEventListener("click", (event) => {
        const editButton = event.target.closest(".icon-preset-edit");
        const deleteButton = event.target.closest(".icon-preset-delete");
        const item = event.target.closest(".icon-preset-item");

        if (editButton && item) {
            const index = Number(item.dataset.presetIndex);
            openPresetEditor(index);
            return;
        }

        if (deleteButton && item) {
            const index = Number(item.dataset.presetIndex);
            const deletedUrl = presets[index].url;
            presets.splice(index, 1);
            if (selectedIconUrl === deletedUrl) {
                setSelectedIcon("");
            }
            savePresets();
            renderPresets();
            return;
        }

        const preset = event.target.closest(".icon-preset");
        if (preset) {
            setSelectedIcon(preset.dataset.iconUrl);
        }
    });

    addIconPresetButton.addEventListener("click", () => {
        openPresetEditor();
    });

    iconEditorCancel.addEventListener("click", () => iconEditor.close());

    iconEditorForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const url = normalizePresetUrl(iconEditorUrl.value);
        if (!url) {
            iconEditorError.textContent = "Enter a valid HTTP or HTTPS favicon URL.";
            iconEditorError.hidden = false;
            return;
        }

        if (presets.some((preset, index) => index !== editingPresetIndex && preset.url === url)) {
            iconEditorError.textContent = "That favicon is already in your presets.";
            iconEditorError.hidden = false;
            return;
        }

        if (editingPresetIndex === null) {
            addPreset(url);
        } else {
            const oldUrl = presets[editingPresetIndex].url;
            presets[editingPresetIndex] = { url };
            if (selectedIconUrl === oldUrl) {
                setSelectedIcon(url);
            }
            savePresets();
            renderPresets();
        }
        iconEditor.close();
    });

    toggleIconEditButton.addEventListener("click", () => {
        const editing = toggleIconEditButton.getAttribute("aria-pressed") !== "true";
        toggleIconEditButton.setAttribute("aria-pressed", String(editing));
        toggleIconEditButton.title = editing ? "Done editing favicon presets" : "Edit favicon presets";
        toggleIconEditButton.setAttribute("aria-label", toggleIconEditButton.title);
        iconPresets.classList.toggle("is-editing", editing);
    });

    const searchInput = document.getElementById("game-search");
    const emptyState = document.getElementById("game-empty-state");
    const gameContextMenu = document.getElementById("game-context-menu");
    const gameContextPinButton = document.getElementById("game-context-pin");
    const adminLoginButton = document.getElementById("admin-login");
    const adminDialog = document.getElementById("admin-dialog");
    const adminLoginForm = document.getElementById("admin-login-form");
    const adminPasswordInput = document.getElementById("admin-password");
    const adminLoginError = document.getElementById("admin-login-error");
    const adminLoginSubmit = adminLoginForm.querySelector("button[type='submit']");
    const adminLoginCancel = document.getElementById("admin-login-cancel");
    const adminGameManager = document.getElementById("admin-game-manager");
    const adminAddGameForm = document.getElementById("admin-add-game-form");
    const adminGameName = document.getElementById("admin-game-name");
    const adminGameUrl = document.getElementById("admin-game-url");
    const adminGameError = document.getElementById("admin-game-error");
    const adminGameList = document.getElementById("admin-game-list");
    const adminLogoutButton = document.getElementById("admin-logout");
    const adminDoneButton = document.getElementById("admin-done");
    const pinnedStorageKey = "betterhome.education.pinnedGames";

    const searchableGames = Array.from(gameGrid.querySelectorAll(".game-button")).map((button) => ({
        button,
        name: button.textContent.trim().toLowerCase()
    }));
    searchableGames.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));

    async function saveGames(games = searchableGames) {
        try {
            const response = await fetch("/api/games", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(games.map(({ button }) => ({
                    name: button.textContent.trim(),
                    url: button.dataset.url
                })))
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    let pinnedUrls = new Set();
    try {
        const savedPinnedUrls = JSON.parse(localStorage.getItem(pinnedStorageKey) || "[]");
        if (Array.isArray(savedPinnedUrls)) {
            const knownUrls = new Set(searchableGames.map(({ button }) => button.dataset.url));
            pinnedUrls = new Set(savedPinnedUrls.filter((url) => knownUrls.has(url)));
        }
    } catch {}

    function savePinnedGames() {
        try {
            localStorage.setItem(pinnedStorageKey, JSON.stringify(Array.from(pinnedUrls)));
        } catch {}
    }

    function renderGameSections() {
        const query = searchInput.value.trim().toLowerCase();
        const pinnedGames = [];
        const remainingGames = [];
        let visibleCount = 0;

        searchableGames.forEach(({ button, name }) => {
            button.hidden = query !== "" && !name.includes(query);
            visibleCount += Number(!button.hidden);
            (pinnedUrls.has(button.dataset.url) ? pinnedGames : remainingGames).push(button);
        });

        pinnedGameGrid.replaceChildren(...pinnedGames);
        gameGrid.replaceChildren(...remainingGames);
        pinnedSection.hidden = !pinnedGames.some((button) => !button.hidden);
        allGamesSection.hidden = !remainingGames.some((button) => !button.hidden);
        emptyState.hidden = visibleCount !== 0;
    }

    renderGameSections();
    searchInput.addEventListener("input", renderGameSections);

    function renderAdminGames() {
        adminGameList.replaceChildren();
        searchableGames.forEach(({ button }) => {
            const item = document.createElement("li");
            const name = document.createElement("span");
            name.textContent = button.textContent.trim();
            const removeButton = document.createElement("button");
            removeButton.className = "admin-remove-game";
            removeButton.type = "button";
            removeButton.textContent = "Remove";
            removeButton.setAttribute("aria-label", `Remove ${name.textContent}`);
            removeButton.addEventListener("click", async () => {
                if (!window.confirm(`Remove ${name.textContent} from the game list?`)) {
                    return;
                }
                const url = button.dataset.url;
                const updatedGames = searchableGames.filter((game) => game.button !== button);
                if (!await saveGames(updatedGames)) {
                    adminGameError.textContent = "Could not save the shared game list. Check your connection and admin session.";
                    adminGameError.hidden = false;
                    return;
                }
                const gameIndex = searchableGames.findIndex((game) => game.button === button);
                if (gameIndex !== -1) {
                    searchableGames.splice(gameIndex, 1);
                }
                pinnedUrls.delete(url);
                savePinnedGames();
                renderGameSections();
                renderAdminGames();
            });
            item.append(name, removeButton);
            adminGameList.append(item);
        });
    }

    let isAdminAuthenticated = false;
    adminLoginButton.addEventListener("click", () => {
        adminLoginError.hidden = true;
        adminLoginForm.hidden = isAdminAuthenticated;
        adminGameManager.hidden = !isAdminAuthenticated;
        if (isAdminAuthenticated) {
            renderAdminGames();
        }
        adminDialog.showModal();
        if (!isAdminAuthenticated) {
            adminPasswordInput.focus();
        }
    });

    adminLoginCancel.addEventListener("click", () => adminDialog.close());
    adminDoneButton.addEventListener("click", () => adminDialog.close());
    adminLogoutButton.addEventListener("click", async () => {
        try {
            await fetch("/api/admin-auth", { method: "DELETE" });
        } catch {}
        isAdminAuthenticated = false;
        adminLoginButton.textContent = "Admin login";
        adminLoginForm.hidden = false;
        adminGameManager.hidden = true;
        adminLoginForm.reset();
        adminDialog.close();
    });

    adminLoginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        adminLoginSubmit.disabled = true;
        adminLoginError.hidden = true;
        try {
            const response = await fetch("/api/admin-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: adminPasswordInput.value })
            });
            if (!response.ok) {
                adminLoginError.textContent = response.status === 429
                    ? "Too many attempts. Try again later."
                    : response.status === 401
                        ? "The admin password is incorrect."
                        : "Admin login is not configured or is unavailable.";
                adminLoginError.hidden = false;
                adminPasswordInput.select();
                return;
            }

            if (!sharedCatalogLoaded) {
                adminLoginError.textContent = "The shared game list is unavailable. Reload the page before editing games.";
                adminLoginError.hidden = false;
                return;
            }

            isAdminAuthenticated = true;
            adminLoginButton.textContent = "Manage games";
            adminLoginError.hidden = true;
            adminLoginForm.reset();
            adminLoginForm.hidden = true;
            adminGameManager.hidden = false;
            renderAdminGames();
        } catch {
            adminLoginError.textContent = "Unable to reach the server. Try again.";
            adminLoginError.hidden = false;
        } finally {
            adminLoginSubmit.disabled = false;
        }
    });

    adminAddGameForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = adminGameName.value.trim();
        const url = normalizePresetUrl(adminGameUrl.value);
        if (!name || !url) {
            adminGameError.textContent = "Enter a game name and a valid HTTP or HTTPS URL.";
            adminGameError.hidden = false;
            return;
        }
        if (searchableGames.some(({ button }) => button.dataset.url === url)) {
            adminGameError.textContent = "That game URL is already in the list.";
            adminGameError.hidden = false;
            return;
        }

        const button = document.createElement("button");
        button.className = "game-button";
        button.type = "button";
        button.dataset.url = url;
        button.textContent = name;
        const nextGames = [...searchableGames, { button, name: name.toLowerCase() }]
            .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
        if (!await saveGames(nextGames)) {
            adminGameError.textContent = "Could not save the shared game list. Check your connection and admin session.";
            adminGameError.hidden = false;
            return;
        }

        searchableGames.push({ button, name: name.toLowerCase() });
        searchableGames.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }));
        adminAddGameForm.reset();
        adminGameError.hidden = true;
        searchInput.value = "";
        renderGameSections();
        renderAdminGames();
    });

    let contextMenuGame = null;

    function closeGameContextMenu(restoreFocus = false) {
        gameContextMenu.hidden = true;
        if (restoreFocus && contextMenuGame) {
            contextMenuGame.focus();
        }
        contextMenuGame = null;
    }

    document.addEventListener("contextmenu", (event) => {
        const button = event.target.closest(".game-button");
        if (!button || !searchableGames.some((game) => game.button === button)) {
            closeGameContextMenu();
            return;
        }

        event.preventDefault();
        contextMenuGame = button;
        const isPinned = pinnedUrls.has(button.dataset.url);
        gameContextPinButton.textContent = isPinned ? "Unpin game" : "Pin game";
        gameContextMenu.hidden = false;
        const menuBounds = gameContextMenu.getBoundingClientRect();
        gameContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - menuBounds.width - 8))}px`;
        gameContextMenu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - menuBounds.height - 8))}px`;
        gameContextPinButton.focus();
    });

    gameContextPinButton.addEventListener("click", () => {
        if (!contextMenuGame) {
            return;
        }
        const url = contextMenuGame.dataset.url;
        if (pinnedUrls.has(url)) {
            pinnedUrls.delete(url);
        } else {
            pinnedUrls.add(url);
        }
        savePinnedGames();
        renderGameSections();
        closeGameContextMenu(true);
    });

    document.addEventListener("click", (event) => {
        if (!gameContextMenu.hidden && !gameContextMenu.contains(event.target)) {
            closeGameContextMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !gameContextMenu.hidden) {
            event.preventDefault();
            closeGameContextMenu(true);
        }
    });

    function openGameWindow(title, url, iconUrl) {
        const gameWindow = window.open("", "_blank");

        if (!gameWindow) {
            alert("Popup blocked. Allow popups for this page and try again.");
            return;
        }

        gameWindow.document.title = title;
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

    [pinnedGameGrid, gameGrid].forEach((grid) => {
        grid.addEventListener("click", (event) => {
            const button = event.target.closest(".game-button");
            if (!button) {
                return;
            }

            const title = titleInput.value.trim() || button.textContent.trim();
            openGameWindow(title, button.dataset.url, selectedIconUrl);
        });
    });
}

initializeJoinPortal();
initializeEducationPortal().catch(() => {});
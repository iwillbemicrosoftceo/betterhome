const gimjoin = document.getElementById("gimjoin");
const gim = document.getElementById("gim");
const koot = document.getElementById("koot");
const kootjoin = document.getElementById("kootjoin");
const near = document.getElementById("near");
const nearjoin = document.getElementById("nearjoin");
const blook = document.getElementById("blook");
const blookjoin = document.getElementById("blookjoin");

const entries = [gim, koot, near, blook];

function hasLettersRegex(str) {
    return /[a-zA-Z]/.test(str);
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
    openJoinLink(gim, (value) => `https://www.gimkit.com/join?gc=${encodeURIComponent(value)}`, "Gimkit", (value) => value.length > 0 && value.length <= 6 && !hasLettersRegex(value));
});

kootjoin.addEventListener("click", () => {
    openJoinLink(koot, (value) => `https://kahoot.it/?pin=${encodeURIComponent(value)}`, "Kahoot", (value) => value.length === 7 && !hasLettersRegex(value));
});

nearjoin.addEventListener("click", () => {
    if (near.value.trim().toLowerCase() === "krishna67") {
        near.value = "";
        window.location.href = "education.html";
        return;
    }

    openJoinLink(near, (value) => `https://app.nearpod.com/?pin=${encodeURIComponent(value)}`, "Nearpod", (value) => value.length === 5 && !hasLettersRegex(value));
});

blookjoin.addEventListener("click", () => {
    openJoinLink(blook, (value) => `https://play.blooket.com/play?id=${encodeURIComponent(value)}`, "Blooket", (value) => value.length === 7 && !hasLettersRegex(value));
});


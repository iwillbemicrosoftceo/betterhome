import { getStore } from "@netlify/blobs";
import { hasValidSession } from "./shared/auth.mjs";
import { DEFAULT_GAMES } from "./shared/default-games.mjs";

const store = getStore({ name: "betterhome-games", consistency: "strong" });

function jsonResponse(status, data) {
    return Response.json(data, {
        status,
        headers: { "Cache-Control": "no-store" }
    });
}

function validateGames(value) {
    if (!Array.isArray(value) || value.length > 100) {
        return null;
    }

    const games = [];
    const seenUrls = new Set();
    for (const entry of value) {
        if (typeof entry?.name !== "string" || typeof entry?.url !== "string") {
            return null;
        }

        const name = entry.name.trim();
        const rawUrl = entry.url.trim();
        if (!name || name.length > 80 || rawUrl.length > 2048) {
            return null;
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(rawUrl);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
                return null;
            }
        } catch {
            return null;
        }

        if (seenUrls.has(parsedUrl.href)) {
            return null;
        }
        seenUrls.add(parsedUrl.href);
        games.push({ name, url: rawUrl });
    }
    return games;
}

export default async function handleGames(request) {
    if (request.method === "GET") {
        try {
            const games = await store.get("catalog", { type: "json", consistency: "strong" });
            return jsonResponse(200, { games: Array.isArray(games) ? games : DEFAULT_GAMES });
        } catch {
            return jsonResponse(503, { message: "Game catalog is unavailable." });
        }
    }

    if (request.method !== "POST") {
        return jsonResponse(405, { message: "Method not allowed." });
    }
    if (!hasValidSession(request, "admin_session")) {
        return jsonResponse(401, { message: "Admin login required." });
    }
    if ((request.headers.get("content-type") || "").split(";")[0] !== "application/json") {
        return jsonResponse(415, { message: "Expected JSON." });
    }
    if (Number(request.headers.get("content-length") || 0) > 32_768) {
        return jsonResponse(413, { message: "Game list is too large." });
    }

    let body;
    try {
        const text = await request.text();
        if (text.length > 32_768) {
            return jsonResponse(413, { message: "Game list is too large." });
        }
        body = JSON.parse(text);
    } catch {
        return jsonResponse(400, { message: "Invalid game list." });
    }

    const games = validateGames(body);
    if (!games) {
        return jsonResponse(400, { message: "Game list contains invalid entries." });
    }

    try {
        await store.setJSON("catalog", games);
        return jsonResponse(200, { games });
    } catch {
        return jsonResponse(503, { message: "Could not save the shared game list." });
    }
}
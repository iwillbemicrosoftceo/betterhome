import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const attemptsByAddress = new Map();
const sessionDurationSeconds = 60 * 60;

function jsonResponse(status, message) {
    return Response.json({ message }, {
        status,
        headers: { "Cache-Control": "no-store" }
    });
}

function isRateLimited(request) {
    const now = Date.now();
    for (const [address, attempt] of attemptsByAddress) {
        if (attempt.resetAt <= now) {
            attemptsByAddress.delete(address);
        }
    }

    const address = request.headers.get("x-nf-client-connection-ip") || "unknown";
    const attempt = attemptsByAddress.get(address);
    if (!attempt) {
        attemptsByAddress.set(address, { count: 1, resetAt: now + 15 * 60 * 1000 });
        return false;
    }
    attempt.count += 1;
    return attempt.count > 10;
}

export function createLoginHandler(passwordEnvironmentVariable, cookieName) {
    return async function handleLogin(request) {
        if (request.method !== "POST") {
            return jsonResponse(405, "Method not allowed");
        }
        if ((request.headers.get("content-type") || "").split(";")[0] !== "application/json") {
            return jsonResponse(415, "Expected JSON");
        }
        if (Number(request.headers.get("content-length") || 0) > 4096) {
            return jsonResponse(413, "Request too large");
        }
        if (isRateLimited(request)) {
            return jsonResponse(429, "Too many attempts");
        }

        const expectedPassword = process.env[passwordEnvironmentVariable];
        const sessionSecret = process.env.SESSION_SECRET;
        if (!expectedPassword || !sessionSecret || sessionSecret.length < 32) {
            return jsonResponse(503, "Authentication is not configured");
        }

        let body;
        try {
            const text = await request.text();
            if (text.length > 4096) {
                return jsonResponse(413, "Request too large");
            }
            body = JSON.parse(text);
        } catch {
            return jsonResponse(400, "Invalid request");
        }

        const suppliedPassword = typeof body?.password === "string" && body.password.length <= 256
            ? body.password
            : "";
        const suppliedHash = createHash("sha256").update(suppliedPassword).digest();
        const expectedHash = createHash("sha256").update(expectedPassword).digest();
        if (!timingSafeEqual(suppliedHash, expectedHash)) {
            return jsonResponse(401, "Invalid password");
        }

        const expiresAt = Date.now() + sessionDurationSeconds * 1000;
        const payload = `${expiresAt}.${randomBytes(16).toString("hex")}`;
        const signature = createHmac("sha256", sessionSecret)
            .update(`${cookieName}:${payload}`)
            .digest("base64url");
        const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
        return new Response(null, {
            status: 204,
            headers: {
                "Cache-Control": "no-store",
                "Set-Cookie": `${cookieName}=${payload}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionDurationSeconds}${secure}`
            }
        });
    };
}

export function hasValidSession(request, cookieName) {
    const cookie = (request.headers.get("cookie") || "")
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`));
    const sessionSecret = process.env.SESSION_SECRET;
    if (!cookie || !sessionSecret || sessionSecret.length < 32) {
        return false;
    }

    const token = cookie.slice(cookieName.length + 1);
    const separator = token.lastIndexOf(".");
    if (separator < 0) {
        return false;
    }

    const payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    const expectedSignature = createHmac("sha256", sessionSecret)
        .update(`${cookieName}:${payload}`)
        .digest();
    const suppliedSignature = Buffer.from(signature, "base64url");
    if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) {
        return false;
    }

    const [expiresAt, nonce] = payload.split(".");
    return /^\d+$/.test(expiresAt) && /^[a-f0-9]{32}$/.test(nonce) && Number(expiresAt) > Date.now();
}
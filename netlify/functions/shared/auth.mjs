import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const failedAttempts = new Map();
const sessionDurationSeconds = 60 * 60;

function jsonResponse(status, message) {
    return Response.json({ message }, {
        status,
        headers: { "Cache-Control": "no-store" }
    });
}

function isRateLimited(address) {
    const now = Date.now();
    for (const [key, attempt] of failedAttempts) {
        if (attempt.resetAt <= now) {
            failedAttempts.delete(key);
        }
    }
    return (failedAttempts.get(address)?.count || 0) >= 10;
}

function recordFailure(address) {
    const now = Date.now();
    const attempt = failedAttempts.get(address);
    if (!attempt || attempt.resetAt <= now) {
        failedAttempts.set(address, { count: 1, resetAt: now + 15 * 60 * 1000 });
        return;
    }
    attempt.count += 1;
}

function cookieHeader(request, name, value, maxAge) {
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return `${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export function createLoginHandler(passwordVariable, cookieName) {
    return async function handleLogin(request) {
        if (request.method === "DELETE") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Cache-Control": "no-store",
                    "Set-Cookie": cookieHeader(request, cookieName, "", 0)
                }
            });
        }
        if (request.method !== "POST") {
            return jsonResponse(405, "Method not allowed");
        }
        if ((request.headers.get("content-type") || "").split(";")[0] !== "application/json") {
            return jsonResponse(415, "Expected JSON");
        }
        if (Number(request.headers.get("content-length") || 0) > 4096) {
            return jsonResponse(413, "Request too large");
        }

        const expectedPassword = process.env[passwordVariable];
        const sessionSecret = process.env.SESSION_SECRET;
        if (!expectedPassword || !sessionSecret || sessionSecret.length < 32) {
            return jsonResponse(503, "Authentication is not configured");
        }

        const address = request.headers.get("x-nf-client-connection-ip") || "unknown";
        if (isRateLimited(address)) {
            return jsonResponse(429, "Too many attempts");
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
            recordFailure(address);
            return jsonResponse(401, "Invalid password");
        }

        const expiresAt = Date.now() + sessionDurationSeconds * 1000;
        const payload = `${expiresAt}.${randomBytes(16).toString("hex")}`;
        const signature = createHmac("sha256", sessionSecret)
            .update(`${cookieName}:${payload}`)
            .digest("base64url");
        return new Response(null, {
            status: 204,
            headers: {
                "Cache-Control": "no-store",
                "Set-Cookie": cookieHeader(request, cookieName, `${payload}.${signature}`, sessionDurationSeconds)
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
    const receivedSignature = Buffer.from(token.slice(separator + 1), "base64url");
    const expectedSignature = createHmac("sha256", sessionSecret)
        .update(`${cookieName}:${payload}`)
        .digest();
    if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(receivedSignature, expectedSignature)) {
        return false;
    }

    const [expiresAt, nonce] = payload.split(".");
    return /^\d+$/.test(expiresAt) && /^[a-f0-9]{32}$/.test(nonce) && Number(expiresAt) > Date.now();
}
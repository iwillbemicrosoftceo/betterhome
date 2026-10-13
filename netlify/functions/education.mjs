import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasValidSession } from "./shared/auth.mjs";

export default async function serveEducation(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", {
            status: 405,
            headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" }
        });
    }
    if (!hasValidSession(request, "portal_session")) {
        return new Response("Portal sign-in required", {
            status: 401,
            headers: { "Cache-Control": "no-store" }
        });
    }

    try {
        const html = await readFile(path.join(process.cwd(), "education.html"), "utf8");
        return new Response(request.method === "HEAD" ? null : html, {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff"
            }
        });
    } catch {
        return new Response("Unable to load page", {
            status: 500,
            headers: { "Cache-Control": "no-store" }
        });
    }
}
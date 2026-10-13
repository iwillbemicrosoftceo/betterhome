const fs = require("node:fs/promises");
const path = require("node:path");

async function build() {
    const outputDirectory = path.join(__dirname, "dist");
    await fs.rm(outputDirectory, { recursive: true, force: true });
    await fs.mkdir(outputDirectory, { recursive: true });

    for (const file of ["index.html", "script.js", "style.css"]) {
        await fs.copyFile(path.join(__dirname, file), path.join(outputDirectory, file));
    }
}

build().catch((error) => {
    console.error("Build failed:", error.message);
    process.exitCode = 1;
});
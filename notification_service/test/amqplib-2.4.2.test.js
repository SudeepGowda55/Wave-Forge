const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const serviceDir = path.join(__dirname, "..");

function readJson(name) {
    return JSON.parse(fs.readFileSync(path.join(serviceDir, name), "utf8"));
}

function versionParts(version) {
    return version.split(".").map(part => Number.parseInt(part, 10));
}

function isAtLeast(version, minimum) {
    const actual = versionParts(version);
    const required = versionParts(minimum);
    for (let index = 0; index < required.length; index += 1) {
        if (actual[index] > required[index]) return true;
        if (actual[index] < required[index]) return false;
    }
    return true;
}

test("notification service pins the amqplib release with the frame-buffer security fix", () => {
    const packageJson = readJson("package.json");
    const packageLock = readJson("package-lock.json");
    const locked = packageLock.packages["node_modules/amqplib"];

    assert.ok(packageJson.dependencies.amqplib, "amqplib must remain a direct dependency");
    assert.ok(locked, "amqplib must be present in the lockfile");
    assert.ok(
        isAtLeast(locked.version, "2.4.2"),
        `amqplib ${locked.version} is older than 2.4.2, which fixes GHSA-87x3-r7m4-7rm7`
    );
    assert.match(locked.resolved, /amqplib-2\.4\.2\.tgz$/);
    assert.equal(
        packageLock.packages[""].dependencies.amqplib,
        packageJson.dependencies.amqplib,
        "the lockfile root dependency must match package.json"
    );
});

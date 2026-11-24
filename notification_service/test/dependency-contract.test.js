const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Read the installed package.json from disk: amqplib 2.x restricts its "exports"
// map, so the package.json subpath can no longer be imported.
function installedVersion(packageName) {
    let dir = path.dirname(require.resolve(packageName));
    while (dir !== path.dirname(dir)) {
        const candidate = path.join(dir, "package.json");
        if (fs.existsSync(candidate)) {
            const meta = JSON.parse(fs.readFileSync(candidate, "utf8"));
            if (meta.name === packageName) return meta.version;
        }
        dir = path.dirname(dir);
    }
    throw new Error(`could not locate the installed ${packageName}`);
}

function major(version) {
    return Number.parseInt(version.split(".")[0], 10);
}

test("notification service runs on the upgraded amqplib and mailgun.js majors", () => {
    const amqpVersion = installedVersion("amqplib");
    const mailgunVersion = installedVersion("mailgun.js");
    assert.ok(major(amqpVersion) >= 2, `amqplib ${amqpVersion} is older than the supported major`);
    assert.ok(major(mailgunVersion) >= 14, `mailgun.js ${mailgunVersion} is older than the supported major`);

    // amqplib 2.x keeps the promise-based connect/createChannel API used by server.js.
    const amqp = require("amqplib");
    assert.equal(typeof amqp.connect, "function");

    // mailgun.js 14.x keeps the form-data constructor and messages client used by server.js.
    const Mailgun = require("mailgun.js");
    const FormData = require("form-data");
    const client = new Mailgun(FormData).client({ username: "api", key: "test-key" });
    assert.equal(typeof client.messages.create, "function");
});

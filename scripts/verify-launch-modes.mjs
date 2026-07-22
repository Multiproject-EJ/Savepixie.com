import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const watermarkMarkers = ["DEMO MODE", "SavePixie demo"];
const demoBillingMarkers = [
  "Payments not live yet",
  "Demo pricing only. No card or payment can be entered yet.",
];
const liveBillingMarkers = [
  "Start 7-day free trial",
  "Then your local Stripe price each month until cancelled.",
];
const temporaryBuilds = [];

function readJavaScript(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return readJavaScript(path);
    }

    return path.endsWith(".js") ? [readFileSync(path, "utf8")] : [];
  });
}

function buildApp({ appMode, stripeEnabled }) {
  const outputDirectory = mkdtempSync(join(tmpdir(), `savepixie-${appMode}-`));
  temporaryBuilds.push(outputDirectory);

  const vitePath = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
  const result = spawnSync(
    process.execPath,
    [vitePath, "build", "--outDir", outputDirectory, "--emptyOutDir"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        VITE_APP_MODE: appMode,
        VITE_STRIPE_ENABLED: stripeEnabled,
      },
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [`${appMode} build failed.`, result.stdout, result.stderr].filter(Boolean).join("\n")
    );
  }

  return readJavaScript(outputDirectory).join("\n");
}

function assertIncludes(bundle, marker, buildName) {
  if (!bundle.includes(marker)) {
    throw new Error(`${buildName} build is missing expected marker: ${marker}`);
  }
}

function assertExcludes(bundle, marker, buildName) {
  if (bundle.includes(marker)) {
    throw new Error(`${buildName} build unexpectedly contains marker: ${marker}`);
  }
}

try {
  const demoBundle = buildApp({ appMode: "demo", stripeEnabled: "false" });
  const liveBundle = buildApp({ appMode: "live", stripeEnabled: "true" });

  for (const marker of watermarkMarkers) {
    assertIncludes(demoBundle, marker, "Demo");
    assertExcludes(liveBundle, marker, "Live");
  }

  for (const marker of demoBillingMarkers) {
    assertIncludes(demoBundle, marker, "Demo");
    assertExcludes(liveBundle, marker, "Live");
  }

  for (const marker of liveBillingMarkers) {
    assertIncludes(liveBundle, marker, "Live");
  }

  console.log("Launch modes verified: demo is visibly marked and payments stay fail-safe.");
} finally {
  for (const directory of temporaryBuilds) {
    rmSync(directory, { force: true, recursive: true });
  }
}

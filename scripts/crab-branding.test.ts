import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import { describe, expect, it } from "vite-plus/test";

const repositoryRoot = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  "..",
);
const textExtensions = new Set([".astro", ".html", ".md", ".mdc", ".ts", ".tsx"]);
const publicRoots = [
  "apps/desktop/src",
  "apps/marketing/src",
  "apps/mobile/src",
  "apps/server/src",
  "apps/web/src",
  "docs",
] as const;

async function textFiles(path: string): Promise<string[]> {
  const absolutePath = NodePath.resolve(repositoryRoot, path);
  const entry = await NodeFSP.stat(absolutePath);
  if (entry.isFile()) return [absolutePath];

  const children = await NodeFSP.readdir(absolutePath, { withFileTypes: true });
  const nested = await Promise.all(
    children.map((child) => textFiles(NodePath.join(path, child.name))),
  );
  return nested.flat();
}

function isProductionTextFile(path: string): boolean {
  if (!textExtensions.has(NodePath.extname(path))) return false;
  // This file is an attributed archive of upstream testimonials. Rewriting quotes would be false.
  if (path.endsWith("apps/marketing/src/lib/tweets.ts")) return false;
  return !/\.(?:spec|test)\.[^.]+$/u.test(path) && !path.includes("/__snapshots__/");
}

describe("Crab fork branding", () => {
  it("keeps the public product name off the upstream brand", async () => {
    const files = (await Promise.all(publicRoots.map(textFiles)))
      .flat()
      .filter(isProductionTextFile);
    const regressions: string[] = [];

    for (const path of files) {
      let contents = await NodeFSP.readFile(path, "utf8");
      if (path.endsWith("apps/desktop/src/app/DesktopEnvironment.ts")) {
        contents = contents.replace('"T3 Code (Dev)"', "").replace('"T3 Code (Alpha)"', "");
      }
      if (path.endsWith("apps/marketing/src/layouts/Layout.astro")) {
        contents = contents.replace("Forked from T3 Code", "");
      }
      if (contents.includes("T3 Code")) {
        regressions.push(NodePath.relative(repositoryRoot, path));
      }
    }

    expect(regressions).toEqual([]);
  });

  it("pins Crab across entry points and icons", async () => {
    const files = [
      "AGENTS.md",
      "README.md",
      "apps/desktop/package.json",
      "apps/mobile/app.config.ts",
      "apps/web/index.html",
      "apps/web/public/manifest.webmanifest",
      "apps/web/src/branding.ts",
    ];
    for (const path of files) {
      expect(await NodeFSP.readFile(NodePath.resolve(repositoryRoot, path), "utf8")).toContain(
        "Crab",
      );
    }

    for (const path of [
      "assets/dev/crab-dev-ios-1024.png",
      "assets/nightly/crab-nightly-ios-1024.png",
      "assets/prod/crab-ios-1024.png",
      "apps/web/public/apple-touch-icon.png",
      "apps/marketing/public/icon.png",
    ]) {
      await expect(NodeFSP.access(NodePath.resolve(repositoryRoot, path))).resolves.toBeUndefined();
    }
  });

  it("preserves compatibility contracts and the pre-fork state migration", async () => {
    const mobileConfig = await NodeFSP.readFile(
      NodePath.resolve(repositoryRoot, "apps/mobile/app.config.ts"),
      "utf8",
    );
    const desktopEnvironment = await NodeFSP.readFile(
      NodePath.resolve(repositoryRoot, "apps/desktop/src/app/DesktopEnvironment.ts"),
      "utf8",
    );

    expect(mobileConfig).toContain('scheme: "t3code"');
    expect(mobileConfig).toContain('iosBundleIdentifier: "com.t3tools.t3code"');
    expect(desktopEnvironment).toContain('"T3 Code (Alpha)"');
    expect(desktopEnvironment).toContain('const APP_BASE_NAME = "Crab"');
  });
});

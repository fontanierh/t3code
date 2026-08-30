#!/usr/bin/env node

import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import sharp from "sharp";

import { BRAND_ASSET_PATHS, DEVELOPMENT_PUBLIC_ICON_OVERRIDES } from "./lib/brand-assets.ts";
import { encodePngIco, WINDOWS_ICON_SIZES } from "./lib/icon-export.ts";

const repositoryRoot = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  "..",
);

interface Variant {
  readonly label: string;
  readonly source: string;
  readonly outputs: {
    readonly ios: string;
    readonly macos: string;
    readonly universal: string;
    readonly appleTouch: string;
    readonly favicon16: string;
    readonly favicon32: string;
    readonly faviconIco: string;
    readonly windowsIco: string;
  };
}

const variants = [
  {
    label: "development",
    source: BRAND_ASSET_PATHS.developmentLogoSvg,
    outputs: {
      ios: BRAND_ASSET_PATHS.developmentIosIconPng,
      macos: BRAND_ASSET_PATHS.developmentDesktopIconPng,
      universal: BRAND_ASSET_PATHS.developmentUniversalIconPng,
      appleTouch: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
      favicon16: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
      favicon32: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
      faviconIco: BRAND_ASSET_PATHS.developmentWebFaviconIco,
      windowsIco: BRAND_ASSET_PATHS.developmentWindowsIconIco,
    },
  },
  {
    label: "nightly",
    source: BRAND_ASSET_PATHS.nightlyLogoSvg,
    outputs: {
      ios: BRAND_ASSET_PATHS.nightlyIosIconPng,
      macos: BRAND_ASSET_PATHS.nightlyMacIconPng,
      universal: BRAND_ASSET_PATHS.nightlyLinuxIconPng,
      appleTouch: BRAND_ASSET_PATHS.nightlyWebAppleTouchIconPng,
      favicon16: BRAND_ASSET_PATHS.nightlyWebFavicon16Png,
      favicon32: BRAND_ASSET_PATHS.nightlyWebFavicon32Png,
      faviconIco: BRAND_ASSET_PATHS.nightlyWebFaviconIco,
      windowsIco: BRAND_ASSET_PATHS.nightlyWindowsIconIco,
    },
  },
  {
    label: "production",
    source: BRAND_ASSET_PATHS.productionLogoSvg,
    outputs: {
      ios: BRAND_ASSET_PATHS.productionIosIconPng,
      macos: BRAND_ASSET_PATHS.productionMacIconPng,
      universal: BRAND_ASSET_PATHS.productionLinuxIconPng,
      appleTouch: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
      favicon16: BRAND_ASSET_PATHS.productionWebFavicon16Png,
      favicon32: BRAND_ASSET_PATHS.productionWebFavicon32Png,
      faviconIco: BRAND_ASSET_PATHS.productionWebFaviconIco,
      windowsIco: BRAND_ASSET_PATHS.productionWindowsIconIco,
    },
  },
] as const satisfies ReadonlyArray<Variant>;

async function renderSquare(source: Buffer, size: number): Promise<Buffer> {
  return sharp(source, { density: 192 }).resize(size, size).png().toBuffer();
}

async function renderMacos(source: Buffer): Promise<Buffer> {
  const body = await renderSquare(source, 824);
  return sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: body, left: 100, top: 100 }])
    .png()
    .toBuffer();
}

async function renderIco(source: Buffer, sizes: ReadonlyArray<number>): Promise<Buffer> {
  const images = await Promise.all(
    sizes.map(async (size) => ({ size, contents: await renderSquare(source, size) })),
  );
  return encodePngIco(images);
}

async function renderVariant(variant: Variant): Promise<Map<string, Buffer>> {
  const source = await NodeFSP.readFile(NodePath.resolve(repositoryRoot, variant.source));
  const [ios, macos, universal, appleTouch, favicon16, favicon32, faviconIco, windowsIco] =
    await Promise.all([
      renderSquare(source, 1024),
      renderMacos(source),
      renderSquare(source, 1024),
      renderSquare(source, 180),
      renderSquare(source, 16),
      renderSquare(source, 32),
      renderIco(source, [16, 32]),
      renderIco(source, WINDOWS_ICON_SIZES),
    ]);

  return new Map([
    [variant.outputs.ios, ios],
    [variant.outputs.macos, macos],
    [variant.outputs.universal, universal],
    [variant.outputs.appleTouch, appleTouch],
    [variant.outputs.favicon16, favicon16],
    [variant.outputs.favicon32, favicon32],
    [variant.outputs.faviconIco, faviconIco],
    [variant.outputs.windowsIco, windowsIco],
  ]);
}

async function renderAndroidMarks(): Promise<Map<string, Buffer>> {
  const mark = await NodeFSP.readFile(
    NodePath.resolve(repositoryRoot, BRAND_ASSET_PATHS.crabMarkSvg),
  );
  const foreground = await sharp({
    create: {
      width: 432,
      height: 432,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: await sharp(mark).resize(224, 224).png().toBuffer(), left: 104, top: 104 },
    ])
    .png()
    .toBuffer();
  const monochrome = await sharp(mark).resize(432, 432).tint("#FFFFFF").png().toBuffer();
  const notification = await sharp(mark).resize(96, 96).tint("#FFFFFF").png().toBuffer();

  return new Map([
    [BRAND_ASSET_PATHS.androidAdaptiveForegroundPng, foreground],
    [BRAND_ASSET_PATHS.androidMonochromeIconPng, monochrome],
    [BRAND_ASSET_PATHS.androidNotificationIconPng, notification],
  ]);
}

async function expectedAssets(): Promise<Map<string, Buffer>> {
  const generated = new Map<string, Buffer>();
  for (const variant of variants) {
    console.log(`Rendering ${variant.label} from ${variant.source}...`);
    for (const [path, contents] of await renderVariant(variant)) {
      generated.set(path, contents);
    }
  }
  for (const [path, contents] of await renderAndroidMarks()) {
    generated.set(path, contents);
  }
  for (const override of DEVELOPMENT_PUBLIC_ICON_OVERRIDES) {
    const source = generated.get(override.sourceRelativePath);
    if (!source) throw new Error(`Missing generated source ${override.sourceRelativePath}.`);
    generated.set(override.targetRelativePath, source);
  }
  const marketingAssets = [
    [BRAND_ASSET_PATHS.marketingIconPng, BRAND_ASSET_PATHS.productionLinuxIconPng],
    [BRAND_ASSET_PATHS.marketingFaviconIco, BRAND_ASSET_PATHS.productionWebFaviconIco],
    [BRAND_ASSET_PATHS.marketingFavicon16Png, BRAND_ASSET_PATHS.productionWebFavicon16Png],
    [BRAND_ASSET_PATHS.marketingFavicon32Png, BRAND_ASSET_PATHS.productionWebFavicon32Png],
    [
      BRAND_ASSET_PATHS.marketingAppleTouchIconPng,
      BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
    ],
  ] as const;
  for (const [target, sourcePath] of marketingAssets) {
    const source = generated.get(sourcePath);
    if (!source) throw new Error(`Missing generated source ${sourcePath}.`);
    generated.set(target, source);
  }
  for (const [target, sourcePath] of [
    [BRAND_ASSET_PATHS.marketingIconWebp, BRAND_ASSET_PATHS.marketingIconPng],
    [BRAND_ASSET_PATHS.marketingFavicon16Webp, BRAND_ASSET_PATHS.marketingFavicon16Png],
    [BRAND_ASSET_PATHS.marketingFavicon32Webp, BRAND_ASSET_PATHS.marketingFavicon32Png],
    [BRAND_ASSET_PATHS.marketingAppleTouchIconWebp, BRAND_ASSET_PATHS.marketingAppleTouchIconPng],
  ] as const) {
    const source = generated.get(sourcePath);
    if (!source) throw new Error(`Missing generated source ${sourcePath}.`);
    generated.set(target, await sharp(source).webp({ quality: 92 }).toBuffer());
  }
  return generated;
}

async function isCurrent(relativePath: string, expected: Buffer): Promise<boolean> {
  try {
    return (await NodeFSP.readFile(NodePath.resolve(repositoryRoot, relativePath))).equals(
      expected,
    );
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw cause;
  }
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes("--check");
  const generated = await expectedAssets();
  const stale: string[] = [];

  for (const [relativePath, contents] of generated) {
    if (checkOnly) {
      if (!(await isCurrent(relativePath, contents))) stale.push(relativePath);
      continue;
    }
    const destination = NodePath.resolve(repositoryRoot, relativePath);
    await NodeFSP.mkdir(NodePath.dirname(destination), { recursive: true });
    await NodeFSP.writeFile(destination, contents);
  }

  if (stale.length > 0) {
    throw new Error(
      `Generated Crab icon assets are stale:\n${stale.map((path) => `- ${path}`).join("\n")}`,
    );
  }

  console.log(checkOnly ? "Crab icon assets are current." : "Exported Crab icon assets.");
}

await main();

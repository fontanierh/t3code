export const BRAND_ASSET_PATHS = {
  crabMarkSvg: "assets/crab-mark.svg",
  developmentLogoSvg: "assets/dev/logo.svg",
  developmentIosIconPng: "assets/dev/crab-dev-ios-1024.png",
  developmentUniversalIconPng: "assets/dev/crab-dev-universal-1024.png",

  productionLogoSvg: "assets/prod/logo.svg",
  productionIosIconPng: "assets/prod/crab-ios-1024.png",
  productionMacIconPng: "assets/prod/crab-macos-1024.png",
  productionLinuxIconPng: "assets/prod/crab-universal-1024.png",
  productionWindowsIconIco: "assets/prod/crab-windows.ico",
  productionWebFaviconIco: "assets/prod/crab-web-favicon.ico",
  productionWebFavicon16Png: "assets/prod/crab-web-favicon-16x16.png",
  productionWebFavicon32Png: "assets/prod/crab-web-favicon-32x32.png",
  productionWebAppleTouchIconPng: "assets/prod/crab-web-apple-touch-180.png",

  nightlyLogoSvg: "assets/nightly/logo.svg",
  nightlyIosIconPng: "assets/nightly/crab-nightly-ios-1024.png",
  nightlyMacIconPng: "assets/nightly/crab-nightly-macos-1024.png",
  nightlyLinuxIconPng: "assets/nightly/crab-nightly-universal-1024.png",
  nightlyWindowsIconIco: "assets/nightly/crab-nightly-windows.ico",
  nightlyWebFaviconIco: "assets/nightly/crab-nightly-web-favicon.ico",
  nightlyWebFavicon16Png: "assets/nightly/crab-nightly-web-favicon-16x16.png",
  nightlyWebFavicon32Png: "assets/nightly/crab-nightly-web-favicon-32x32.png",
  nightlyWebAppleTouchIconPng: "assets/nightly/crab-nightly-web-apple-touch-180.png",

  developmentDesktopIconPng: "assets/dev/crab-dev-macos-1024.png",
  developmentWindowsIconIco: "assets/dev/crab-dev-windows.ico",
  developmentWebFaviconIco: "assets/dev/crab-dev-web-favicon.ico",
  developmentWebFavicon16Png: "assets/dev/crab-dev-web-favicon-16x16.png",
  developmentWebFavicon32Png: "assets/dev/crab-dev-web-favicon-32x32.png",
  developmentWebAppleTouchIconPng: "assets/dev/crab-dev-web-apple-touch-180.png",

  androidAdaptiveForegroundPng: "apps/mobile/assets/android-icon-foreground.png",
  androidMonochromeIconPng: "apps/mobile/assets/android-icon-mark.png",
  androidNotificationIconPng: "apps/mobile/assets/android-notification-icon.png",

  marketingIconPng: "apps/marketing/public/icon.png",
  marketingIconWebp: "apps/marketing/public/icon.webp",
  marketingFaviconIco: "apps/marketing/public/favicon.ico",
  marketingFavicon16Png: "apps/marketing/public/favicon-16x16.png",
  marketingFavicon16Webp: "apps/marketing/public/favicon-16x16.webp",
  marketingFavicon32Png: "apps/marketing/public/favicon-32x32.png",
  marketingFavicon32Webp: "apps/marketing/public/favicon-32x32.webp",
  marketingAppleTouchIconPng: "apps/marketing/public/apple-touch-icon.png",
  marketingAppleTouchIconWebp: "apps/marketing/public/apple-touch-icon.webp",
} as const;

export type WebAssetBrand = "development" | "nightly" | "production";

export const WEB_ASSET_CHANNELS = ["latest", "nightly"] as const;

export type WebAssetChannel = (typeof WEB_ASSET_CHANNELS)[number];

export function resolveWebAssetBrandForChannel(channel: WebAssetChannel): WebAssetBrand {
  return channel === "nightly" ? "nightly" : "production";
}

export function resolveWebAssetBrandForPackageVersion(version: string): WebAssetBrand {
  return version.includes("-nightly.") ? "nightly" : "production";
}

export interface IconOverride {
  readonly sourceRelativePath: string;
  readonly targetRelativePath: string;
}

const WEB_ICON_TARGET_FILENAMES = {
  faviconIco: "favicon.ico",
  favicon16Png: "favicon-16x16.png",
  favicon32Png: "favicon-32x32.png",
  appleTouchIconPng: "apple-touch-icon.png",
} as const;

const WEB_ICON_SOURCE_PATHS_BY_BRAND = {
  development: {
    faviconIco: BRAND_ASSET_PATHS.developmentWebFaviconIco,
    favicon16Png: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
    favicon32Png: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
    appleTouchIconPng: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
  },
  nightly: {
    faviconIco: BRAND_ASSET_PATHS.nightlyWebFaviconIco,
    favicon16Png: BRAND_ASSET_PATHS.nightlyWebFavicon16Png,
    favicon32Png: BRAND_ASSET_PATHS.nightlyWebFavicon32Png,
    appleTouchIconPng: BRAND_ASSET_PATHS.nightlyWebAppleTouchIconPng,
  },
  production: {
    faviconIco: BRAND_ASSET_PATHS.productionWebFaviconIco,
    favicon16Png: BRAND_ASSET_PATHS.productionWebFavicon16Png,
    favicon32Png: BRAND_ASSET_PATHS.productionWebFavicon32Png,
    appleTouchIconPng: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
  },
} as const satisfies Record<WebAssetBrand, Record<keyof typeof WEB_ICON_TARGET_FILENAMES, string>>;

export function resolveWebIconOverrides(
  brand: WebAssetBrand,
  targetDirectory: string,
): ReadonlyArray<IconOverride> {
  const sourcePaths = WEB_ICON_SOURCE_PATHS_BY_BRAND[brand];
  return [
    {
      sourceRelativePath: sourcePaths.faviconIco,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.faviconIco}`,
    },
    {
      sourceRelativePath: sourcePaths.favicon16Png,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.favicon16Png}`,
    },
    {
      sourceRelativePath: sourcePaths.favicon32Png,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.favicon32Png}`,
    },
    {
      sourceRelativePath: sourcePaths.appleTouchIconPng,
      targetRelativePath: `${targetDirectory}/${WEB_ICON_TARGET_FILENAMES.appleTouchIconPng}`,
    },
  ];
}

export const DEVELOPMENT_ICON_OVERRIDES = resolveWebIconOverrides("development", "dist/client");

export const DEVELOPMENT_PUBLIC_ICON_OVERRIDES = resolveWebIconOverrides(
  "development",
  "apps/web/public",
);

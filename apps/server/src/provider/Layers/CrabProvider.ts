import { type CrabSettings, type ServerProviderModel } from "@t3tools/contracts";
import { createModelCapabilities } from "@t3tools/shared/model";
import { resolveSpawnCommand } from "@t3tools/shared/shell";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import {
  buildServerProvider,
  isCommandMissingCause,
  spawnAndCollect,
  type ServerProviderDraft,
} from "../providerSnapshot.ts";

const PRESENTATION = {
  displayName: "Crab",
  badgeLabel: "Early Access",
  showInteractionModeToggle: false,
  requiresNewThreadForModelChange: true,
} as const;

const MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: "crab-agent",
    name: "Crab Agent",
    isCustom: false,
    capabilities: createModelCapabilities({ optionDescriptors: [] }),
  },
];

const buildSnapshot = (
  settings: CrabSettings,
  checkedAt: string,
  probe: Parameters<typeof buildServerProvider>[0]["probe"],
): ServerProviderDraft =>
  buildServerProvider({
    presentation: PRESENTATION,
    enabled: settings.enabled,
    checkedAt,
    models: MODELS,
    probe,
  });

export const buildInitialCrabProviderSnapshot = Effect.fn("buildInitialCrabProviderSnapshot")(
  function* (settings: CrabSettings) {
    const checkedAt = DateTime.formatIso(yield* DateTime.now);
    if (!settings.enabled) {
      return buildSnapshot(settings, checkedAt, {
        installed: false,
        version: null,
        status: "warning",
        auth: { status: "unknown" },
        message: "Crab is disabled in Crab settings.",
      });
    }
    return buildSnapshot(settings, checkedAt, {
      installed: true,
      version: null,
      status: "warning",
      auth: { status: "unknown" },
      message: "Checking the Crab ACP facade...",
    });
  },
);

const runHelpProbe = (settings: CrabSettings, environment: NodeJS.ProcessEnv) =>
  Effect.gen(function* () {
    const command = settings.binaryPath || "crab-v2-acp-channel";
    const resolved = yield* resolveSpawnCommand(command, ["--help"], { env: environment });
    return yield* spawnAndCollect(
      command,
      ChildProcess.make(resolved.command, resolved.args, {
        env: environment,
        shell: resolved.shell,
      }),
    );
  });

export const checkCrabProviderStatus = Effect.fn("checkCrabProviderStatus")(function* (
  settings: CrabSettings,
  environment: NodeJS.ProcessEnv = process.env,
): Effect.fn.Return<ServerProviderDraft, never, ChildProcessSpawner.ChildProcessSpawner> {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  if (!settings.enabled) return yield* buildInitialCrabProviderSnapshot(settings);

  const result = yield* runHelpProbe(settings, environment).pipe(
    Effect.timeoutOption("4 seconds"),
    Effect.result,
  );
  if (Result.isFailure(result)) {
    return buildSnapshot(settings, checkedAt, {
      installed: !isCommandMissingCause(result.failure),
      version: null,
      status: "error",
      auth: { status: "unknown" },
      message: isCommandMissingCause(result.failure)
        ? "Crab ACP facade is not installed or not on PATH."
        : "Failed to execute the Crab ACP facade health check.",
    });
  }
  if (Option.isNone(result.success)) {
    return buildSnapshot(settings, checkedAt, {
      installed: true,
      version: null,
      status: "error",
      auth: { status: "unknown" },
      message: "Crab ACP facade timed out while running `--help`.",
    });
  }
  if (result.success.value.code !== 0) {
    return buildSnapshot(settings, checkedAt, {
      installed: true,
      version: null,
      status: "error",
      auth: { status: "unknown" },
      message: "Crab ACP facade is installed but its health check failed.",
    });
  }

  const missing = [
    ...(settings.stateDirectory ? [] : ["state directory"]),
    ...(settings.agentId ? [] : ["agent ID"]),
  ];
  return buildSnapshot(settings, checkedAt, {
    installed: true,
    version: null,
    status: missing.length === 0 ? "ready" : "warning",
    auth: { status: "unknown" },
    message:
      missing.length === 0
        ? "Crab ACP facade is ready; channel authentication is checked on connection."
        : `Crab needs a ${missing.join(" and ")} before it can open a channel.`,
  });
});

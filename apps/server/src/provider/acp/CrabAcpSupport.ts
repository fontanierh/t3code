import type { CrabSettings } from "@t3tools/contracts";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";
import type * as EffectAcpErrors from "effect-acp/errors";

import * as AcpSessionRuntime from "./AcpSessionRuntime.ts";

const CRAB_AUTH_METHOD_ID = "crab-local";

type CrabAcpRuntimeSettings = Pick<
  CrabSettings,
  "adapterId" | "agentId" | "binaryPath" | "bootstrapFile" | "stateDirectory"
>;

export interface CrabAcpRuntimeInput extends Omit<
  AcpSessionRuntime.AcpSessionRuntimeOptions,
  "authMethodId" | "clientCapabilities" | "promptConcurrency" | "spawn"
> {
  readonly childProcessSpawner: ChildProcessSpawner.ChildProcessSpawner["Service"];
  readonly crabSettings: CrabAcpRuntimeSettings;
  readonly environment?: NodeJS.ProcessEnv;
}

export function buildCrabAcpSpawnInput(
  settings: CrabAcpRuntimeSettings,
  cwd: string,
  environment?: NodeJS.ProcessEnv,
): AcpSessionRuntime.AcpSpawnInput {
  return {
    command: settings.binaryPath || "crab-v2-acp-channel",
    args: [
      "--state-dir",
      settings.stateDirectory,
      "--agent",
      settings.agentId,
      "--adapter",
      settings.adapterId || "t3code",
      ...(settings.bootstrapFile ? ["--bootstrap-file", settings.bootstrapFile] : []),
    ],
    cwd,
    ...(environment ? { env: environment } : {}),
  };
}

export const makeCrabAcpRuntime = (
  input: CrabAcpRuntimeInput,
): Effect.Effect<
  AcpSessionRuntime.AcpSessionRuntime["Service"],
  EffectAcpErrors.AcpError,
  Crypto.Crypto | Scope.Scope
> =>
  Effect.gen(function* () {
    const acpContext = yield* Layer.build(
      AcpSessionRuntime.layer({
        ...input,
        spawn: buildCrabAcpSpawnInput(input.crabSettings, input.cwd, input.environment),
        authMethodId: CRAB_AUTH_METHOD_ID,
        promptConcurrency: "concurrent",
      }).pipe(
        Layer.provide(
          Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, input.childProcessSpawner),
        ),
      ),
    );
    return yield* Effect.service(AcpSessionRuntime.AcpSessionRuntime).pipe(
      Effect.provide(acpContext),
    );
  });

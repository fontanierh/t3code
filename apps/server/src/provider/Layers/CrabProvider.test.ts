import * as NodeServices from "@effect/platform-node/NodeServices";
import { CrabSettings } from "@t3tools/contracts";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { buildInitialCrabProviderSnapshot, checkCrabProviderStatus } from "./CrabProvider.ts";

const decodeSettings = Schema.decodeSync(CrabSettings);

describe("buildInitialCrabProviderSnapshot", () => {
  it.effect("is opt-in and advertises one harness-owned agent selection", () =>
    Effect.gen(function* () {
      const snapshot = yield* buildInitialCrabProviderSnapshot(decodeSettings({}));
      expect(snapshot.status).toBe("disabled");
      expect(snapshot.models.map((model) => model.slug)).toEqual(["crab-agent"]);
    }),
  );
});

it.layer(NodeServices.layer)("checkCrabProviderStatus", (it) => {
  it.effect("requires the durable state and agent identity after finding the facade", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fileSystem.makeTempDirectoryScoped({ prefix: "crab-provider-" });
        const binaryPath = path.join(directory, "crab-v2-acp-channel");
        yield* fileSystem.writeFileString(binaryPath, "#!/bin/sh\nexit 0\n");
        yield* fileSystem.chmod(binaryPath, 0o755);

        const incomplete = yield* checkCrabProviderStatus(
          decodeSettings({ enabled: true, binaryPath }),
        );
        expect(incomplete.status).toBe("warning");
        expect(incomplete.message).toContain("state directory");

        const ready = yield* checkCrabProviderStatus(
          decodeSettings({
            enabled: true,
            binaryPath,
            stateDirectory: "/srv/crab/state",
            agentId: "jim",
          }),
        );
        expect(ready.status).toBe("ready");
        expect(ready.installed).toBe(true);
      }),
    ),
  );

  it.effect("reports a missing facade without inventing auth state", () =>
    Effect.gen(function* () {
      const snapshot = yield* checkCrabProviderStatus(
        decodeSettings({
          enabled: true,
          binaryPath: "/definitely/not/installed/crab-v2-acp-channel",
          stateDirectory: "/srv/crab/state",
          agentId: "jim",
        }),
      );
      expect(snapshot.status).toBe("error");
      expect(snapshot.installed).toBe(false);
      expect(snapshot.auth.status).toBe("unknown");
    }),
  );
});

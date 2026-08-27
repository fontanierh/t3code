// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import {
  CrabSettings,
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  ThreadId,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { describe } from "vite-plus/test";

import { ServerConfig } from "../../config.ts";
import { clearMcpProviderSession, setMcpProviderSession } from "../../mcp/McpProviderSession.ts";
import type { ProviderAdapterError } from "../Errors.ts";
import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";
import { makeCrabAdapter } from "./CrabAdapter.ts";

const __dirname = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const mockAgentPath = NodePath.join(__dirname, "../../../scripts/acp-mock-agent.ts");
const decodeCrabSettings = Schema.decodeSync(CrabSettings);

class CrabAdapter extends Context.Service<
  CrabAdapter,
  ProviderAdapterShape<ProviderAdapterError>
>()("t3/provider/Layers/CrabAdapter.test/CrabAdapter") {}

async function makeMockFacade(extraEnv?: Record<string, string>) {
  const directory = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "crab-acp-mock-"));
  const wrapperPath = NodePath.join(directory, "crab-v2-acp-channel");
  const envExports = Object.entries(extraEnv ?? {})
    .map(([key, value]) => `export ${key}=${JSON.stringify(value)}`)
    .join("\n");
  const script = `#!/bin/sh
${envExports}
exec node ${JSON.stringify(mockAgentPath)} "$@"
`;
  await NodeFSP.writeFile(wrapperPath, script, "utf8");
  await NodeFSP.chmod(wrapperPath, 0o755);
  return { directory, wrapperPath };
}

const makeAdapterLayer = (binaryPath: string) =>
  Layer.effect(
    CrabAdapter,
    makeCrabAdapter(
      decodeCrabSettings({
        binaryPath,
        stateDirectory: "/tmp/crab-v2-state",
        agentId: "jim",
        adapterId: "t3code",
      }),
    ),
  ).pipe(
    Layer.provideMerge(
      ServerConfig.layerTest(process.cwd(), { prefix: "t3code-crab-adapter-test-" }),
    ),
    Layer.provideMerge(NodeServices.layer),
  );

describe("CrabAdapter", () => {
  it.effect("streams a native channel and returns its durable resume cursor", () =>
    Effect.gen(function* () {
      const mock = yield* Effect.promise(() => makeMockFacade());
      return yield* Effect.gen(function* () {
        const adapter = yield* CrabAdapter;
        const threadId = ThreadId.make("crab-mock-thread");
        const runtimeEventsFiber = yield* Stream.take(adapter.streamEvents, 9).pipe(
          Stream.runCollect,
          Effect.forkChild,
        );

        const session = yield* adapter.startSession({
          threadId,
          provider: ProviderDriverKind.make("crab"),
          cwd: process.cwd(),
          runtimeMode: "full-access",
          modelSelection: {
            instanceId: ProviderInstanceId.make("crab"),
            model: "crab-agent",
          },
        });
        assert.deepStrictEqual(session.resumeCursor, {
          schemaVersion: 1,
          sessionId: "mock-session-1",
        });

        yield* adapter.sendTurn({ threadId, input: "hello Crab", attachments: [] });
        const eventTypes = Array.from(yield* Fiber.join(runtimeEventsFiber), (event) => event.type);
        for (const eventType of [
          "session.started",
          "session.state.changed",
          "thread.started",
          "turn.started",
          "turn.plan.updated",
          "item.started",
          "content.delta",
          "item.completed",
          "turn.completed",
        ] as const) {
          assert.include(eventTypes, eventType);
        }
        yield* adapter.stopSession(threadId);
      }).pipe(Effect.provide(makeAdapterLayer(mock.wrapperPath)), Effect.scoped);
    }),
  );

  it.effect("sends explicit queue and steer follow-ups with unique durable input ids", () =>
    Effect.gen(function* () {
      const requestLogPath = NodePath.join(
        yield* Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "crab-log-"))),
        "requests.ndjson",
      );
      const mock = yield* Effect.promise(() =>
        makeMockFacade({
          T3_ACP_HANG_FIRST_PROMPT_FOREVER: "1",
          T3_ACP_REQUEST_LOG_PATH: requestLogPath,
        }),
      );
      const threadId = ThreadId.make("crab-steering-thread");
      return yield* Effect.gen(function* () {
        const adapter = yield* CrabAdapter;
        setMcpProviderSession({
          environmentId: EnvironmentId.make("test-environment"),
          threadId,
          providerSessionId: "t3-mcp-session",
          providerInstanceId: ProviderInstanceId.make("crab"),
          endpoint: "http://127.0.0.1:3773/mcp",
          authorizationHeader: "Bearer must-not-cross-crab-attach",
        });
        yield* adapter.startSession({
          threadId,
          provider: ProviderDriverKind.make("crab"),
          cwd: process.cwd(),
          runtimeMode: "full-access",
        });

        const firstTurn = yield* adapter
          .sendTurn({ threadId, input: "keep working" })
          .pipe(Effect.forkChild({ startImmediately: true }));
        yield* Effect.yieldNow;
        const queuedResult = yield* adapter.sendTurn({
          threadId,
          input: "do this next",
          deliveryMode: "queue",
        });
        const steeringResult = yield* adapter.sendTurn({
          threadId,
          input: "steer now",
          deliveryMode: "steer",
        });
        yield* adapter.interruptTurn(threadId);
        const firstResult = yield* Fiber.join(firstTurn);
        assert.equal(queuedResult.turnId, firstResult.turnId);
        assert.equal(steeringResult.turnId, firstResult.turnId);

        const requests = (yield* Effect.promise(() => NodeFSP.readFile(requestLogPath, "utf8")))
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line) as Record<string, unknown>);
        const newSessionRequest = requests.find((request) => request.method === "session/new");
        const newSessionParams = newSessionRequest?.params as
          | { readonly mcpServers?: ReadonlyArray<unknown> }
          | undefined;
        assert.deepEqual(newSessionParams?.mcpServers, []);
        const containsCredential = (value: unknown): boolean => {
          if (typeof value === "string") {
            return value.includes("must-not-cross-crab-attach");
          }
          if (Array.isArray(value)) {
            return value.some(containsCredential);
          }
          if (typeof value === "object" && value !== null) {
            return Object.values(value).some(containsCredential);
          }
          return false;
        };
        assert.isFalse(containsCredential(newSessionRequest));
        const promptRequests = requests.filter((request) => request.method === "session/prompt");
        assert.lengthOf(promptRequests, 3);
        const inputMode = (request: Record<string, unknown> | undefined) =>
          (
            request?.params as
              | { readonly _meta?: { readonly crab?: { readonly inputMode?: unknown } } }
              | undefined
          )?._meta?.crab?.inputMode;
        assert.equal(inputMode(promptRequests[0]), "queue");
        assert.equal(inputMode(promptRequests[1]), "queue");
        assert.equal(inputMode(promptRequests[2]), "steer");
        const clientInputIds = promptRequests.map(
          (request) =>
            (
              request.params as
                | { readonly _meta?: { readonly crab?: { readonly turnId?: unknown } } }
                | undefined
            )?._meta?.crab?.turnId,
        );
        assert.lengthOf(new Set(clientInputIds), 3);
      }).pipe(
        Effect.ensuring(Effect.sync(() => clearMcpProviderSession(threadId))),
        Effect.provide(makeAdapterLayer(mock.wrapperPath)),
        Effect.scoped,
      );
    }),
  );
});

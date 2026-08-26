import { describe, expect, it } from "vite-plus/test";

import { buildCrabAcpSpawnInput } from "./CrabAcpSupport.ts";

describe("buildCrabAcpSpawnInput", () => {
  it("builds Crab's required ACP facade arguments", () => {
    expect(
      buildCrabAcpSpawnInput(
        {
          binaryPath: "crab-v2-acp-channel",
          stateDirectory: "/var/lib/crab-v2",
          agentId: "jim",
          adapterId: "t3code",
          bootstrapFile: "",
        },
        "/work/project",
      ),
    ).toEqual({
      command: "crab-v2-acp-channel",
      args: ["--state-dir", "/var/lib/crab-v2", "--agent", "jim", "--adapter", "t3code"],
      cwd: "/work/project",
    });
  });

  it("passes optional bootstrap context and the provider environment", () => {
    expect(
      buildCrabAcpSpawnInput(
        {
          binaryPath: "/opt/crab/bin/crab-channel",
          stateDirectory: "/srv/crab/state",
          agentId: "reviewer",
          adapterId: "desktop",
          bootstrapFile: "/srv/crab/bootstrap.md",
        },
        "/work/project",
        { CRAB_IPC_TOKEN_FILE: "/run/secrets/crab-ipc-token" },
      ),
    ).toEqual({
      command: "/opt/crab/bin/crab-channel",
      args: [
        "--state-dir",
        "/srv/crab/state",
        "--agent",
        "reviewer",
        "--adapter",
        "desktop",
        "--bootstrap-file",
        "/srv/crab/bootstrap.md",
      ],
      cwd: "/work/project",
      env: { CRAB_IPC_TOKEN_FILE: "/run/secrets/crab-ipc-token" },
    });
  });
});

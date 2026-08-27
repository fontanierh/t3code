# Crab

Crab is a persistent agent host. T3 Code connects to Crab's existing runtime and renders its full
native event stream; it does not launch or own the underlying agent.

## Before you connect

Install and start Crab v2 on the same environment that runs the T3 server. A standard Crab v2
deployment provides stable paths beneath the deploying user's home directory:

```text
ACP channel facade: /Users/your-name/.crab-v2/bin/crab-v2-acp-channel
Runtime state:      /Users/your-name/.crab-v2/state
```

Check the runtime without exposing its captured environment:

```bash
python3 "$HOME/.crab-v2/libexec/v2_bundle.py" status
```

## Add Crab to T3 Code

Open **Settings → Providers**, choose **Add provider instance**, then select **Crab**.

Use these values for a standard deployment:

```text
Binary path:     /Users/your-name/.crab-v2/bin/crab-v2-acp-channel
State directory: /Users/your-name/.crab-v2/state
Agent ID:        claude-opus
Adapter ID:      t3code
Bootstrap file:  empty
```

Use `codex` as the agent ID when Crab was deployed with its Codex preset. The agent ID must match an
agent in Crab's runtime configuration. The adapter ID is a stable name for this T3 integration;
keep it unchanged so existing channels can resume.

Enter absolute paths in T3 Code. Provider settings are passed directly to the process and do not
expand `~` or shell variables.

Each T3 thread attaches to one durable Crab native channel. Reopening a thread resumes that channel
through Crab instead of creating a second agent-owned session.

## If Crab is unavailable

Refresh the provider status in **Settings → Providers** and check:

- Crab v2 reports healthy with the status command above.
- **Binary path** points to the deployed facade and is executable by the T3 server.
- **State directory** contains Crab's owner-only local IPC endpoint.
- **Agent ID** exists in Crab's runtime configuration.

T3 Code never copies Crab's local IPC credential into its settings. The facade reads it directly
from the owner-only state directory when a channel connects.

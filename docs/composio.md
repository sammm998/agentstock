# Composio setup (Milestone F)

Everything is prepared; Hustera only needs credentials. Until then, Composio steps show `CONNECT_REQUIRED` and nothing pretends to work.

## 1. Configure the instance

| Variable | What to put |
| --- | --- |
| `COMPOSIO_API_KEY` | Project API key from the Composio dashboard |
| `COMPOSIO_AUTH_CONFIGS` | JSON map of toolkit slug → auth config id, e.g. `{"shopify":"ac_abc123"}`. Create one auth config per app in Composio. |
| `COMPOSIO_PUBLISH_TOOLKIT` | Toolkit used by the "Publish to your external store" mission step, e.g. `shopify` |
| `COMPOSIO_PUBLISH_TOOL` | Tool slug to call, e.g. `SHOPIFY_CREATE_PRODUCT` — check the exact slug and argument schema in Composio |

Set the connection callback URL in Composio to `https://<your-domain>/api/composio/callback`.

## 2. Verify the API paths (first run)

The client in `apps/web/src/server/composio.ts` keeps every endpoint in one `COMPOSIO.paths` object:

| Purpose | Path | Verified |
| --- | --- | --- |
| List toolkits | `GET /api/v3.1/toolkits` | Documented in Composio v3.1 reference |
| Start connection | `POST /api/v3/connected_accounts` with `{ auth_config: { id }, connection: { user_id, callback_url } }` | **Verify with a real key** |
| Read connection | `GET /api/v3/connected_accounts/{id}` (expects `status: "ACTIVE"`) | **Verify with a real key** |
| Execute tool | `POST /api/v3/tools/execute/{tool_slug}` with `{ user_id, arguments }` | **Verify with a real key** |

Then:

1. Open **Agents** — the capability inventory should show Composio as reachable and list your toolkits.
2. Open **Settings → Connections**, press **Connect** for your app and complete the hosted flow. The status should become `active`.
3. Start a mission with **"Also publish to my external store"**, approve the steps, and check the publication artifact. If the tool's argument names differ from `{ title, description, price }`, adjust `publishExternal` in `apps/web/src/server/agent-tools.ts`.
4. Update `docs/milestones.md` — move verified rows to `VERIFIED` with the date.

## Safety properties already in place

- Each Hustera user is their own Composio `user_id`; connections are stored per user and can be revoked.
- External publishing always requires an explicit approval in the mission.
- The budget engine, approvals and kill switch run before any tool call; no model decides them.
- Failures are recorded as `failed`/`blocked` tasks with the provider's message — never as success.

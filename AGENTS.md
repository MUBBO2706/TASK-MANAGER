# AI Agent Instructions

## STAGING vs PRODUCTION
- You **MUST NOT** modify database records for any Production project directly (a project whose name does NOT end with `[STAGING]`).
- If you are asked to modify a production project, you **MUST** first hit `POST /api/ai/create-staging` to create a `[STAGING]` branch.
- You **MUST** then apply all changes ONLY to the staging branch.

## Supabase Service Role Key Restriction
- You are **STRICTLY FORBIDDEN** from using the Supabase `service_role` key to execute DB queries directly from Node.js scripts or bypass API validations.
- You **MUST NOT** import or read the `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY` from environment variables, `.env`, or `.env.example` to establish a direct connection to Supabase.
- Always use the `/api/ai/*` application routes to perform modifications on behalf of the user. Never manipulate the data bypassing the API endpoints.

## Endpoints & Deprecated Routes
- **DEPRECATED / REMOVED**: `/api/push-task` is completely invalid and removed from the system. You **MUST NOT** use, reference, call, or persist any memory/tool definitions for `/api/push-task`.
- **STANDARD ENDPOINTS**: Always use the official `/api/ai/*` endpoints for all task operations:
  - `POST /api/ai/create-staging`: Create or reuse a `[STAGING]` replica branch before modifying any production project.
  - `POST /api/ai/write`: Create new tasks (SQL or Edge Functions) within a `[STAGING]` project.
  - `PUT /api/ai/write/:taskId`: Update existing tasks within a `[STAGING]` project.
  - `DELETE /api/ai/write/:taskId`: Delete tasks within a `[STAGING]` project.
  - `POST /api/ai/merge-staging`: Review diffs and merge staging changes into production.
  - `POST /api/ai/reject-staging`: Discard staging changes.

## Strict UI Button Styling Constraints
- Any **icon-only button** (buttons that contain only an icon and no text, and do not have a pre-existing explicit border or persistent solid background) **MUST NOT** have any hover background highlights (e.g., no `hover:bg-slate-100`, `hover:bg-zinc-800`, etc.).
- Instead, highlight them strictly by changing the icon's color to be darker or more distinct on hover (e.g., `text-slate-500 hover:text-slate-800` or `text-zinc-400 hover:text-zinc-100`).


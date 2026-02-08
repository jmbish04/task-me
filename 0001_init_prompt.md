This is a complex system architecture involving proprietary APIs (Stitch, Jules), specific Cloudflare constraints (Workers/Pages), and a strict "No SPA" requirement.

To get a Coding Agent (like Cursor, Windsurf, or Devin) to successfully build this, you must provide a **Product Requirement Document (PRD)** that includes the exact API schemas you provided.

Here is the comprehensive prompt. **Copy and paste the entire block below into your AI Coding Agent.**

---

### The Prompt to Copy & Paste

**Context & Role:**
You are a Principal Software Architect and AI Systems Engineer.
**Goal:** Build "Taskosaur-AI" from scratch. This is an AI-native Project Management platform where autonomous agents plan, design, and code software.

**Core Infrastructure Stack (Non-Negotiable):**

1. **Deployment:** Cloudflare Workers (Backend) + Cloudflare Pages (Frontend) using the `@cloudflare/next-on-pages` adapter. Host everything on a single worker.
2. **Framework:** Next.js (App Router).
* **CRITICAL CONSTRAINT (NO SPA):** You must strictly adhere to a **Multi-Page Application (MPA)** architecture.
* **Rule:** Do NOT use `next/link` or `useRouter` for client-side navigation. You must use standard HTML `<a>` tags and `<form action="...">` for all interactions to ensure full page reloads and edge caching stability.


3. **Database:** Supabase (Postgres).
* **Rule:** You must use the `fetch` implementation of `@supabase/supabase-js`. Do NOT use TCP-based drivers (like `pg` or Prisma) as they will fail in the Workers environment.


4. **State/Storage:** Cloudflare KV (Caching), Cloudflare R2 (Artifact Storage).
5. **AI Engine:** Cloudflare Workers AI (Llama-3 model) using the **OpenAI Agents SDK Pattern** (Tool Calling).

---

### Phase 1: The "Genesis" Engine (Project Creation)

Create a service (`lib/genesis.ts`) that accepts a natural language prompt (e.g., *"Build an Uber for Dog Walkers"*) and performs the following:

1. **GitHub Scaffolding:** Authenticate with Octokit to create a new, empty repository.
2. **The PM Agent:** Initialize a Cloudflare Workers AI agent.
* **Tooling:** The agent must have access to "Knowledge Tools" to enrich the plan. Since we cannot run local MCP servers in a Worker, create **Mock Tools** that return best-practices context:
* `tool_consult_cloudflare_docs`: Returns infra constraints (e.g., "Use R2 for storage").
* `tool_consult_shadcn`: Returns UI component names.
* `tool_consult_kibo`: Returns UI patterns.
* `tool_consult_context7`: Returns architectural context.


* **Output:** The agent generates a recursive JSON structure of **Epics > User Stories > Tasks** and inserts them into Supabase.



---

### Phase 2: The "Visualizer" (Stitch MCP Integration)

Implement a strongly-typed client (`lib/stitch.ts`) that connects to the Google Stitch MCP API.

**Configuration:**

* **Base URL:** `https://stitch.googleapis.com/mcp`
* **Headers:** `X-Goog-Api-Key: process.env.STITCH_API_KEY`

**Tools to Implement:**
You must implement the following Tool Definitions exactly as defined in this schema:

```json
[
  {
    "name": "create_project",
    "description": "Creates a Stitch project container.",
    "parameters": {
      "type": "object",
      "properties": { "title": { "type": "string" } }
    }
  },
  {
    "name": "generate_screen_from_text",
    "description": "Generates a UI screen from a prompt.",
    "parameters": {
      "type": "object",
      "properties": {
        "projectId": { "type": "string" },
        "prompt": { "type": "string" },
        "deviceType": { "type": "string", "enum": ["MOBILE", "DESKTOP", "TABLET", "AGNOSTIC"] },
        "modelId": { "type": "string", "enum": ["GEMINI_3_FLASH", "GEMINI_3_PRO"] }
      },
      "required": ["projectId", "prompt"]
    }
  },
  {
    "name": "get_screen",
    "description": "Retrieves screen details.",
    "parameters": {
      "type": "object",
      "properties": {
        "projectId": { "type": "string" },
        "screenId": { "type": "string" }
      },
      "required": ["projectId", "screenId"]
    }
  },
  {
    "name": "list_projects",
    "description": "Lists all Stitch projects.",
    "parameters": {
      "type": "object",
      "properties": { "filter": { "type": "string" } }
    }
  },
  {
    "name": "list_screens",
    "description": "Lists all screens within a project.",
    "parameters": {
      "type": "object",
      "properties": { "projectId": { "type": "string" } },
      "required": ["projectId"]
    }
  }
]

```

**The Workflow:**

1. **Trigger:** When a User Story is created, the Agent calls `stitch.generate_screen_from_text`.
2. **Storage:** The returned image URL must be proxied/saved to Cloudflare R2 (to prevent link rot) and associated with the Story in Supabase.

---

### Phase 3: The "UX Consultant" (Feedback Loop)

Create a "Design Lab" view for every User Story.

* **Layout:** A split pane. Left side: Chat Interface. Right side: Stitch Mockup Image.
* **The UX Agent:** A Cloudflare Worker AI agent with the system prompt: *"You are a UX Expert. Interpret user feedback and issue new Stitch commands to refine the design."*
* **Interaction:**
* User: *"Make the background dark mode."*
* Agent: Calls `stitch.generate_screen_from_text` with the updated requirements.
* **MPA Action:** The form submits, the page reloads, and the new image is displayed.



---

### Phase 4: The "Builder" (Jules Integration)

Implement a "Delegate to Jules" feature (`lib/jules.ts`).

* **Action:** Add a button on the Task Detail view.
* **Payload:** Construct a prompt containing:
* The **GitHub Repo URL**.
* The **Task Description**.
* The **Stitch Mockup URL** (Visual Context).


* **API:** Post this payload to the `jules.withgoogle` API (mock this endpoint if currently unavailable) to trigger an automated Pull Request.

---

### Execution Plan

Please generate the code in the following order:

1. **Configuration:**
* `wrangler.toml`: Set `compatibility_flags = ["nodejs_compat"]`. Define bindings for `KV`, `R2`, and `AI`.
* `next.config.js`: Configure for `next-on-pages`.


2. **Database:**
* Generate the Supabase SQL schema for tables: `projects`, `epics`, `stories`, `tasks`, `mockups`.


3. **Core Libraries:**
* `lib/stitch.ts`: Implement the MCP client using the schema above.
* `lib/agents/genesis.ts`: Implement the PM Agent loop.


4. **UI Implementation (MPA):**
* Build the Dashboard and Project Board using Shadcn components, ensuring strictly server-side navigation (`<a>` tags).



**Action:** Start by defining the `wrangler.jsonc` and the Supabase SQL Schema using prisma.

import { z } from "zod";
import { Octokit } from "octokit";
import { storeMockupInR2, type R2Env } from "@/lib/r2";
import { createSupabaseClientFromEnv, type SupabaseEnv } from "@/lib/supabase";
import { StitchClient, extractStitchImageUrl } from "@/lib/stitch";

type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

export type GenesisEnv = SupabaseEnv &
  R2Env & {
    AI?: AiBinding;
    STITCH_API_KEY?: string;
    GITHUB_TOKEN?: string;
    GENESIS_AI_MODEL?: string;
  };

type GenesisTask = {
  title: string;
  description?: string;
};

type GenesisStory = {
  title: string;
  description?: string;
  tasks: GenesisTask[];
};

type GenesisEpic = {
  title: string;
  description?: string;
  stories: GenesisStory[];
};

type GenesisPlan = {
  title: string;
  description?: string;
  epics: GenesisEpic[];
};

const FALLBACK_PLAN: GenesisPlan = {
  title: "Taskosaur-AI MVP",
  description: "AI-native project management foundation.",
  epics: [
    {
      title: "Project Genesis",
      description: "Bootstrap projects and plans.",
      stories: [
        {
          title: "Create a project from a prompt",
          description: "Capture a prompt and generate epics, stories, and tasks.",
          tasks: [
            { title: "Collect prompt input" },
            { title: "Persist project plan to Supabase" },
          ],
        },
      ],
    },
  ],
};

const genesisTaskSchema = z.object({
  title: z.string().min(1).catch("Task"),
  description: z.string().optional(),
});

const genesisStorySchema = z.object({
  title: z.string().min(1).catch("Story"),
  description: z.string().optional(),
  tasks: z.array(genesisTaskSchema).optional().default([]),
});

const genesisEpicSchema = z.object({
  title: z.string().min(1).catch("Epic"),
  description: z.string().optional(),
  stories: z.array(genesisStorySchema).optional().default([]),
});

const genesisPlanSchema = z.object({
  title: z.string().min(1).catch(FALLBACK_PLAN.title),
  description: z.string().optional(),
  epics: z.array(genesisEpicSchema).optional().default([]),
});

type GenesisInsertResult = {
  project: {
    id: string;
    title: string;
    description: string | null;
    repo_url: string | null;
  };
  stories: Array<{
    id: string;
    epic_id: string | null;
    title: string;
    description: string | null;
  }>;
};

// Default Cloudflare Workers AI model identifier; see https://developers.cloudflare.com/workers-ai/models/.
// Override via GENESIS_AI_MODEL for larger models or higher fidelity plans.
const DEFAULT_GENESIS_MODEL = "@cf/meta/llama-3-8b-instruct";

const KNOWLEDGE_TOOLS = [
  {
    name: "tool_consult_cloudflare_docs",
    description: "Returns infra constraints for Cloudflare Workers/Pages.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "tool_consult_shadcn",
    description: "Returns Shadcn UI component suggestions.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "tool_consult_kibo",
    description: "Returns UX patterns and flows.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "tool_consult_context7",
    description: "Returns architecture best practices.",
    parameters: { type: "object", properties: {} },
  },
] as const;

const KNOWLEDGE_TOOL_RESPONSES: Record<string, string> = {
  tool_consult_cloudflare_docs:
    "Use Cloudflare Workers/Pages with KV for caching and R2 for durable artifacts. Avoid Node TCP clients.",
  tool_consult_shadcn:
    "Suggested UI components: Card, Button, Input, Textarea, Tabs, Badge, Avatar.",
  tool_consult_kibo:
    "Patterns: dashboard overview, Kanban-style boards, split-pane design labs.",
  tool_consult_context7:
    "Architecture: MPA navigation, server-first rendering, tool-driven agents.",
};

const buildKnowledgeContext = () =>
  Object.entries(KNOWLEDGE_TOOL_RESPONSES)
    .map(([tool, response]) => `${tool}: ${response}`)
    .join("\n");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48);

const extractPlan = (raw: unknown): GenesisPlan => {
  if (!raw) {
    return FALLBACK_PLAN;
  }

  const candidate =
    typeof raw === "string"
      ? raw
      : (raw as { response?: unknown; choices?: Array<{ message?: { content?: unknown } }> })
          .response ?? raw;

  const content =
    typeof candidate === "string"
      ? candidate
      : (candidate as { choices?: Array<{ message?: { content?: unknown } }> })
          .choices?.[0]?.message?.content ?? candidate;

  const structured =
    typeof content === "string"
      ? (() => {
          try {
            return JSON.parse(content);
          } catch {
            return null;
          }
        })()
      : content;

  const parsed = genesisPlanSchema.safeParse(structured);
  if (parsed.success) {
    return parsed.data;
  }

  if (typeof content === "string") {
    return { ...FALLBACK_PLAN, description: content };
  }

  return FALLBACK_PLAN;
};

const generatePlan = async (
  prompt: string,
  ai?: AiBinding,
  model = DEFAULT_GENESIS_MODEL,
) => {
  if (!ai) {
    return FALLBACK_PLAN;
  }

  const messages = [
    {
      role: "system",
      content: `You are a PM agent. Return JSON with shape {title, description, epics:[{title, description, stories:[{title, description, tasks:[{title, description}]}]}]}\n\nKnowledge:\n${buildKnowledgeContext()}`,
    },
    { role: "user", content: prompt },
  ];

  const response = await ai.run(model, {
    messages,
    tools: KNOWLEDGE_TOOLS,
  });

  return extractPlan(response);
};

const getProjectIdFromResponse = (response: unknown, fallback: string) => {
  if (!response || typeof response !== "object") {
    return fallback;
  }
  const payload = response as Record<string, unknown>;
  return (
    (payload.projectId as string | undefined) ??
    (payload.project_id as string | undefined) ??
    (payload.id as string | undefined) ??
    fallback
  );
};

export const runGenesis = async (prompt: string, env: GenesisEnv) => {
  const model = env.GENESIS_AI_MODEL ?? DEFAULT_GENESIS_MODEL;
  const plan = await generatePlan(prompt, env.AI, model);
  const repoName = slugify(plan.title || prompt || "taskosaur-ai");

  let repoUrl: string | null = null;
  if (env.GITHUB_TOKEN) {
    const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    const repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: plan.description ?? prompt,
      private: true,
    });
    repoUrl = repoResponse.data.html_url;
  }

  const supabase = createSupabaseClientFromEnv(env);
  if (!supabase) {
    return { plan, repoUrl };
  }

  const { data: genesisResult, error: genesisError } = await supabase.rpc(
    "run_genesis_plan",
    {
      plan,
      repo_url: repoUrl,
      prompt,
    },
  );

  if (genesisError || !genesisResult) {
    throw genesisError ?? new Error("Failed to create project");
  }

  const typedResult = genesisResult as GenesisInsertResult;
  if (!typedResult.project) {
    throw new Error("Genesis transaction did not return a project");
  }

  const project = typedResult.project;
  const stories = typedResult.stories ?? [];

  const stitch =
    env.STITCH_API_KEY &&
    new StitchClient({
      apiKey: env.STITCH_API_KEY,
    });

  const stitchProjectId = stitch
    ? getProjectIdFromResponse(
        await stitch.createProject({ title: plan.title }),
        project.id,
      )
    : project.id;

  for (const story of stories) {
    if (!stitch) {
      continue;
    }

    const stitchResponse = await stitch.generateScreenFromText({
      projectId: stitchProjectId,
      prompt: story.description ?? story.title,
      deviceType: "DESKTOP",
      modelId: "GEMINI_3_FLASH",
    });

    const imageUrl = extractStitchImageUrl(stitchResponse);
    if (imageUrl) {
      const stored = await storeMockupInR2(
        env,
        imageUrl,
        `projects/${project.id}/stories/${story.id}`,
      );

      await supabase.from("mockups").insert({
        story_id: story.id,
        source_url: imageUrl,
        r2_key: stored.key,
        r2_url: stored.publicUrl,
      });
    }
  }

  return { project, plan, repoUrl };
};

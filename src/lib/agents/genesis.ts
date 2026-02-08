import { Octokit } from "octokit";
import { storeMockupInR2, type R2Env } from "@/lib/r2";
import { createSupabaseClientFromEnv, type SupabaseEnv } from "@/lib/supabase";
import { StitchClient } from "@/lib/stitch";

type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
};

export type GenesisEnv = SupabaseEnv &
  R2Env & {
    AI?: AiBinding;
    STITCH_API_KEY?: string;
    GITHUB_TOKEN?: string;
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

  if (typeof content === "string") {
    try {
      return JSON.parse(content) as GenesisPlan;
    } catch {
      return { ...FALLBACK_PLAN, description: content };
    }
  }

  return (content as GenesisPlan) ?? FALLBACK_PLAN;
};

const generatePlan = async (prompt: string, ai?: AiBinding) => {
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

  const response = await ai.run("@cf/meta/llama-3-8b-instruct", {
    messages,
    tools: KNOWLEDGE_TOOLS,
  });

  return extractPlan(response);
};

const getImageUrlFromResponse = (response: unknown) => {
  if (!response || typeof response !== "object") {
    return null;
  }
  const candidate = response as Record<string, unknown>;
  return (
    (candidate.imageUrl as string | undefined) ??
    (candidate.image_url as string | undefined) ??
    (candidate.url as string | undefined) ??
    (candidate.screen as { imageUrl?: string } | undefined)?.imageUrl ??
    (candidate.result as { imageUrl?: string } | undefined)?.imageUrl ??
    null
  );
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
  const plan = await generatePlan(prompt, env.AI);
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

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      title: plan.title,
      description: plan.description ?? prompt,
      repo_url: repoUrl,
    })
    .select()
    .single();

  if (projectError || !project) {
    throw projectError ?? new Error("Failed to create project");
  }

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

  for (const epic of plan.epics ?? []) {
    const { data: epicRow, error: epicError } = await supabase
      .from("epics")
      .insert({
        project_id: project.id,
        title: epic.title,
        description: epic.description,
      })
      .select()
      .single();

    if (epicError || !epicRow) {
      throw epicError ?? new Error("Failed to create epic");
    }

    for (const story of epic.stories ?? []) {
      const { data: storyRow, error: storyError } = await supabase
        .from("stories")
        .insert({
          project_id: project.id,
          epic_id: epicRow.id,
          title: story.title,
          description: story.description,
          status: "draft",
        })
        .select()
        .single();

      if (storyError || !storyRow) {
        throw storyError ?? new Error("Failed to create story");
      }

      if (stitch) {
        const stitchResponse = await stitch.generateScreenFromText({
          projectId: stitchProjectId,
          prompt: story.description ?? story.title,
          deviceType: "DESKTOP",
          modelId: "GEMINI_3_FLASH",
        });

        const imageUrl = getImageUrlFromResponse(stitchResponse);
        if (imageUrl) {
          const stored = await storeMockupInR2(
            env,
            imageUrl,
            `projects/${project.id}/stories/${storyRow.id}`,
          );

          await supabase.from("mockups").insert({
            story_id: storyRow.id,
            source_url: imageUrl,
            r2_key: stored.key,
            r2_url: stored.publicUrl,
          });
        }
      }

      for (const task of story.tasks ?? []) {
        await supabase.from("tasks").insert({
          story_id: storyRow.id,
          title: task.title,
          description: task.description,
          status: "todo",
        });
      }
    }
  }

  return { project, plan, repoUrl };
};

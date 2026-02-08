import type { APIRoute } from "astro";
import { delegateToJules } from "@/lib/jules";
import { createSupabaseClientFromEnv } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async ({ params, locals }) => {
  const taskId = params.taskId;
  if (!taskId) {
    return new Response("Missing task id", { status: 400 });
  }

  const env = (locals.runtime?.env ?? import.meta.env) as Record<string, string>;
  const supabase = createSupabaseClientFromEnv(env);

  if (!supabase) {
    return new Response("Supabase not configured", { status: 500 });
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select(
      `
        id, title, description, story_id,
        story:stories (
          id, project_id,
          project:projects ( id, repo_url ),
          mockups:mockups ( r2_url, source_url, created_at )
        )
      `,
    )
    .eq("id", taskId)
    .order("created_at", { foreignTable: "story.mockups", ascending: false })
    .limit(1, { foreignTable: "story.mockups" })
    .single();

  if (taskError || !task) {
    return new Response("Task not found", { status: 404 });
  }

  if (!task.story) {
    return new Response("Story not found for task", { status: 404 });
  }

  const julesResult = await delegateToJules(
    {
      repoUrl: task.story?.project?.repo_url ?? "",
      taskDescription: task.description ?? task.title,
      mockupUrl:
        task.story?.mockups?.[0]?.r2_url ??
        task.story?.mockups?.[0]?.source_url ??
        null,
    },
    { apiUrl: env.JULES_API_URL },
  );

  if (!julesResult.ok) {
    console.error("Jules delegation failed", julesResult.status);
    const statusLabel = julesResult.status.split(":")[0] ?? "error";
    return new Response(
      `Failed to delegate task (${statusLabel}). Please try again or contact support.`,
      { status: 502 },
    );
  }

  return Response.redirect(`/tasks/${taskId}`, 303);
};

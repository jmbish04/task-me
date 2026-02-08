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
    .select("id, title, description, story_id")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return new Response("Task not found", { status: 404 });
  }

  const { data: story } = await supabase
    .from("stories")
    .select("id, project_id")
    .eq("id", task.story_id)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("id, repo_url")
    .eq("id", story?.project_id ?? "")
    .single();

  const { data: mockups } = await supabase
    .from("mockups")
    .select("r2_url, source_url")
    .eq("story_id", story?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1);

  await delegateToJules(
    {
      repoUrl: project?.repo_url ?? "",
      taskDescription: task.description ?? task.title,
      mockupUrl: mockups?.[0]?.r2_url ?? mockups?.[0]?.source_url ?? null,
    },
    { apiUrl: env.JULES_API_URL },
  );

  return Response.redirect(`/tasks/${taskId}`, 303);
};

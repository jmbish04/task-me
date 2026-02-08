import type { APIRoute } from "astro";
import { runGenesis } from "@/lib/agents/genesis";

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (!prompt) {
    return new Response("Missing prompt", { status: 400 });
  }

  const env = (locals.runtime?.env ?? import.meta.env) as Record<string, string>;
  try {
    const result = await runGenesis(prompt, env);
    const projectId = (result.project as { id?: string } | undefined)?.id;
    const redirectTo = projectId ? `/projects/${projectId}` : "/dashboard";
    return Response.redirect(redirectTo, 303);
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Genesis failed",
      { status: 500 },
    );
  }
};

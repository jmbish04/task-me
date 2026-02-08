import type { APIRoute } from "astro";
import { storeMockupInR2 } from "@/lib/r2";
import { createSupabaseClientFromEnv } from "@/lib/supabase";
import { StitchClient } from "@/lib/stitch";

export const prerender = false;

const getImageUrl = (response: unknown) => {
  if (!response || typeof response !== "object") {
    return null;
  }
  const payload = response as Record<string, unknown>;
  return (
    (payload.imageUrl as string | undefined) ??
    (payload.image_url as string | undefined) ??
    (payload.url as string | undefined) ??
    (payload.screen as { imageUrl?: string } | undefined)?.imageUrl ??
    null
  );
};

export const POST: APIRoute = async ({ request, params, locals }) => {
  const storyId = params.storyId;
  if (!storyId) {
    return new Response("Missing story id", { status: 400 });
  }

  const formData = await request.formData();
  const feedback = String(formData.get("feedback") ?? "").trim();
  if (!feedback) {
    return new Response("Missing feedback", { status: 400 });
  }

  const env = (locals.runtime?.env ?? import.meta.env) as Record<string, string>;
  const supabase = createSupabaseClientFromEnv(env);

  if (!supabase) {
    return new Response("Supabase not configured", { status: 500 });
  }

  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, title, description, project_id")
    .eq("id", storyId)
    .single();

  if (storyError || !story) {
    return new Response("Story not found", { status: 404 });
  }

  if (!env.STITCH_API_KEY) {
    return new Response("Stitch API key missing", { status: 500 });
  }

  const stitch = new StitchClient({ apiKey: env.STITCH_API_KEY });
  const stitchResponse = await stitch.generateScreenFromText({
    projectId: story.project_id,
    prompt: `${story.description ?? story.title}\n\nUser feedback: ${feedback}`,
    deviceType: "DESKTOP",
    modelId: "GEMINI_3_FLASH",
  });

  const imageUrl = getImageUrl(stitchResponse);
  if (imageUrl) {
    const stored = await storeMockupInR2(
      env,
      imageUrl,
      `projects/${story.project_id}/stories/${story.id}`,
    );

    await supabase.from("mockups").insert({
      story_id: story.id,
      source_url: imageUrl,
      r2_key: stored.key,
      r2_url: stored.publicUrl,
    });
  }

  return Response.redirect(`/stories/${storyId}/design-lab`, 303);
};

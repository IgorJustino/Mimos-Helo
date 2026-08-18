export function GET() {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";

  return Response.json(
    {
      supabaseUrl,
      supabasePublishableKey,
      configured: Boolean(supabaseUrl && supabasePublishableKey)
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

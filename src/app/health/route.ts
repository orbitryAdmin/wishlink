import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json(
      { status: "ok", database: "connected" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("Health check failed: PostgreSQL is unavailable.", error);
    return Response.json(
      { status: "unhealthy", database: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

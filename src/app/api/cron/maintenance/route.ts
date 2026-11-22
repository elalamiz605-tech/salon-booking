import config from "@config";
import { getDb } from "@/db/client";
import { runMaintenance } from "@/server/maintenance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runMaintenance(await getDb(), config, new Date());
  return Response.json(result);
}

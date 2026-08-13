import { NextResponse } from "next/server";

// Healthcheck sin auth. Lo usa el HEALTHCHECK del Dockerfile y docker-compose.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

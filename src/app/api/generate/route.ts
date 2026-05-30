import { NextRequest } from "next/server";
import { generateApp } from "@/lib/runtime/generator";
import { ok, err } from "@/lib/runtime/api-handler";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid"; // optional, can use crypto

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => null);

    if (!body) {
      return err("Request body must be valid JSON", 400);
    }

    // Generate — works even without auth (for builder preview)
    const result = generateApp(body.config ?? body);

    // If authenticated, optionally persist the app
    if (session?.user?.id && body.save) {
      const slug = result.config.app.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 48);

      const uniqueSlug = `${slug}-${Math.random().toString(36).substr(2, 6)}`;
      const dbPrefix = `app_${Math.random().toString(36).substr(2, 8)}_`;

      await prisma.app.upsert({
        where:  { slug: uniqueSlug },
        update: {
          name:   result.config.app.name,
          config: body.config ?? body,
          status: "active",
        },
        create: {
          userId:      session.user.id,
          name:        result.config.app.name,
          slug:        uniqueSlug,
          description: result.config.app.description,
          icon:        result.config.app.icon,
          config:      body.config ?? body,
          status:      "active",
          dbPrefix,
        },
      });
    }

    return ok(result);
  } catch (e) {
    console.error("[generate]", e);
    return err("Internal server error", 500, process.env.NODE_ENV === "development" ? String(e) : undefined);
  }
}

export async function GET() {
  // Return the JSON schema spec for valid AppConfig
  return ok({
    version: "1.0.0",
    description: "AppForge configuration schema",
    required: ["app"],
    properties: {
      app: {
        type: "object",
        required: ["name"],
        properties: {
          name:        { type: "string" },
          icon:        { type: "string" },
          description: { type: "string" },
          theme:       { type: "string", enum: ["light", "dark"] },
          version:     { type: "string" },
        },
      },
      auth: {
        type: "object",
        properties: {
          providers: { type: "array", items: { type: "string", enum: ["email","google","github","facebook"] } },
          roles:     { type: "array", items: { type: "string" } },
        },
      },
      database: {
        type: "object",
        properties: {
          models: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "fields"],
              properties: {
                name:   { type: "string" },
                fields: { type: "array" },
              },
            },
          },
        },
      },
    },
  });
}

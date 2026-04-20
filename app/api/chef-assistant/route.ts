import { NextResponse } from "next/server";
import { buildChefAssistantResponse } from "@/lib/chef-assistant/assistant-engine";
import type { ChefAssistantContext } from "@/lib/chef-assistant/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      message?: string;
      context?: ChefAssistantContext;
    };

    if (!payload.message?.trim() || !payload.context) {
      return NextResponse.json(
        { error: "A message and assistant context are required." },
        { status: 400 }
      );
    }

    const response = buildChefAssistantResponse(payload.message, payload.context);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Assistant request failed.",
      },
      { status: 500 }
    );
  }
}

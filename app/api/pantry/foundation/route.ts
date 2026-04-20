import { NextResponse } from "next/server";
import { seedFoundationPantry } from "@/lib/foundation-pantry";

type FoundationSeedPayload = {
  userId?: string | null;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as FoundationSeedPayload;
  const userId = payload.userId?.trim();

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  try {
    const result = await seedFoundationPantry(userId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Foundation pantry seeding failed.",
      },
      { status: 500 }
    );
  }
}

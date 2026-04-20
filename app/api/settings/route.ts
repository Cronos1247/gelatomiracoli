import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AppSettingRecord } from "@/lib/default-data";

function getSupabaseWriteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || (!serviceRoleKey && !anonKey)) {
    return null;
  }

  return createClient(url, serviceRoleKey ?? anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  const supabaseClient = getSupabaseWriteClient();

  if (!supabaseClient) {
    return NextResponse.json(
      { error: "Supabase is not configured for settings sync." },
      { status: 500 }
    );
  }

  const supabase = supabaseClient;

  const payload = (await request.json()) as Partial<AppSettingRecord>;

  const masterProfileId =
    process.env.MIRACOLI_MASTER_ADMIN_UUID ??
    process.env.NEXT_PUBLIC_MIRACOLI_MASTER_ADMIN_UUID ??
    null;

  async function syncProfileLanguage(language: string | null | undefined) {
    if (!language || !masterProfileId) {
      return;
    }

    const preferredLanguageProbe = await supabase.from("profiles").select("preferred_language").limit(1);
    const hasPreferredLanguageColumn = !preferredLanguageProbe.error;

    const languageColumnProbe = hasPreferredLanguageColumn
      ? null
      : await supabase.from("profiles").select("language").limit(1);
    const hasLanguageProfileColumn = !hasPreferredLanguageColumn && !languageColumnProbe?.error;

    if (hasPreferredLanguageColumn) {
      await supabase
        .from("profiles")
        .update({ preferred_language: language })
        .eq("id", masterProfileId);
      return;
    }

    if (hasLanguageProfileColumn) {
      await supabase.from("profiles").update({ language }).eq("id", masterProfileId);
    }
  }

  if (!payload.display_type && payload.language) {
    const existingLanguageRecord = await supabase
      .from("settings")
      .select("id")
      .is("user_id", null)
      .limit(1)
      .maybeSingle();

    if (existingLanguageRecord.error) {
      return NextResponse.json({ error: existingLanguageRecord.error.message }, { status: 500 });
    }

    const languageProbe = await supabase.from("settings").select("language").limit(1);

    if (languageProbe.error) {
      await syncProfileLanguage(payload.language);
      return NextResponse.json({ settingsId: existingLanguageRecord.data?.id ?? "language-only" });
    }

    if (existingLanguageRecord.data?.id) {
      const updateLanguage = await supabase
        .from("settings")
        .update({ language: payload.language })
        .eq("id", existingLanguageRecord.data.id)
        .select("id")
        .single();

      if (updateLanguage.error || !updateLanguage.data) {
        return NextResponse.json(
          { error: updateLanguage.error?.message ?? "Language update failed." },
          { status: 500 }
        );
      }

      await syncProfileLanguage(payload.language);
      return NextResponse.json({ settingsId: updateLanguage.data.id });
    }

    const insertLanguage = await supabase
      .from("settings")
      .insert({
        user_id: null,
        display_type: "Standard Case",
        equipment_id: null,
        lab_name: null,
        logo_url: null,
        available_sugars: [],
        language: payload.language,
      })
      .select("id")
      .single();

    if (insertLanguage.error || !insertLanguage.data) {
      return NextResponse.json(
        { error: insertLanguage.error?.message ?? "Language insert failed." },
        { status: 500 }
      );
    }

    await syncProfileLanguage(payload.language);
    return NextResponse.json({ settingsId: insertLanguage.data.id });
  }

  if (!payload.display_type) {
    return NextResponse.json({ error: "Display type is required." }, { status: 400 });
  }

  const existing = await supabase
    .from("settings")
    .select("id")
    .is("user_id", null)
    .limit(1)
    .maybeSingle();

  const languageProbe = await supabase.from("settings").select("language").limit(1);
  const hasLanguageColumn = !languageProbe.error;

  const settingValues = {
    user_id: null,
    display_type: payload.display_type,
    equipment_id: payload.equipment_id ?? null,
    lab_name: payload.lab_name ?? null,
    logo_url: payload.logo_url ?? null,
    available_sugars: payload.available_sugars ?? [],
    ...(hasLanguageColumn ? { language: payload.language ?? null } : {}),
  };

  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  if (existing.data?.id) {
    const update = await supabase
      .from("settings")
      .update(settingValues)
      .eq("id", existing.data.id)
      .select("id")
      .single();

    if (update.error || !update.data) {
      return NextResponse.json(
        { error: update.error?.message ?? "Settings update failed." },
        { status: 500 }
      );
    }

    if (payload.equipment_id) {
      const registryDelete = await supabase.from("user_equipment").delete().is("user_id", null);

      if (!registryDelete.error) {
        await supabase.from("user_equipment").insert({
          user_id: null,
          equipment_model_id: payload.equipment_id,
          is_active: true,
        });
      }
    }

    await syncProfileLanguage(payload.language);

    return NextResponse.json({ settingsId: update.data.id });
  }

  const insert = await supabase
    .from("settings")
    .insert(settingValues)
    .select("id")
    .single();

  if (insert.error || !insert.data) {
    return NextResponse.json(
      { error: insert.error?.message ?? "Settings insert failed." },
      { status: 500 }
    );
  }

  if (payload.equipment_id) {
    const registryDelete = await supabase.from("user_equipment").delete().is("user_id", null);

    if (!registryDelete.error) {
      await supabase.from("user_equipment").insert({
        user_id: null,
        equipment_model_id: payload.equipment_id,
        is_active: true,
      });
    }
  }

  await syncProfileLanguage(payload.language);

  return NextResponse.json({ settingsId: insert.data.id });
}

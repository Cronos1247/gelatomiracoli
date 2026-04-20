import { NextResponse } from "next/server";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRoleKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
  );
  const hasMasterAdminUuid = Boolean(
    process.env.MIRACOLI_MASTER_ADMIN_UUID ?? process.env.NEXT_PUBLIC_MIRACOLI_MASTER_ADMIN_UUID
  );

  const missingForBatchPublish = [
    !hasSupabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !hasAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
    !hasServiceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
  ].filter((value): value is string => Boolean(value));

  return NextResponse.json({
    hasSupabaseUrl,
    hasAnonKey,
    hasServiceRoleKey,
    hasMasterAdminUuid,
    missingForBatchPublish,
    isBatchPublishReady: missingForBatchPublish.length === 0,
  });
}

"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginState = {
  error: string | null;
};

export type SignupState = {
  error: string | null;
  success: boolean;
  nextPath: string | null;
  message: string | null;
};

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: "Supabase is not configured for portal authentication." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/portal/dashboard");
}

export async function signupAction(
  _previousState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      error: "Supabase is not configured for portal authentication.",
      success: false,
      nextPath: null,
      message: null,
    };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !businessName || !email || !password) {
    return {
      error: "Full name, business name, email, and password are required.",
      success: false,
      nextPath: null,
      message: null,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        primary_contact_name: fullName,
        company_name: businessName,
      },
    },
  });

  if (error) {
    return {
      error: error.message,
      success: false,
      nextPath: null,
      message: null,
    };
  }

  const hasSession = Boolean(data.session);

  return {
    error: null,
    success: true,
    nextPath: hasSession ? "/portal/onboarding" : "/login?status=check-email",
    message: hasSession
      ? "Welcome to the Lab."
      : "Check your inbox to confirm your account, then log in to continue.",
  };
}

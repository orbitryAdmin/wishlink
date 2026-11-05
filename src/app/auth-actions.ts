"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-types";
import { clearAdminSession, loginAdmin } from "@/lib/auth";

export async function signIn(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = await loginAdmin(
    String(formData.get("username") ?? ""),
    String(formData.get("password") ?? ""),
  );

  if (result.error) {
    return { error: result.error };
  }

  redirect("/");
}

export async function signOut() {
  await clearAdminSession();
  redirect("/login");
}

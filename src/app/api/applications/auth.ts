import type { User } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";

export const getAuthenticatedUser = async (
  request: Request
): Promise<{ user: User | null; error: string | null }> => {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token === "undefined") {
    return { user: null, error: "Missing authorization token" };
  }

  const {
    data: { user },
    error,
  } = await getSupabase().auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "Invalid or expired token" };
  }

  return { user, error: null };
};

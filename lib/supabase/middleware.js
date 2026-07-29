import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabasePublicEnv } from "./env";

export async function updateSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { projectUrl, publishableKey, isConfigured } = getSupabasePublicEnv();
  if (!isConfigured) {
    return response;
  }

  const supabase = createServerClient(projectUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // 觸發 session 刷新；結果暫不使用，僅為更新 cookie
  await supabase.auth.getUser();

  return response;
}

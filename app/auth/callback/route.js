import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const AUTH_CALLBACK_ERROR_PATH = "/?authError=1";
const AUTH_CALLBACK_SUCCESS_PATH = "/";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const authCode = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!authCode) {
    return NextResponse.redirect(`${origin}${AUTH_CALLBACK_ERROR_PATH}`);
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}${AUTH_CALLBACK_ERROR_PATH}`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(authCode);
  if (error) {
    return NextResponse.redirect(`${origin}${AUTH_CALLBACK_ERROR_PATH}`);
  }

  return NextResponse.redirect(`${origin}${AUTH_CALLBACK_SUCCESS_PATH}`);
}

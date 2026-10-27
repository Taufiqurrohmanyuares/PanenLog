import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Halaman yang boleh dibuka tanpa masuk. */
const PUBLIC_PREFIXES = ["/masuk", "/auth"];

/**
 * Menyegarkan token Supabase di setiap request dan menjaga halaman privat.
 * Dipanggil dari proxy.ts (nama baru untuk middleware di Next.js 16).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Jangan tambah kode apa pun di antara createServerClient dan getClaims().
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Bawa cookie sesi yang baru disegarkan supaya tidak hilang.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!signedIn && !isPublic) return redirectTo("/masuk");
  if (signedIn && (path === "/masuk" || path.startsWith("/masuk/"))) return redirectTo("/");

  return response;
}

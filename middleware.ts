import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { canAccessAdmin, type AppRole } from './lib/authz';
import { requireSupabaseEnv } from './lib/supabase/env';

const EXCLUDED_PATHS = ['/login', '/api/health/supabase'];

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.includes(pathname) || pathname.startsWith('/_next/');
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

function redirectToLogin(request: NextRequest, response: NextResponse) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return copyCookies(response, NextResponse.redirect(loginUrl));
}

function forbidden(response: NextResponse) {
  return copyCookies(
    response,
    new NextResponse('관리자 권한이 필요합니다.', { status: 403 })
  );
}

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export async function middleware(request: NextRequest) {
  if (isExcludedPath(request.nextUrl.pathname)) return NextResponse.next();

  const { url, publishableKey } = requireSupabaseEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return redirectToLogin(request, response);

  const { data: profile, error: profileError } = await supabase
    .schema('core')
    .from('app_user')
    .select('role, active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.active) return redirectToLogin(request, response);
  if (isAdminPath(request.nextUrl.pathname) && !canAccessAdmin(profile.role as AppRole)) {
    return forbidden(response);
  }

  return response;
}

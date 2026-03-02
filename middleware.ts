import { auth } from "./src/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // Allow guest access for billing success redirect (auto-login happens there).
  if (req.nextUrl.pathname === '/billing/success') {
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/account/:path*', '/billing/:path*'],
};


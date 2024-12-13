import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
};

export default function middleware(req: NextRequest) {
  const hostname = req.headers.get("host")!;
  const path = req.nextUrl.pathname;

  const subdomain = hostname.split(".")[0];

  // Handle requests without subdomains or for the main app
  if (subdomain === "www" || subdomain === "" || hostname === "localhost:3000") {
    return NextResponse.next();
  }

  // Add tenantId to request headers and rewrite the URL
  const response = NextResponse.rewrite(new URL(`/tenants/${subdomain}${path}`, req.url));
  response.headers.set("x-tenant-id", subdomain); // Set tenant ID in headers
  return response;
}

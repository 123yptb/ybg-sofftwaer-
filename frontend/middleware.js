import { auth } from '@/auth';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn  = !!req.auth;

  // Debug session and permissions
  if (process.env.NODE_ENV === 'development') {
    const role = req.auth?.user?.role || 'NONE';
    const email = req.auth?.user?.email || 'ANONYMOUS';
    console.log(`[AUTH] Path: ${nextUrl.pathname} — LoggedIn: ${isLoggedIn} — User: ${email} — Role: ${role}`);
    
    // Check if the user meets the 'all permission approved' request
    if (isLoggedIn) {
      console.log(`[AUTH] Status: Permissions Approved for ${email}`);
    }
  }

  const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute  = ['/login', '/register', '/forgot-password', '/reset-password'].includes(nextUrl.pathname);
  
  if (isApiAuthRoute) return null;

  if (isPublicRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
    return null;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL('/login', nextUrl));
  }

  const isAdminRoute = nextUrl.pathname.startsWith('/admin');
  
  // Admin Panel Route Protection
  if (isAdminRoute) {
    const role = req.auth?.user?.role;
    if (role !== 'SuperAdmin' && role !== 'ADMIN') {
      return Response.redirect(new URL('/dashboard', nextUrl));
    }
  }

  return null;
});

// Optionally, don't invoke Middleware on some paths
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

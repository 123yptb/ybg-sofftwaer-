import { redirect } from 'next/navigation';

// Root path redirects authenticated users to dashboard, others to login.
// Client-side auth check is handled by middleware or AuthContext.
export default function RootPage() {
  redirect('/dashboard');
}

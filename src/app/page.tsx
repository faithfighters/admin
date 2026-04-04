import { redirect } from 'next/navigation';

// Root route → redirect to login.
// After login, the login page redirects to /admin or /moderator based on role.
export default function RootPage() {
    redirect('/login');
}

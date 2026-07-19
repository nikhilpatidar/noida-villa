import Link from 'next/link';
import { LoginForm } from './LoginForm';

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  return (
    <main className="min-h-screen grid place-items-center bg-cream-100 px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-serif text-2xl text-ink-900">The Noida Villa</Link>
        <p className="mt-2 text-center text-sm text-ink-500">Owner & manager access</p>
        <div className="mt-8 admin-panel p-7">
          <LoginForm searchParams={searchParams} />
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          <Link href="/">← Back to website</Link>
        </p>
      </div>
    </main>
  );
}

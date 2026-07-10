import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[70vh] grid place-items-center px-6">
      <div className="max-w-lg text-center">
        <div className="eyebrow">404</div>
        <h1 className="mt-3 font-serif text-5xl text-ink-900">Page not found</h1>
        <p className="mt-4 text-ink-600">The page you&apos;re looking for has moved or doesn&apos;t exist.</p>
        <Link href="/" className="btn-primary mt-8">Return home</Link>
      </div>
    </main>
  );
}

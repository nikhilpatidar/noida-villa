export function FAQList({ items }: { items: Array<{ id: string; question: string; answer: string }> }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((f) => (
        <details key={f.id} className="group rounded-xl border border-ink-100 bg-white px-5 py-4">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-ink-900">
            <span>{f.question}</span>
            <span className="text-ink-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <div className="mt-3 text-sm text-ink-600 text-pretty">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}
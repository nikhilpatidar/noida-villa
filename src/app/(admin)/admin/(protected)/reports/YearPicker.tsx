'use client';

/**
 * Year picker — a tiny Client Component that lets the reports page stay
 * a Server Component while still getting a working year selector. The
 * parent page passes `currentYear` and the list of years to render.
 */
export function YearPicker({ currentYear, years }: { currentYear: number; years: number[] }) {
  return (
    <form method="get">
      <select
        name="year"
        defaultValue={String(currentYear)}
        className="input"
        onChange={(e) => (e.currentTarget.form as HTMLFormElement).submit()}
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </form>
  );
}
export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-950">
      <div className="mx-auto max-w-5xl">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-8 grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
              <div className="h-12 animate-pulse rounded bg-gray-100" />
              <div className="h-12 animate-pulse rounded bg-gray-100" />
              <div className="h-12 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="h-8 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    </main>
  )
}

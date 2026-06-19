import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-950">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="text-sm font-medium text-gray-500">404</div>
        <h1 className="mt-2 text-lg font-semibold text-gray-950">没有找到这条本地记录</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          目标会话或治理记录可能不存在，或已经从当前本地数据库中移除。
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          返回 ChatHub
        </Link>
      </div>
    </main>
  )
}

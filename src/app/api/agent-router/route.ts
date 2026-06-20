import { handleAgentRouterPost } from './handler'
import { withAuth } from '@/lib/auth/middleware'

export const POST = withAuth(async (request) => {
  return handleAgentRouterPost(request)
})

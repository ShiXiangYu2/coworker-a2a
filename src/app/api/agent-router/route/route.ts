import { handleAgentRouterPost } from '../handler'

export async function POST(request: Request) {
  return handleAgentRouterPost(request)
}

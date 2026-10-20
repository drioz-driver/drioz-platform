import { env } from "cloudflare:workers";
import { handleMobile } from "@/lib/mobile-api";
export const dynamic = "force-dynamic";
async function route(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handleMobile(
    request,
    (await context.params).path.join("/"),
    env as any,
  );
}
export { route as GET, route as POST };

import { forwardAuth } from "@/lib/auth-proxy";

export async function POST(req: Request) {
  return forwardAuth("login", await req.json());
}

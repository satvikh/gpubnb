import crypto from "crypto";
import { NextResponse } from "next/server";
import { Provider } from "@/lib/models";
import type { IProvider } from "@/lib/models";

export function createProviderToken() {
  return `tok_${crypto.randomBytes(32).toString("hex")}`;
}

export function hashProviderToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function timingSafeEqualString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function authenticateProvider(request: Request, providerId: string) {
  const token = bearerToken(request);
  if (!token) return null;

  const provider = await Provider.findById(providerId);
  if (!provider?.tokenHash) return null;

  const incomingHash = hashProviderToken(token);
  if (!timingSafeEqualString(incomingHash, provider.tokenHash)) return null;

  return provider as IProvider;
}

export async function requireProvider(request: Request, providerId: string) {
  const provider = await authenticateProvider(request, providerId);
  if (!provider) {
    return {
      provider: null,
      response: NextResponse.json({ error: "Unauthorized provider" }, { status: 401 })
    };
  }

  return { provider, response: null };
}

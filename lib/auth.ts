import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/db/drizzle";
import { user, session } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  approved: boolean;
  image: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, request?: Request) {
  const token = await createSessionToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [sessionRecord] = await db
    .insert(session)
    .values({
      id: crypto.randomUUID(),
      token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: request?.headers?.get("x-forwarded-for") || null,
      userAgent: request?.headers?.get("user-agent") || null,
      userId,
    })
    .returning();

  return { session: sessionRecord, token };
}

export async function getSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/session_token=([^;]+)/);

  if (!tokenMatch) return null;

  const payload = await verifySessionToken(tokenMatch[1]);
  if (!payload) return null;

  const [sessionRecord] = await db
    .select()
    .from(session)
    .where(
      and(
        eq(session.token, tokenMatch[1]),
        gt(session.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessionRecord) return null;

  const [userRecord] = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionRecord.userId))
    .limit(1);

  if (!userRecord) return null;

  return {
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      approved: userRecord.approved,
      image: userRecord.image,
    },
    session: sessionRecord,
  };
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const [sessionRecord] = await db
    .select()
    .from(session)
    .where(
      and(
        eq(session.token, token),
        gt(session.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!sessionRecord) return null;

  const [userRecord] = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionRecord.userId))
    .limit(1);

  if (!userRecord) return null;

  return {
    user: {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      approved: userRecord.approved,
      image: userRecord.image,
    },
    session: sessionRecord,
  };
}

export async function deleteSession(token: string) {
  await db.delete(session).where(eq(session.token, token));
}

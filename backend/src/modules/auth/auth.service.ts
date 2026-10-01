import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
};
const verifyPassword = (password: string, stored: string) => {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

type ProfileUpdate = { phone?: string; name?: string; email?: string; city?: string; address?: string; language?: string };
type SessionResult = { accessToken: string; expiresInSeconds: number; user: Awaited<ReturnType<AuthService["getProfile"]>> };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async requestOtp(phone: string) {
    const normalized = phone.replace(/\s+/g, "");
    if (!/^\+?[0-9]{9,15}$/.test(normalized)) throw new BadRequestException("Invalid phone number");
    const code = process.env.APP_ENV === "production" ? undefined : "123456";
    const actual = code ?? String(Math.floor(100000 + Math.random() * 900000));
    await this.prisma.otpChallenge.updateMany({ where: { phone: normalized, consumedAt: null }, data: { consumedAt: new Date() } });
    await this.prisma.otpChallenge.create({ data: { phone: normalized, codeHash: hash(actual), expiresAt: new Date(Date.now() + 5 * 60 * 1000) } });
    return { accepted: true, expiresInSeconds: 300, devCode: process.env.APP_ENV === "production" ? undefined : actual };
  }

  async validateSession(raw: string) {
    const session = await this.prisma.session.findFirst({ where: { tokenHash: hash(raw), expiresAt: { gt: new Date() } }, include: { user: true } });
    if (!session) throw new UnauthorizedException("Invalid or expired session");
    return session.user;
  }

  async getProfile(token: string) {
    return this.validateSession(token);
  }

  async register(email: string, password: string): Promise<SessionResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email: normalizedEmail } })) {
      throw new ConflictException("Email is already registered");
    }
    const user = await this.prisma.user.create({ data: { email: normalizedEmail, passwordHash: hashPassword(password) } });
    return this.createSession(user);
  }

  async login(email: string, password: string): Promise<SessionResult> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.createSession(user);
  }

  async updateProfile(token: string, update: ProfileUpdate) {
    const user = await this.validateSession(token);
    return this.prisma.user.update({ where: { id: user.id }, data: update });
  }

  private async createSession(user: Awaited<ReturnType<typeof this.validateSession>>) {
    const raw = randomBytes(32).toString("hex");
    await this.prisma.session.create({ data: { userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    return { accessToken: raw, expiresInSeconds: 30 * 24 * 60 * 60, user };
  }

  async verifyOtp(phone: string, code: string) {
    const normalized = phone.replace(/\s+/g, "");
    const challenge = await this.prisma.otpChallenge.findFirst({ where: { phone: normalized, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    if (!challenge || challenge.attempts >= 5 || hash(code) !== challenge.codeHash) {
      if (challenge) await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException("Invalid or expired OTP");
    }
    const user = await this.prisma.user.upsert({ where: { phone: normalized }, create: { phone: normalized }, update: {} });
    const raw = randomBytes(32).toString("hex");
    await this.prisma.$transaction([
      this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } }),
      this.prisma.session.create({ data: { userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } })
    ]);
    return { accessToken: raw, expiresInSeconds: 30 * 24 * 60 * 60, user };
  }
}

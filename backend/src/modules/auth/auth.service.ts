import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
const hash=(v:string)=>createHash("sha256").update(v).digest("hex");

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  async requestOtp(phone:string) {
    const normalized=phone.replace(/\s+/g,"");
    if(!/^\+?[0-9]{9,15}$/.test(normalized)) throw new BadRequestException({code:"INVALID_PHONE",message:"Неверный номер телефона"});
    const recent=await this.prisma.otpChallenge.findFirst({where:{phone:normalized,createdAt:{gt:new Date(Date.now()-60_000)}}});
    if(recent) throw new BadRequestException({code:"OTP_COOLDOWN",message:"Повторно запросить код можно через минуту"});
    const code=process.env.APP_ENV==="development"?"123456":String(Math.floor(100000+Math.random()*900000));
    await this.prisma.otpChallenge.updateMany({where:{phone:normalized,consumedAt:null},data:{consumedAt:new Date()}});
    await this.prisma.otpChallenge.create({data:{phone:normalized,codeHash:hash(code),expiresAt:new Date(Date.now()+300_000)}});
    return {accepted:true,expiresInSeconds:300,devCode:process.env.APP_ENV==="development"?code:undefined};
  }
  async validateSession(raw:string) {
    if(!raw) throw new UnauthorizedException({code:"AUTH_REQUIRED",message:"Требуется авторизация"});
    const session=await this.prisma.session.findFirst({where:{tokenHash:hash(raw),expiresAt:{gt:new Date()}},include:{user:true}});
    if(!session) throw new UnauthorizedException({code:"AUTH_REQUIRED",message:"Сессия недействительна или истекла"});
    return session.user;
  }
  async logout(raw:string) {
    if(raw) await this.prisma.session.deleteMany({where:{tokenHash:hash(raw)}});
    return {success:true};
  }
  async verifyOtp(phone:string,code:string) {
    const normalized=phone.replace(/\s+/g,"");
    const challenge=await this.prisma.otpChallenge.findFirst({where:{phone:normalized,consumedAt:null,expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"}});
    if(!challenge||challenge.attempts>=5||hash(code)!==challenge.codeHash) {
      if(challenge) await this.prisma.otpChallenge.update({where:{id:challenge.id},data:{attempts:{increment:1}}});
      throw new UnauthorizedException({code:challenge?"INVALID_OTP":"OTP_EXPIRED",message:challenge?"Неверный код":"Код истёк"});
    }
    const user=await this.prisma.user.upsert({where:{phone:normalized},create:{phone:normalized},update:{}});
    const raw=randomBytes(32).toString("hex");
    await this.prisma.$transaction([this.prisma.otpChallenge.update({where:{id:challenge.id},data:{consumedAt:new Date()}}),this.prisma.session.create({data:{userId:user.id,tokenHash:hash(raw),expiresAt:new Date(Date.now()+30*86400_000)}})]);
    return {accessToken:raw,expiresInSeconds:30*86400,user};
  }
}
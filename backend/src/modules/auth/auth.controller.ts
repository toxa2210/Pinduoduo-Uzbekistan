import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { IsNotEmpty, IsString } from "class-validator";
import { AuthService } from "./auth.service";

class PhoneDto { @IsString() @IsNotEmpty() phone!: string; }
class VerifyDto extends PhoneDto { @IsString() @IsNotEmpty() code!: string; }

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("request-otp") request(@Body() body: PhoneDto) { return this.auth.requestOtp(body.phone); }
  @Post("verify-otp") verify(@Body() body: VerifyDto) { return this.auth.verifyOtp(body.phone, body.code); }
  @Get("me") async me(@Headers("authorization") authorization?: string) { return this.auth.validateSession(authorization?.replace(/^Bearer\s+/i, "") ?? ""); }
  @Post("logout") async logout(@Headers("authorization") authorization?: string) { return this.auth.logout(authorization?.replace(/^Bearer\s+/i, "") ?? ""); }
}
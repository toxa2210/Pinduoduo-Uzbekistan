import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
@Injectable() export class RequestIdMiddleware implements NestMiddleware { use(req:Request,res:Response,next:NextFunction){const id=req.header("x-request-id")||randomUUID();res.setHeader("x-request-id",id);next();} }
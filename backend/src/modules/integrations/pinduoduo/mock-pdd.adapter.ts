import { Injectable } from "@nestjs/common";
import type { PddAdapter } from "./pdd.adapter";
@Injectable()
export class MockPddAdapter implements PddAdapter { async searchProducts(){return {total:0,items:[]};} async getProduct(){return null;} async getCategories(){return {items:[]};} }
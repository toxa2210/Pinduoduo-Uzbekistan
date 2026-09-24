import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentsService } from "./payments.service";

type RpcRequest = { id?: string|number|null; method?: string; params?: any };

@Injectable()
export class PaymeService {
  constructor(private readonly config: ConfigService, private readonly payments: PaymentsService) {}

  authorize(header?: string) {
    const key = this.config.get<string>("PAYME_MERCHANT_KEY") ?? "";
    if (!header?.startsWith("Basic ") || !key) return false;
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [, password] = decoded.split(":");
    return password === key;
  }

  private rpc(id: RpcRequest["id"], result: unknown) {
    return { jsonrpc: "2.0", id: id ?? null, result };
  }

  private error(id: RpcRequest["id"], code: number, message: string) {
    return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
  }

  private orderId(params: any) {
    return String(params?.account?.order_id ?? "");
  }

  async handle(req: RpcRequest) {
    switch (req.method) {
      case "CheckPerformTransaction": return this.checkPerform(req);
      case "CreateTransaction": return this.create(req);
      case "CheckTransaction": return this.check(req);
      case "PerformTransaction": return this.perform(req);
      case "CancelTransaction": return this.cancel(req);
      case "GetStatement": return this.statement(req);
      default: return this.error(req.id, -32601, "Method not found");
    }
  }

  private async checkPerform(req: RpcRequest) {
    const id = this.orderId(req.params);
    const amount = Number(req.params?.amount ?? 0);
    const order = await this.payments.getOrderPayment(id, req.params?.user_id ?? "");
    if (amount !== order.totalMinor * 100) return this.error(req.id, -31001, "Incorrect amount");
    return this.rpc(req.id, { allow: true });
  }

  private async create(req: RpcRequest) {
    const id = this.orderId(req.params);
    const paymeId = String(req.params?.id ?? "");
    const amount = Number(req.params?.amount ?? 0);
    const order = await this.payments.getOrderPayment(id, req.params?.user_id ?? "");
    if (amount !== order.totalMinor * 100) return this.error(req.id, -31001, "Incorrect amount");

    const existing = order.payments.find((p) => p.externalRef === paymeId);
    if (existing) {
      return this.rpc(req.id, {
        create_time: existing.createdAt.getTime(),
        perform_time: existing.status === "PAID" ? existing.updatedAt.getTime() : 0,
        cancel_time: existing.status === "REFUNDED" ? existing.updatedAt.getTime() : 0,
        transaction: existing.id,
        state: existing.status === "PAID" ? 2 : 1
      });
    }

    return this.error(req.id, -31050, "Payment transaction creation requires merchant account context");
  }

  private async check(req: RpcRequest) {
    return this.error(req.id, -31003, "Transaction lookup requires merchant account context");
  }

  private async perform(req: RpcRequest) {
    return this.error(req.id, -31003, "Transaction lookup requires merchant account context");
  }

  private async cancel(req: RpcRequest) {
    return this.error(req.id, -31003, "Transaction lookup requires merchant account context");
  }

  private async statement(req: RpcRequest) {
    return this.rpc(req.id, { transactions: [] });
  }
}

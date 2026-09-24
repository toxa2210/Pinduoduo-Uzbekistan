import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../database/prisma.service";

type RpcRequest = { id?: string|number|null; method?: string; params?: Record<string, any> };

@Injectable()
export class PaynetService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  authorize(header?: string) {
    const expectedUser = this.config.get<string>("PAYNET_USERNAME") ?? "";
    const expectedPass = this.config.get<string>("PAYNET_PASSWORD") ?? "";
    if (!header?.startsWith("Basic ")) return false;
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [user, pass] = decoded.split(":");
    return !!expectedUser && user === expectedUser && pass === expectedPass;
  }

  private field(params: Record<string, any>, name: string) {
    const fields = Array.isArray(params.fields) ? params.fields : [];
    const found = fields.find((x: any) => x?.fieldName === name || x?.name === name);
    return found?.value ?? params[name];
  }

  private rpc(id: RpcRequest["id"], result: unknown) {
    return { jsonrpc: "2.0", id: id ?? null, result };
  }

  private error(id: RpcRequest["id"], code: number, message: string) {
    return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
  }

  async handle(request: RpcRequest) {
    switch (request.method) {
      case "GetInformation":
        return this.getInformation(request);
      case "PerformTransaction":
        return this.perform(request);
      case "CheckTransaction":
        return this.check(request);
      case "CancelTransaction":
        return this.cancel(request);
      case "GetStatement":
        return this.statement(request);
      default:
        return this.error(request.id, -32601, "Method not found");
    }
  }

  private async getInformation(req: RpcRequest) {
    const orderId = this.field(req.params ?? {}, "order_id");
    if (!orderId) return this.error(req.id, 411, "order_id is required");
    const order = await this.prisma.order.findUnique({ where: { id: String(orderId) } });
    if (!order) return this.error(req.id, 302, "Client not found");
    return this.rpc(req.id, {
      status: 0,
      customer: String(order.userId),
      account: [{ fieldName: "order_id", value: order.id }],
      balance: order.totalMinor
    });
  }

  private async perform(req: RpcRequest) {
    const p = req.params ?? {};
    const orderId = this.field(p, "order_id");
    const transactionId = String(p.transactionId ?? p.transaction_id ?? "");
    const amount = Number(p.amount ?? 0);
    if (!orderId || !transactionId || !amount) return this.error(req.id, 411, "Required parameter is missing");

    const order = await this.prisma.order.findUnique({ where: { id: String(orderId) } });
    if (!order) return this.error(req.id, 302, "Client not found");
    if (amount !== order.totalMinor * 100) return this.error(req.id, 413, "Invalid amount");

    const existing = await this.prisma.payment.findFirst({ where: { externalRef: transactionId } });
    if (existing) return this.error(req.id, 201, "Transaction already exists");

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "paynet",
        externalRef: transactionId,
        amountMinor: order.totalMinor,
        currency: "UZS",
        status: "PAID"
      }
    });

    return this.rpc(req.id, {
      transactionState: 1,
      providerTrnId: payment.id,
      transactionId,
      transactionTime: new Date().toISOString()
    });
  }

  private async check(req: RpcRequest) {
    const transactionId = String(req.params?.transactionId ?? req.params?.transaction_id ?? "");
    const payment = await this.prisma.payment.findFirst({ where: { externalRef: transactionId } });
    return this.rpc(req.id, {
      transactionState: payment?.status === "PAID" ? 1 : 3,
      providerTrnId: payment?.id ?? null,
      transactionId
    });
  }

  private async cancel(req: RpcRequest) {
    const transactionId = String(req.params?.transactionId ?? req.params?.transaction_id ?? "");
    const payment = await this.prisma.payment.findFirst({ where: { externalRef: transactionId } });
    if (!payment) return this.error(req.id, 203, "Transaction not found");
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    return this.rpc(req.id, { transactionState: 2, providerTrnId: payment.id, transactionId });
  }

  private async statement(req: RpcRequest) {
    return this.rpc(req.id, { transactions: [] });
  }
}

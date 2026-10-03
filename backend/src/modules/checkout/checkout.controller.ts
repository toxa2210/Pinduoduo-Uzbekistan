import { Controller, GoneException, Post } from "@nestjs/common";

@Controller("checkout")
export class CheckoutController {
  @Post()
  checkout() {
    throw new GoneException("Use POST /api/v1/orders with delivery details and verified cart items");
  }
}

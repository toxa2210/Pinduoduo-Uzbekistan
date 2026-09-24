import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get("categories") categories() { return this.catalog.listCategories(); }
  @Get("catalog/categories") catalogCategories() { return this.catalog.listCategories(); }
  @Get("products") products(@Query("categoryId") categoryId?: string, @Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string, @Query("minPrice") minPrice?: string, @Query("maxPrice") maxPrice?: string, @Query("sort") sort?: string, @Query("source") source?: string) {
    return this.catalog.listProducts({ categoryId, search, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, minPrice: minPrice ? Number(minPrice) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined, sort, source });
  }
  @Get("catalog/products") catalogProducts(@Query() q: Record<string,string>) { return this.products(q.categoryId,q.search,q.page,q.limit,q.minPrice,q.maxPrice,q.sort,q.source); }
  @Get("catalog/search") search(@Query("q") q?: string, @Query("page") page?: string, @Query("limit") limit?: string) { return this.products(undefined,q,page,limit); }
  @Get("products/:id") product(@Param("id") id: string) { return this.catalog.getProduct(id); }
  @Get("catalog/products/:id") catalogProduct(@Param("id") id: string) { return this.catalog.getProduct(id); }
}
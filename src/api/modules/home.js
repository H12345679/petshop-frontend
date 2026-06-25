import { get } from "../axios.js";

/** 首页商品：GET /api/home/products?strategy=HOT|NEW|RECOMMEND&limit=n -> List<Product> */
export function homeProducts(strategy, limit) {
  return get("/home/products", { strategy, limit });
}

/** 分类树：GET /api/categories -> 顶级分类(含 children) */
export function categoryTree() {
  return get("/categories");
}

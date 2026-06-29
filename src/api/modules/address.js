import { get, postJson, put, del } from "../axios.js";

/**
 * 收货地址接口（对应后端 B 模块 AddressController）。
 */

/** 地址列表 GET /api/addresses */
export function addressList() {
  return get("/addresses");
}

/** 新增地址 POST /api/addresses */
export function addAddress(data) {
  return postJson("/addresses", data);
}

/** 修改地址 PUT /api/addresses/{id} */
export function updateAddress(id, data) {
  return put(`/addresses/${id}`, data);
}

/** 删除地址 DELETE /api/addresses/{id} */
export function deleteAddress(id) {
  return del(`/addresses/${id}`);
}

/** 设为默认 PUT /api/addresses/{id}/default */
export function setDefaultAddress(id) {
  return put(`/addresses/${id}/default`);
}

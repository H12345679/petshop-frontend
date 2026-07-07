import request from '@/api/axios'

export function getLogs(params) {
  return request({
    url: '/sys/log/page',
    method: 'get',
    params
  })
}

export function getOrderStatusLogs(params) {
  return request({
    url: '/sys/log/order-status/page',
    method: 'get',
    params
  })
}

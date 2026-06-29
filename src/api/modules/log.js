import request from '@/api/axios'

export function getLogs(params) {
  return request({
    url: '/sys/log/page',
    method: 'get',
    params
  })
}

/**
 * 存储localStorage
 */
export const setStore = (name, content) => {
  if (!name) return
  if (typeof content !== 'string') {
    console.log("not String");
    content = JSON.stringify(content)
  }
  globalThis.localStorage.setItem(`${name.toUpperCase()}`, content)
}

/**
 * 获取localStorage
 */
export const getStore = name => {
  if (!name) return
  return globalThis.localStorage.getItem(`${name.toUpperCase()}`)
}

/**
 * 删除localStorage
 */
export const removestore = name => {
  if (!name) return
  globalThis.localStorage.removeItem(`${name.toUpperCase()}`)
}

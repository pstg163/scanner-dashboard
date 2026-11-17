/** Vite `base` plus the React Router basename. Default is the site root. */
export function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value || value === '/') return '/'
  let path = value
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname || '/'
    } catch {
      return '/'
    }
  }
  if (!path.startsWith('/')) path = `/${path}`
  if (path !== '/' && path.endsWith('/')) return path
  if (path === '/') return '/'
  return `${path}/`
}

/** React Router basename has a leading slash and no trailing slash. Root is undefined. */
export function routerBasename(baseUrl: string | undefined): string | undefined {
  const base = normalizeBase(baseUrl)
  if (base === '/') return undefined
  return base.slice(0, -1)
}

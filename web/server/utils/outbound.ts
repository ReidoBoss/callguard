// Our own hardware: this machine, or the SSH tunnel to the Mac mini (#30), which the
// container reaches as host.docker.internal
const selfHostedHosts = new Set(['localhost', '127.0.0.1', '[::1]', 'host.docker.internal'])

/**
 * Every request the server sends off this process goes through here, so the privacy
 * page (#20) can show it. Gemma calls (#4 to #6) use this instead of $fetch
 */
export async function outboundFetch<T>(purpose: Purpose, url: string, options: Parameters<typeof $fetch>[1] = {}) {
  const { host, hostname } = new URL(url)
  const bytesSent = options.body == null
    ? 0
    : new TextEncoder().encode(typeof options.body === 'string' ? options.body : JSON.stringify(options.body)).length
  const started = performance.now()
  let ok = false
  try {
    const response = await $fetch<T>(url, options)
    ok = true
    return response
  }
  finally {
    logActivity({ purpose, host, selfHosted: selfHostedHosts.has(hostname), bytesSent, durationMs: Math.round(performance.now() - started), ok })
  }
}

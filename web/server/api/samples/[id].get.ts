export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const text = /^[\w-]+$/.test(id) ? await useStorage('assets:calls').getItem(`${id}.txt`) : null

  if (text == null) {
    throw createError({ statusCode: 404, statusMessage: 'No such sample' })
  }
  return { id, transcript: String(text) }
})

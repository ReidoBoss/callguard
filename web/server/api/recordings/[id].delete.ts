// Deletes a recording's temp folder (original and chunks) once its review is done.
export default defineEventHandler(async (event) => {
  await deleteRecording(getRouterParam(event, 'id') ?? '')
  setResponseStatus(event, 204)
  return null
})

import app from '../../../backend/src/index'

export const onRequest: PagesFunction = async (context) => {
  return app.fetch(context.request, context.env, context)
}

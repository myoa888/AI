// Cloudflare Pages Functions 入口
import router from './api/index.js';

export async function onRequest(context) {
  return router.fetch(context.request, context.env, context);
}

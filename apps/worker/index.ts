import { serve } from "@hono/node-server";
import app from "./server.ts";

serve({
  fetch: app.fetch,
  port: 3001,
});

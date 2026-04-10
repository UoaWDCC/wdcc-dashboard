import { Hono } from "hono";
import { shared } from "@repo/shared";
import { queryUser } from "@repo/db";

const app = new Hono();

app.get("/", (c) => {
  const user = queryUser();
  return c.json({ message: shared(), user });
});

export default app;

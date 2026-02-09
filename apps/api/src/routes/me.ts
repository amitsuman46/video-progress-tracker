import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAuth, isAdmin } from "../auth.js";

export default async function meRoutes(app: FastifyInstance) {
  app.get("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await verifyAuth(request, reply);
    if (!user) return;
    return {
      uid: user.uid,
      email: user.email ?? null,
      isAdmin: isAdmin(user.uid),
    };
  });
}

import { z } from "zod";
import { adminCookieOptions, ADMIN_SESSION_COOKIE, getAdminSession, signInAdmin } from "../adminAuth";
import { publicProcedure, router } from "../_core/trpc";

export const adminAuthRouter = router({
  session: publicProcedure.query(async ({ ctx }) => {
    const session = await getAdminSession(ctx.req);
    return session ? { authenticated: true, email: session.email } : { authenticated: false, email: null };
  }),
  login: publicProcedure
    .input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const session = await signInAdmin(input.email, input.password, ctx.req);
      ctx.res.cookie(ADMIN_SESSION_COOKIE, session.token, adminCookieOptions(ctx.req));
      return { authenticated: true, email: session.email };
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { ...adminCookieOptions(ctx.req), maxAge: -1 });
    return { success: true } as const;
  }),
});

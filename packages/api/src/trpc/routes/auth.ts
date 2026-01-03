import { getRegistrationToken as getRegistrationTokenService } from 'services/auth/getRegistrationToken';
import { loginWithGoogleCredential } from 'services/auth/googleLogin';
import { logout as logoutService } from 'services/auth/logout';
import { registerPlayer } from 'services/auth/register';
import { publicProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

export const loginGoogle = publicProcedure
  .input(
    z.object({
      credential: z.string(),
    })
  )
  .mutation(({ input }) => {
    return loginWithGoogleCredential(input.credential);
  });

export const getRegistrationToken = publicProcedure
  .input(
    z.object({
      credential: z.string(),
    })
  )
  .mutation(({ input }) => {
    return getRegistrationTokenService(input.credential);
  });

export const register = publicProcedure
  .input(
    z.object({
      registrationToken: z.string(),
      nickname: z.string().min(2).max(32),
      region: z.string().length(2).nullable(),
      arcadeName: z.string().max(64).nullable(),
    })
  )
  .mutation(({ input }) => {
    return registerPlayer(input);
  });

export const logout = publicProcedure.mutation(async ({ ctx }) => {
  if (ctx.sessionId) {
    await logoutService(ctx.sessionId);
  }
});

export const auth = router({
  loginGoogle,
  getRegistrationToken,
  register,
  logout,
});

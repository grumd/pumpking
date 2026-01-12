import { devLogin as devLoginService } from 'services/auth/devLogin';
import { getDiscordRegistrationToken, loginWithDiscordCode } from 'services/auth/discordLogin';
import { getRegistrationToken as getRegistrationTokenService } from 'services/auth/getRegistrationToken';
import { loginWithGoogleCredential } from 'services/auth/googleLogin';
import { logout as logoutService } from 'services/auth/logout';
import { registerPlayer } from 'services/auth/register';
import { devProcedure, publicProcedure, router } from 'trpc/trpc';
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

export const loginDiscord = publicProcedure
  .input(
    z.object({
      code: z.string(),
      redirectUri: z.string(),
    })
  )
  .query(({ input }) => {
    return loginWithDiscordCode(input.code, input.redirectUri);
  });

export const getDiscordRegToken = publicProcedure
  .input(
    z.object({
      code: z.string(),
      redirectUri: z.string(),
    })
  )
  .query(({ input }) => {
    return getDiscordRegistrationToken(input.code, input.redirectUri);
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

export const devLogin = devProcedure
  .input(
    z.object({
      playerId: z.number(),
    })
  )
  .mutation(({ input }) => {
    return devLoginService(input.playerId);
  });

export const auth = router({
  loginGoogle,
  loginDiscord,
  getRegistrationToken,
  getDiscordRegToken,
  register,
  logout,
  devLogin,
});

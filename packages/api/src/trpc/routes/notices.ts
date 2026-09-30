import { getUnreadNotices, markNoticesRead, NOTICE_SCOPES } from 'services/notices/notices';
import { publicProcedure, router } from 'trpc/trpc';
import { z } from 'zod';

export const notices = router({
  unread: publicProcedure.query(({ ctx }) => getUnreadNotices(ctx.user?.id)),
  markRead: publicProcedure.input(z.enum(NOTICE_SCOPES)).mutation(({ ctx, input }) => {
    if (!ctx.user) {
      throw new Error('Not logged in');
    }
    return markNoticesRead(ctx.user.id, input);
  }),
});

export function createPrismaAuthRepository(prisma) {
  return {
    findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email } });
    },

    async createUnverifiedUserWithToken({ email, passwordHash, preferredLanguage, tokenHash, expiresAt }) {
      return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { email, passwordHash, preferredLanguage },
        });
        await transaction.authActionToken.create({
          data: {
            userId: user.id,
            tokenHash,
            purpose: 'EMAIL_VERIFICATION',
            expiresAt,
          },
        });
        return user;
      });
    },

    async consumeEmailVerificationToken({ tokenHash, now }) {
      return prisma.$transaction(async (transaction) => {
        const token = await transaction.authActionToken.findUnique({ where: { tokenHash } });
        if (!token || token.purpose !== 'EMAIL_VERIFICATION' || token.consumedAt || token.expiresAt <= now) {
          return null;
        }

        const consumed = await transaction.authActionToken.updateMany({
          where: {
            id: token.id,
            purpose: 'EMAIL_VERIFICATION',
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) return null;
        return transaction.user.update({
          where: { id: token.userId },
          data: { emailVerifiedAt: now },
          select: { id: true, email: true },
        });
      });
    },

    createActionToken({ userId, purpose, tokenHash, expiresAt, createdAt = new Date() }) {
      return prisma.$transaction(async (transaction) => {
        await transaction.authActionToken.updateMany({
          where: { userId, purpose, consumedAt: null },
          data: { consumedAt: createdAt },
        });
        return transaction.authActionToken.create({
          data: { userId, purpose, tokenHash, expiresAt, createdAt },
        });
      });
    },

    createSession({ userId, tokenHash, expiresAt }) {
      return prisma.authSession.create({ data: { userId, tokenHash, expiresAt } });
    },

    updateUserPreferredLanguage({ userId, preferredLanguage }) {
      return prisma.user.update({
        where: { id: userId },
        data: { preferredLanguage },
        select: { id: true, email: true, preferredLanguage: true },
      });
    },

    findActiveSession({ tokenHash, now }) {
      return prisma.authSession.findFirst({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          user: { select: { id: true, email: true, emailVerifiedAt: true, preferredLanguage: true } },
        },
      });
    },

    async resetPasswordWithToken({ tokenHash, passwordHash, now }) {
      return prisma.$transaction(async (transaction) => {
        const token = await transaction.authActionToken.findUnique({ where: { tokenHash } });
        if (!token || token.purpose !== 'PASSWORD_RESET' || token.consumedAt || token.expiresAt <= now) {
          return null;
        }

        const consumed = await transaction.authActionToken.updateMany({
          where: {
            id: token.id,
            purpose: 'PASSWORD_RESET',
            consumedAt: null,
            expiresAt: { gt: now },
          },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) return null;
        await transaction.authActionToken.updateMany({
          where: {
            userId: token.userId,
            purpose: 'PASSWORD_RESET',
            consumedAt: null,
          },
          data: { consumedAt: now },
        });
        await transaction.user.update({
          where: { id: token.userId },
          data: { passwordHash },
        });
        await transaction.authSession.updateMany({
          where: { userId: token.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        return { userId: token.userId };
      });
    },

    revokeSession({ tokenHash, revokedAt }) {
      return prisma.authSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt },
      });
    },
  };
}

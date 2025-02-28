import { currentUser } from "@clerk/nextjs/server";
import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, eq, exists, gte, inArray, isNotNull, isNull, lt, not, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { faqs } from "@/db/schema/faqs";
import { createConversationEmbedding } from "@/lib/ai/conversationEmbedding";
import { createReply, sanitizeBody } from "@/lib/data/conversationMessage";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { mailboxProcedure } from "../../mailbox/procedure";
import { conversationProcedure } from "./procedure";

export const messagesRouter = {
  previousReplies: conversationProcedure.query(async ({ ctx }) => {
    let conversation = ctx.conversation;
    if (!conversation.embeddingText) {
      conversation = await createConversationEmbedding(conversation.id);
    }

    const similarConversations = await findSimilarConversations(
      assertDefined(conversation.embedding),
      ctx.mailbox,
      5,
      conversation.slug,
    );

    if (!similarConversations?.length) return [];

    const replies = await db.query.conversationMessages.findMany({
      where: and(
        eq(conversationMessages.role, "staff"),
        eq(conversationMessages.status, "sent"),
        isNull(conversationMessages.deletedAt),
        inArray(
          conversationMessages.conversationId,
          similarConversations.map((c) => c.id),
        ),
      ),
      orderBy: [sql`${conversationMessages.createdAt} desc`],
      limit: 10,
      with: {
        conversation: {
          columns: {
            subject: true,
          },
        },
      },
    });

    return Promise.all(
      replies.map(async (reply) => ({
        id: reply.id.toString(),
        content: await sanitizeBody(reply.body ?? ""),
        cleanedUpText: reply.cleanedUpText ?? "",
        timestamp: reply.createdAt.toISOString(),
        conversationSubject: reply.conversation.subject,
        similarity: similarConversations.find((c) => c.id === reply.conversationId)?.similarity ?? 0,
      })),
    );
  }),
  reply: conversationProcedure
    .input(
      z.object({
        message: z.string(),
        fileSlugs: z.array(z.string()),
        cc: z.array(z.string()),
        bcc: z.array(z.string()),
        shouldAutoAssign: z.boolean().optional().default(true),
        shouldClose: z.boolean().optional().default(true),
        responseToId: z.number().nullable(),
      }),
    )
    .mutation(async ({ input: { message, fileSlugs, cc, bcc, shouldAutoAssign, shouldClose, responseToId }, ctx }) => {
      const id = await createReply({
        conversationId: ctx.conversation.id,
        user: assertDefined(await currentUser()),
        message,
        fileSlugs,
        // TODO Add proper email validation on the frontend and backend using Zod,
        // similar to how the new conversation modal does it.
        cc: cc.filter(Boolean),
        bcc: bcc.filter(Boolean),
        shouldAutoAssign,
        close: shouldClose,
        responseToId,
      });
      return { id };
    }),
  setPinned: conversationProcedure
    .input(z.object({ id: z.number(), isPinned: z.boolean() }))
    .mutation(({ input, ctx }) =>
      db.transaction(async (tx) => {
        const message = await tx.query.conversationMessages.findFirst({
          where: and(
            eq(conversationMessages.conversationId, ctx.conversation.id),
            eq(conversationMessages.id, input.id),
            isNull(conversationMessages.deletedAt),
          ),
        });
        if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
        await tx
          .update(conversationMessages)
          .set({ isPinned: input.isPinned })
          .where(
            and(eq(conversationMessages.conversationId, ctx.conversation.id), eq(conversationMessages.id, input.id)),
          );
        if (input.isPinned && !message.isPinned) {
          const previousMessages = await tx.query.conversationMessages.findMany({
            where: and(
              eq(conversationMessages.conversationId, ctx.conversation.id),
              lt(conversationMessages.id, input.id),
              isNull(conversationMessages.deletedAt),
              or(notInArray(conversationMessages.status, ["discarded", "draft"]), isNull(conversationMessages.status)),
            ),
            orderBy: conversationMessages.id,
          });
          await tx.insert(faqs).values({
            mailboxId: ctx.mailbox.id,
            messageId: message.id,
            question: ctx.conversation.subject ?? "",
            reply: message.body ?? "",
            body: previousMessages.map((m) => `${m.role === "user" ? "Question" : "Answer"}: ${m.body}`).join("\n"),
          });
        }
      }),
    ),
  flagAsBad: conversationProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, reason } = input;

      const updatedMessage = await db
        .update(conversationMessages)
        .set({
          isFlaggedAsBad: true,
          reason: reason || null,
        })
        .where(
          and(
            eq(conversationMessages.id, id),
            eq(conversationMessages.conversationId, ctx.conversation.id),
            eq(conversationMessages.role, "ai_assistant"),
            isNull(conversationMessages.deletedAt),
          ),
        )
        .returning({ id: conversationMessages.id });

      if (updatedMessage.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Message not found or not part of this conversation",
        });
      }
    }),
  reactionCount: mailboxProcedure
    .input(
      z.object({
        startDate: z.date(),
        period: z.enum(["hourly", "daily", "monthly"]),
      }),
    )
    .query(async ({ input, ctx }) => {
      const groupByFormat = (() => {
        switch (input.period) {
          case "hourly":
            return "YYYY-MM-DD HH24:00:00";
          case "daily":
            return "YYYY-MM-DD";
          case "monthly":
            return "YYYY-MM";
        }
      })();

      const data = await db
        .select({
          timePeriod: sql<string>`to_char(${conversationMessages.reactionCreatedAt}, ${groupByFormat}) AS period`,
          reactionType: conversationMessages.reactionType,
          count: sql<number | string>`count(*)`,
        })
        .from(conversationMessages)
        .innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
        .where(
          and(
            gte(conversationMessages.reactionCreatedAt, input.startDate),
            isNotNull(conversationMessages.reactionType),
            isNull(conversationMessages.deletedAt),
            eq(conversations.mailboxId, ctx.mailbox.id),
          ),
        )
        .groupBy(sql`period`, conversationMessages.reactionType);

      return data.map(({ count, ...rest }) => ({
        ...rest,
        count: Number(count),
      }));
    }),
  statusByTypeCount: mailboxProcedure
    .input(
      z.object({
        startDate: z.date(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const results = await Promise.all([
        db.query.conversations
          .findMany({
            where: and(
              eq(conversations.mailboxId, ctx.mailbox.id),
              inArray(conversations.status, ["open", "escalated"]),
              gte(conversations.createdAt, input.startDate),
            ),
          })
          .then((rows) => ({ type: "open", count: rows.length })),

        db.query.conversations
          .findMany({
            where: and(
              eq(conversations.mailboxId, ctx.mailbox.id),
              eq(conversations.status, "closed"),
              gte(conversations.createdAt, input.startDate),
              exists(
                db
                  .select()
                  .from(conversationMessages)
                  .where(
                    and(
                      eq(conversationMessages.conversationId, sql`conversations.id`),
                      eq(conversationMessages.role, "ai_assistant"),
                      eq(conversationMessages.status, "sent"),
                      isNull(conversationMessages.deletedAt),
                    ),
                  ),
              ),
              not(
                exists(
                  db
                    .select()
                    .from(conversationMessages)
                    .where(
                      and(
                        eq(conversationMessages.conversationId, sql`conversations.id`),
                        eq(conversationMessages.role, "staff"),
                        isNull(conversationMessages.deletedAt),
                      ),
                    ),
                ),
              ),
            ),
          })
          .then((rows) => ({ type: "ai", count: rows.length })),

        db.query.conversations
          .findMany({
            where: and(
              eq(conversations.mailboxId, ctx.mailbox.id),
              eq(conversations.status, "closed"),
              gte(conversations.createdAt, input.startDate),
              exists(
                db
                  .select()
                  .from(conversationMessages)
                  .where(
                    and(
                      eq(conversationMessages.conversationId, sql`conversations.id`),
                      eq(conversationMessages.role, "staff"),
                      isNull(conversationMessages.deletedAt),
                    ),
                  ),
              ),
            ),
          })
          .then((rows) => ({ type: "human", count: rows.length })),
      ]);

      return results;
    }),
} satisfies TRPCRouterRecord;

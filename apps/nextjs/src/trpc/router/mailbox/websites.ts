import { TRPCRouterRecord } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { websiteCrawls, websitePages, websites } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { assertDefined } from "../../../components/utils/assert";
import { mailboxProcedure } from "./procedure";

export const websitesRouter = {
  list: mailboxProcedure.query(async ({ ctx }) => {
    const websitesList = await db.query.websites.findMany({
      where: and(eq(websites.mailboxId, ctx.mailbox.id), isNull(websites.deletedAt)),
      orderBy: [asc(websites.createdAt)],
      with: {
        crawls: {
          limit: 1,
          orderBy: desc(websiteCrawls.createdAt),
        },
      },
    });

    const websiteIds = websitesList.map((w) => w.id);

    const pageCounts =
      websiteIds.length > 0
        ? await db
            .select({
              websiteId: websitePages.websiteId,
              count: sql<number>`count(*)::int`,
            })
            .from(websitePages)
            .where(and(inArray(websitePages.websiteId, websiteIds), isNull(websitePages.deletedAt)))
            .groupBy(websitePages.websiteId)
        : [];

    return websitesList.map((website) => ({
      ...website,
      latestCrawl: website.crawls[0],
      pagesCount: pageCounts.find((c) => c.websiteId === website.id)?.count ?? 0,
    }));
  }),

  create: mailboxProcedure
    .input(
      z.object({
        name: z.string(),
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const website = await db
        .insert(websites)
        .values({
          mailboxId: ctx.mailbox.id,
          name: input.name,
          url: input.url,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      // Trigger initial crawl
      const crawl = await db
        .insert(websiteCrawls)
        .values({
          websiteId: website.id,
          name: `Initial crawl for ${website.name}`,
          status: "pending",
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      await inngest.send({
        name: "websites/crawl.create",
        data: {
          websiteId: website.id,
          crawlId: crawl.id,
        },
      });

      return website;
    }),

  delete: mailboxProcedure
    .input(
      z.object({
        websiteId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      await db
        .update(websitePages)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(websitePages.websiteId, input.websiteId));

      await db
        .update(websites)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(and(eq(websites.id, input.websiteId), eq(websites.mailboxId, ctx.mailbox.id)));

      return { success: true };
    }),

  triggerCrawl: mailboxProcedure
    .input(
      z.object({
        websiteId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const website = assertDefined(
        await db.query.websites.findFirst({
          where: and(eq(websites.id, input.websiteId), eq(websites.mailboxId, ctx.mailbox.id)),
        }),
      );

      const existingCrawl = await db.query.websiteCrawls.findFirst({
        where: and(eq(websiteCrawls.websiteId, website.id), eq(websiteCrawls.status, "loading")),
      });

      if (existingCrawl) {
        throw new Error("A crawl is already in progress");
      }

      const crawl = await db
        .insert(websiteCrawls)
        .values({
          websiteId: website.id,
          name: `Manual crawl for ${website.name}`,
          status: "pending",
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      await inngest.send({
        name: "websites/crawl.create",
        data: {
          websiteId: website.id,
          crawlId: crawl.id,
        },
      });

      return crawl;
    }),
} satisfies TRPCRouterRecord;

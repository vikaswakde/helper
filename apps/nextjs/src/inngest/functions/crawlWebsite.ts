import FirecrawlApp, { type CrawlResponse } from "@mendable/firecrawl-js";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { websiteCrawls, websites } from "@/db/schema";
import { env } from "@/env";
import { inngest } from "@/inngest/client";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

const CONCURRENCY_LIMIT = 3;
const PAGE_LIMIT = 100;
const firecrawl = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

export const crawlWebsite = async (websiteId: number, crawlId: number): Promise<void> => {
  const website = assertDefinedOrRaiseNonRetriableError(
    await db.query.websites.findFirst({
      where: eq(websites.id, websiteId),
    }),
  );

  try {
    const crawlIdentifier = crypto.randomUUID();
    const webhookUrl = new URL("/api/webhooks/firecrawl", env.AUTH_URL);
    webhookUrl.searchParams.set("identifier", crawlIdentifier);

    await db
      .update(websiteCrawls)
      .set({
        status: "pending",
        metadata: {
          crawlIdentifier,
        },
      })
      .where(eq(websiteCrawls.id, crawlId));

    firecrawl.crawlUrl(website.url, {
      limit: PAGE_LIMIT,
      scrapeOptions: {
        formats: ["markdown", "html"],
        onlyMainContent: true,
      },
      webhook: webhookUrl.toString(),
    });
  } catch (error) {
    await db
      .update(websiteCrawls)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(websiteCrawls.id, crawlId));

    throw error;
  }
};

export default inngest.createFunction(
  { id: "crawl-website", concurrency: CONCURRENCY_LIMIT, retries: 3 },
  { event: "websites/crawl.create" },
  async ({ event, step }) => {
    const { websiteId, crawlId } = event.data;

    await step.run("crawl-website", async (): Promise<void> => {
      await crawlWebsite(websiteId, crawlId);
    });

    return { success: true };
  },
);

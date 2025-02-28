import { faqsFactory } from "@tests/support/factories/faqs";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { embeddingFaq } from "@/inngest/functions/embeddingFaq";
import { generateEmbedding } from "@/lib/ai";

vi.mock("@/lib/ai", () => ({
  generateEmbedding: vi.fn(),
}));

describe("embeddingFaq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and stores embedding for a FAQ", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { faq } = await faqsFactory.create(mailbox.id, {
      question: "Test Question",
      body: "Test Body",
      reply: "Test Reply",
      embedding: null,
    });

    const mockEmbedding = Array.from({ length: 1536 }, () => 0.1);
    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);

    await embeddingFaq(faq.id);

    expect(generateEmbedding).toHaveBeenCalledWith("Test Question\nTest Body\nTest Reply", "embedding-faq", {
      skipCache: true,
    });

    const updatedFaq = await db.query.faqs.findFirst({
      where: eq(faqs.id, faq.id),
    });

    expect(updatedFaq?.embedding).toEqual(mockEmbedding);
  });

  it("throws an error if the FAQ is not found", async () => {
    await expect(embeddingFaq(999)).rejects.toThrow("Value is undefined");
  });

  it("handles errors during embedding generation", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { faq } = await faqsFactory.create(mailbox.id);

    vi.mocked(generateEmbedding).mockRejectedValue(new Error("Embedding generation failed"));

    await expect(embeddingFaq(faq.id)).rejects.toThrow("Embedding generation failed");

    const updatedFaq = await db.query.faqs.findFirst({
      where: eq(faqs.id, faq.id),
    });

    expect(updatedFaq?.embedding).toBeNull();
  });
});

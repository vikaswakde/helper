import { NonRetriableError } from "inngest";
import { inngest } from "@/inngest/client";
import { createConversationEmbedding, PromptTooLongError } from "@/lib/ai/conversationEmbedding";
import { getConversationBySlug } from "@/lib/data/conversation";

const CONCURRENCY_LIMIT = 10;

export default inngest.createFunction(
  { id: "embedding-conversation", concurrency: CONCURRENCY_LIMIT, retries: 1 },
  { event: "conversations/embedding.create" },
  async ({ event, step }) => {
    const { conversationSlug } = event.data;

    await step.run("create-embedding", async () => {
      const conversation = await getConversationBySlug(conversationSlug);
      if (!conversation) {
        throw new NonRetriableError("Conversation not found");
      }
      try {
        return await createConversationEmbedding(conversation.id);
      } catch (e) {
        if (e instanceof PromptTooLongError) return { message: e.message };
        throw e;
      }
    });

    return { success: true };
  },
);

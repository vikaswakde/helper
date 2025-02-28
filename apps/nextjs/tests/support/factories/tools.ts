import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { tools } from "@/db/schema";

type Tool = typeof tools.$inferInsert;

export const toolsFactory = {
  create: async (overrides: Partial<Omit<Tool, "mailboxId">> & { mailboxId: number }) => {
    const defaultTool: Omit<Tool, "mailboxId"> = {
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      slug: faker.helpers.slugify(faker.company.name().toLowerCase()),
      url: faker.internet.url(),
      requestMethod: "POST",
      headers: null,
      parameters: null,
      authenticationMethod: "bearer_token",
      authenticationToken: faker.string.alphanumeric(32),
    };

    const toolData = { ...defaultTool, ...overrides };

    const tool = await db.insert(tools).values(toolData).returning().then(takeUniqueOrThrow);

    return { tool };
  },
};

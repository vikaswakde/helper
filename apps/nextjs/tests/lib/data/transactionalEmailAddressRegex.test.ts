import { transactionalEmailAddressRegexesFactory } from "@tests/support/factories/transactionalEmailAddressRegexes";
import { expect, test } from "vitest";
import { matchesTransactionalEmailAddress } from "@/lib/data/transactionalEmailAddressRegex";

test("matchesTransactionalEmailAddress", async () => {
  await transactionalEmailAddressRegexesFactory.create({
    emailRegex: "noreply@.*",
  });

  expect(await matchesTransactionalEmailAddress("noreply@example.com")).toBe(true);
  expect(await matchesTransactionalEmailAddress("noreply2@example.com")).toBe(false);
  expect(await matchesTransactionalEmailAddress("bob@gmail.com")).toBe(false);
});

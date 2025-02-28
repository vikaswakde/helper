import { z } from "zod";
import { generateReadPageTool } from "@/lib/ai/readPageTool";
import { authenticateWidget } from "../utils";

const requestSchema = z.object({
  pageHTML: z.string(),
  currentURL: z.string(),
});

export async function POST(request: Request) {
  const auth = await authenticateWidget(request);
  if (!auth.success) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return Response.json({ error: "Invalid request parameters" }, { status: 400 });
  }

  const { pageHTML, currentURL } = result.data;
  const readPageTool = await generateReadPageTool(
    pageHTML,
    auth.mailbox.id,
    currentURL,
    auth.session.email ?? "anonymous",
  );

  return Response.json({ readPageTool });
}

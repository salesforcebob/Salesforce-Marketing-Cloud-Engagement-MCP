import { z } from "zod";

export const healthInputSchema = z.object({
  ping: z.string().default("pong")
});

export type HealthInput = z.infer<typeof healthInputSchema>;

export type HealthOutput = {
  ok: boolean;
  echo: string;
};

export async function healthTool(input: HealthInput): Promise<HealthOutput> {
  return { ok: true, echo: input.ping };
}




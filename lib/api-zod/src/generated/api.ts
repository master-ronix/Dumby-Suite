import * as zod from "zod";

export const HealthCheckResponse = zod.object({
  status: zod.string(),
});

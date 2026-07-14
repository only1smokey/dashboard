import { z } from "zod";

import { userRoles } from "../auth/authorization.ts";

export const adminRoleUpdateSchema = z.object({
  targetUserId: z.uuid(),
  role: z.enum(userRoles),
});

export const adminStatusUpdateSchema = z.object({
  targetUserId: z.uuid(),
  isActive: z.boolean(),
});

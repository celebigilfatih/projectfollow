import { RoleName } from "@prisma/client";

export function hasRole(roles: RoleName[] | undefined, required: RoleName | RoleName[]): boolean {
  if (!roles) return false;
  const req = Array.isArray(required) ? required : [required];
  return req.some((r) => roles.includes(r));
}

export const RBAC = {
  canManageAll(roles: RoleName[] | undefined) {
    return hasRole(roles, RoleName.Admin);
  },
  canManageOwnProjects(roles: RoleName[] | undefined) {
    return hasRole(roles, RoleName.ProjectOwner) || RBAC.canManageAll(roles);
  },
  canViewAssignedTasks(roles: RoleName[] | undefined) {
    return hasRole(roles, [RoleName.Technician, RoleName.ProjectOwner]) || RBAC.canManageAll(roles);
  },
};

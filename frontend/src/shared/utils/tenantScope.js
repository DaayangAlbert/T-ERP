export function getTenantContextId(user, tenantId) {
  if (tenantId != null && String(tenantId).trim() !== "") {
    return String(tenantId).trim();
  }

  if (user?.company_id != null && String(user.company_id).trim() !== "") {
    return String(user.company_id).trim();
  }

  return null;
}

export function canAccessTenantModules(user, tenantId) {
  if (user?.user_type !== "super_admin") {
    return true;
  }

  return Boolean(getTenantContextId(user, tenantId));
}

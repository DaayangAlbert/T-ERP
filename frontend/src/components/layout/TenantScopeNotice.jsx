import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { updateStoredTenantId } from "@/features/auth/authStorage";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTenantContextId } from "@/shared/utils/tenantScope";

export function TenantScopeNotice({ moduleLabelKey }) {
  const { t } = useTranslation();
  const { tenantId, user } = useAuth();
  const resolvedTenantId = getTenantContextId(user, tenantId);
  const [tenantInput, setTenantInput] = useState(resolvedTenantId || "");

  useEffect(() => {
    setTenantInput(resolvedTenantId || "");
  }, [resolvedTenantId]);

  const saveTenantScope = () => {
    updateStoredTenantId(tenantInput.trim() || null);
  };

  const clearTenantScope = () => {
    updateStoredTenantId(null);
  };

  return (
    <Card className="space-y-4 border-amber-200 bg-amber-50/70">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          {t("auth.scopeEyebrow")}
        </p>
        <h2 className="text-lg font-semibold text-slate-900">
          {t("auth.scopeTitle", { module: t(moduleLabelKey) })}
        </h2>
        <p className="max-w-2xl text-sm text-slate-600">
          {t("auth.scopeDescription", { module: t(moduleLabelKey) })}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_auto_auto]">
        <Input
          placeholder={t("auth.tenantPlaceholder")}
          value={tenantInput}
          onChange={(event) => setTenantInput(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={saveTenantScope}>
          {t("auth.save")}
        </Button>
        <Button type="button" variant="ghost" onClick={clearTenantScope}>
          {t("auth.clear")}
        </Button>
      </div>

      <p className="text-sm text-slate-600">{t("auth.scopeHint")}</p>
    </Card>
  );
}

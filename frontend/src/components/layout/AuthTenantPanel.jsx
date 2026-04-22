import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthTenantPanel() {
  const { t } = useTranslation();
  const storage = typeof window !== "undefined" ? sessionStorage : null;

  const [tokenInput, setTokenInput] = useState(storage?.getItem("accessToken") || "");
  const [tenantInput, setTenantInput] = useState(storage?.getItem("tenantId") || "");

  const hasToken = useMemo(() => !!storage?.getItem("accessToken"), [storage, tokenInput]);

  const save = () => {
    if (!storage) {
      return;
    }

    if (tokenInput.trim()) {
      storage.setItem("accessToken", tokenInput.trim());
    } else {
      storage.removeItem("accessToken");
    }

    if (tenantInput.trim()) {
      storage.setItem("tenantId", tenantInput.trim());
    } else {
      storage.removeItem("tenantId");
    }
  };

  const clear = () => {
    if (!storage) {
      return;
    }

    storage.removeItem("accessToken");
    storage.removeItem("tenantId");
    setTokenInput("");
    setTenantInput("");
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("auth.panelTitle")}</p>
      <Input
        placeholder={t("auth.tokenPlaceholder")}
        value={tokenInput}
        onChange={(event) => setTokenInput(event.target.value)}
      />
      <Input
        placeholder={t("auth.tenantPlaceholder")}
        value={tenantInput}
        onChange={(event) => setTenantInput(event.target.value)}
      />
      <div className="flex gap-2">
        <Button variant="outline" onClick={save} className="w-full">
          {t("auth.save")}
        </Button>
        <Button variant="ghost" onClick={clear} className="w-full">
          {t("auth.clear")}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        {hasToken ? t("auth.tokenLoaded") : t("auth.tokenMissing")}
      </p>
    </div>
  );
}

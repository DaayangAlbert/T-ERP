interface Props {
  tenantName: string;
  primaryColor: string | null;
}

export function TenantPortalFooter({ tenantName, primaryColor }: Props) {
  void primaryColor;
  return (
    <footer className="border-t border-line bg-white py-8 text-center">
      <p className="text-xs text-ink-3">
        © {new Date().getFullYear()} {tenantName} · Tous droits réservés
      </p>
      <p className="mt-1 text-[11px] text-ink-4">
        Propulsé par{" "}
        <a href="/" className="font-semibold text-primary-700 hover:underline">
          T-ERP
        </a>{" "}
        · plateforme ERP BTP Cameroun
      </p>
    </footer>
  );
}

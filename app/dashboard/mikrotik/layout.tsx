// ============================================================
// V5 FIBRA — Layout do Modulo MikroTik
// Apenas wrapper simples — a sidebar ja existe no layout do dashboard
// ============================================================

export default function MikrotikLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
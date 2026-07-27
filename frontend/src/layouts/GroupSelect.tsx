import { Select } from "antd";
import type { CSSProperties } from "react";
import { useActiveGroup } from "./groupContext";

// Seletor de obra ativa. Vive na tela Obra (ao lado do título) — não faz
// sentido na tela Consolidado, que já agrega todas as obras.
export function GroupSelect({ style }: Readonly<{ style?: CSSProperties }>) {
  const { groups, activeGroupId, setActiveGroupId, loading } = useActiveGroup();

  return (
    <Select
      value={activeGroupId ?? undefined}
      loading={loading}
      style={{ minWidth: 160, maxWidth: 240, ...style }}
      onChange={setActiveGroupId}
      popupMatchSelectWidth={false}
      options={groups.map((group) => ({
        value: group.id,
        label: group.isPersonal ? "Pessoal" : group.name,
      }))}
    />
  );
}

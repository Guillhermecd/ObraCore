import { createContext, useContext } from "react";
import type { Group } from "../api/modules/types";

export type GroupContextValue = {
  groups: Group[];
  activeGroupId: string | null;
  activeGroup: Group | null;
  loading: boolean;
  setActiveGroupId: (groupId: string) => void;
  refreshGroups: () => Promise<void>;
};

export const GroupContext = createContext<GroupContextValue | null>(null);

export function useActiveGroup() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error(
      "useActiveGroup deve ser usado dentro de um GroupProvider.",
    );
  }
  return context;
}

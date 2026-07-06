import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { activeGroupStorage } from "../api/modules/api";
import { GroupService } from "../api/modules/GroupService";
import type { Group } from "../api/modules/types";
import { GroupContext, type GroupContextValue } from "./groupContext";

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    GroupService.list()
      .then((response) => {
        setGroups(response.groups);
        setActiveGroupIdState(response.activeGroupId);
        activeGroupStorage.setGroupId(response.activeGroupId);
      })
      .finally(() => setLoading(false));
  }, []);

  const setActiveGroupId = useCallback((groupId: string) => {
    activeGroupStorage.setGroupId(groupId);
    setActiveGroupIdState(groupId);
  }, []);

  const refreshGroups = useCallback(async () => {
    const response = await GroupService.list();
    setGroups(response.groups);
    setActiveGroupIdState(response.activeGroupId);
    activeGroupStorage.setGroupId(response.activeGroupId);
  }, []);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId],
  );

  const value = useMemo<GroupContextValue>(
    () => ({
      groups,
      activeGroupId,
      activeGroup,
      loading,
      setActiveGroupId,
      refreshGroups,
    }),
    [groups, activeGroupId, activeGroup, loading, setActiveGroupId, refreshGroups],
  );

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
}

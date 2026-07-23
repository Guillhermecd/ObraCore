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
  const [error, setError] = useState<string | null>(null);

  // Sem o catch, uma falha de rede aqui deixava a lista vazia e `loading`
  // false, sem mensagem nenhuma: o app dizia "Nenhuma obra cadastrada ainda"
  // para o que era o servidor fora do ar.
  useEffect(() => {
    GroupService.list()
      .then((response) => {
        setGroups(response.groups);
        setActiveGroupIdState(response.activeGroupId);
        activeGroupStorage.setGroupId(response.activeGroupId);
        setError(null);
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível carregar suas obras.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const setActiveGroupId = useCallback((groupId: string) => {
    activeGroupStorage.setGroupId(groupId);
    setActiveGroupIdState(groupId);
  }, []);

  // Chamado sem `await` em vários lugares (ex.: GroupsPage.refreshAll), então
  // não pode rejeitar: uma rejeição solta aqui viraria unhandledRejection e o
  // usuário não veria nada. O erro vira estado, como no carregamento inicial.
  const refreshGroups = useCallback(async () => {
    try {
      const response = await GroupService.list();
      setGroups(response.groups);
      setActiveGroupIdState(response.activeGroupId);
      activeGroupStorage.setGroupId(response.activeGroupId);
      setError(null);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível recarregar suas obras.",
      );
    }
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
      error,
      setActiveGroupId,
      refreshGroups,
    }),
    [
      groups,
      activeGroupId,
      activeGroup,
      loading,
      error,
      setActiveGroupId,
      refreshGroups,
    ],
  );

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
}

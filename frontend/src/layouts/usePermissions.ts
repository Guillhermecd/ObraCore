import { useActiveGroup } from "./groupContext";
import { permissionsFor } from "../utils/roles";

/**
 * Permissões do usuário na obra ativa. Enquanto a lista de obras carrega,
 * `activeGroup` é null e caímos em FISCAL — o estado restritivo é o certo para
 * o intervalo: é melhor o botão aparecer um instante depois do que aparecer e
 * o clique voltar 403.
 */
export function usePermissions() {
  const { activeGroup } = useActiveGroup();
  return { role: activeGroup?.myRole ?? null, ...permissionsFor(activeGroup?.myRole) };
}

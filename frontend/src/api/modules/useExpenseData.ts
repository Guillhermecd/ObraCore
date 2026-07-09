import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExpenseCategoryService } from "./ExpenseCategoryService";
import { ExpenseService } from "./ExpenseService";
import { ExpenseSourceService } from "./ExpenseSourceService";
import type { Expense, ExpenseCategory, ExpenseSource } from "./types";
import { getErrorMessage } from "../../utils/errors";

/**
 * Carrega categorias, fontes e lançamentos do grupo ativo — o mesmo
 * `Promise.all` das três services + os mapas por id que tanto o Dashboard
 * quanto o Controle precisam. `onError` recebe a mensagem já resolvida (via
 * `getErrorMessage`) sempre que o carregamento falhar; passe algo como
 * `(message) => messageApi.error(message)`. Chame `reload()` para forçar uma
 * nova busca (ex.: depois de criar/editar/excluir um lançamento).
 *
 * `setCategories`/`setSources` são expostos porque `ExpenseFormModal` atualiza
 * essas listas localmente (sem round-trip) quando uma categoria/fonte nova é
 * criada "sob demanda" no próprio formulário.
 */
export function useExpenseData(
  activeGroupId: string | null,
  onError: (message: string) => void,
) {
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [sources, setSources] = useState<ExpenseSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!activeGroupId) {
      return;
    }

    Promise.all([
      ExpenseCategoryService.list(),
      ExpenseSourceService.list(),
      ExpenseService.list(),
    ])
      .then(([categoriesResponse, sourcesResponse, expensesResponse]) => {
        setCategories(categoriesResponse.categories);
        setSources(sourcesResponse.sources);
        setExpenses(expensesResponse.expenses);
      })
      .catch((error: unknown) => {
        onErrorRef.current(getErrorMessage(error, "Erro ao carregar dados."));
      })
      .finally(() => setLoading(false));
  }, [activeGroupId, reloadKey]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const sourceMap = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    categories,
    sources,
    expenses,
    categoryMap,
    sourceMap,
    loading,
    reload,
    setCategories,
    setSources,
  };
}

import { FilterFilled, SearchOutlined } from "@ant-design/icons";
import { Button, DatePicker, Input, InputNumber, Space } from "antd";
import type { FilterDropdownProps } from "antd/es/table/interface";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

/**
 * Filtros de coluna reutilizáveis para as tabelas. O Ant Design já resolve
 * filtro por lista de valores (`filters` + `onFilter`); o que falta, e está
 * aqui, são os três tipos que ele não traz pronto: busca por texto livre,
 * intervalo de datas e faixa numérica.
 *
 * Todos guardam a seleção em UMA chave de filtro (string), porque é o que o
 * `filteredValue` controlado da tabela transporta — os intervalos vão
 * serializados como `"inicio|fim"`.
 */

const RANGE_SEPARATOR = "|";

/** Ícone que fica aceso quando a coluna tem filtro ativo. */
export function filterIcon(filtered: boolean) {
  return <FilterFilled style={{ color: filtered ? "#F97316" : undefined }} />;
}

export function searchIcon(filtered: boolean) {
  return <SearchOutlined style={{ color: filtered ? "#F97316" : undefined }} />;
}

/**
 * Moldura comum dos dropdowns: o campo, mais Filtrar/Limpar. Função simples,
 * chamada diretamente — não um componente — para este arquivo continuar sendo
 * só de utilitários.
 */
function dropdownShell({
  children,
  onApply,
  onClear,
}: {
  children: React.ReactNode;
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    // stopPropagation no teclado: sem isso, digitar dentro do dropdown dispara
    // os atalhos de navegação da tabela.
    <div style={{ padding: 8 }} onKeyDown={(event) => event.stopPropagation()}>
      {/* Os dois blocos precisam ser `block`: `Space` renderiza inline-flex, e
          sem o wrapper os botões sobem para o lado do campo. */}
      <div>{children}</div>
      <Space style={{ marginTop: 8, display: "flex" }}>
        <Button type="primary" size="small" onClick={onApply}>
          Filtrar
        </Button>
        <Button size="small" onClick={onClear}>
          Limpar
        </Button>
      </Space>
    </div>
  );
}

/** Comparação sem acento e sem caixa — "sao" encontra "São". */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Busca por texto livre. Use em colunas cujo conteúdo é digitado pelo usuário
 * (fornecedor), onde uma lista de valores distintos cresceria sem limite.
 */
export function textFilter(placeholder: string) {
  return {
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) =>
      dropdownShell({
        onApply: () => confirm(),
        onClear: () => {
          clearFilters?.();
          confirm();
        },
        children: (
          <>
            <Input
              autoFocus
              allowClear
              placeholder={placeholder}
              value={selectedKeys[0] as string}
              onChange={(event) =>
                setSelectedKeys(event.target.value ? [event.target.value] : [])
              }
              onPressEnter={() => confirm()}
              style={{ width: 200, display: "block" }}
            />
          </>
        ),
      }),
    filterIcon: searchIcon,
  };
}

/** `true` quando `value` (texto do filtro) aparece em `target`. */
export function matchesText(target: string | null, value: React.Key | boolean) {
  if (!target) {
    return false;
  }
  return normalize(target).includes(normalize(String(value)));
}

/** Intervalo de datas, inclusive nos dois extremos. */
export function dateRangeFilter() {
  return {
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) => {
      const [from, to] = String(selectedKeys[0] ?? "").split(RANGE_SEPARATOR);
      return dropdownShell({
        onApply: () => confirm(),
        onClear: () => {
          clearFilters?.();
          confirm();
        },
        children: (
          <>
            <RangePicker
              autoFocus
              value={from && to ? [dayjs(from), dayjs(to)] : null}
              onChange={(values) =>
                setSelectedKeys(
                  values && values[0] && values[1]
                    ? [
                        `${values[0].format("YYYY-MM-DD")}${RANGE_SEPARATOR}${values[1].format("YYYY-MM-DD")}`,
                      ]
                    : [],
                )
              }
              format="DD/MM/YYYY"
              placeholder={["Início", "Fim"]}
            />
          </>
        ),
      });
    },
    filterIcon,
  };
}

export function matchesDateRange(
  target: string | null,
  value: React.Key | boolean,
) {
  if (!target) {
    return false;
  }
  const [from, to] = String(value).split(RANGE_SEPARATOR);
  const day = String(target).slice(0, 10);
  return day >= from && day <= to;
}

/** Faixa numérica; qualquer um dos dois extremos pode ficar vazio. */
export function numberRangeFilter() {
  return {
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: FilterDropdownProps) => {
      const [min, max] = String(selectedKeys[0] ?? "").split(RANGE_SEPARATOR);
      const apply = (nextMin: string, nextMax: string) =>
        setSelectedKeys(
          nextMin || nextMax ? [`${nextMin}${RANGE_SEPARATOR}${nextMax}`] : [],
        );

      return dropdownShell({
        onApply: () => confirm(),
        onClear: () => {
          clearFilters?.();
          confirm();
        },
        children: (
          <>
            <Space direction="vertical" size={8}>
              <InputNumber
                autoFocus
                placeholder="Mínimo"
                value={min ? Number(min) : null}
                onChange={(next) =>
                  apply(next == null ? "" : String(next), max ?? "")
                }
                style={{ width: 160 }}
                min={0}
                decimalSeparator=","
                prefix="R$"
              />
              <InputNumber
                placeholder="Máximo"
                value={max ? Number(max) : null}
                onChange={(next) =>
                  apply(min ?? "", next == null ? "" : String(next))
                }
                style={{ width: 160 }}
                min={0}
                decimalSeparator=","
                prefix="R$"
              />
            </Space>
          </>
        ),
      });
    },
    filterIcon,
  };
}

export function matchesNumberRange(target: number, value: React.Key | boolean) {
  const [min, max] = String(value).split(RANGE_SEPARATOR);
  if (min && target < Number(min)) {
    return false;
  }
  return !(max && target > Number(max));
}

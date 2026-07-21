import {
  createContext,
  useContext,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

// Fallback estático (avaliado no import, sem acesso a contexto React).
// PrivateLayout.tsx usa o nome da marca ativa como valor inicial real;
// isto só serve de valor de segurança caso algo importe este módulo
// isoladamente antes do branding estar disponível.
export const defaultPrivateMobileHeaderContent = "OAKSD";

type PrivateMobileHeaderContextValue = {
  setMobileHeaderContent: Dispatch<SetStateAction<ReactNode>>;
  resetMobileHeaderContent: () => void;
};

export const PrivateMobileHeaderContext =
  createContext<PrivateMobileHeaderContextValue | null>(null);

export function usePrivateMobileHeader(content: ReactNode) {
  const context = useContext(PrivateMobileHeaderContext);

  useEffect(() => {
    context?.setMobileHeaderContent(content);

    return () => {
      context?.resetMobileHeaderContent();
    };
  }, [content, context]);
}

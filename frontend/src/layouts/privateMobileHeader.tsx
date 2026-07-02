import {
  createContext,
  useContext,
  useEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export const defaultPrivateMobileHeaderContent = "BIMD";

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

import { Button, Card, Result } from "antd";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthService } from "../../api/modules/AuthService";
import { authStorage } from "../../api/modules/api";
import { authPageStyle, authPanelStyle } from "../../components/layout";
import { getErrorMessage } from "../../utils/errors";

type Status = "loading" | "success" | "error";

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const verifiedTokenRef = useRef<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Validando e-mail..." : "Token de validação não informado.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    if (verifiedTokenRef.current === token) {
      return;
    }

    verifiedTokenRef.current = token;

    AuthService.verifyEmail(token)
      .then((response) => {
        const authToken = authStorage.getToken();
        if (authToken) {
          authStorage.setSession(authToken, response.user);
        }
        setStatus("success");
        setMessage(response.message || "E-mail validado com sucesso.");
        setCountdown(5);
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(getErrorMessage(error, "Não foi possível validar o e-mail."));
      });
  }, [token]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          navigate("/profile", { replace: true });
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [navigate, status]);

  return (
    <main style={authPageStyle}>
      <Card style={authPanelStyle}>
        <Result
          status={status === "loading" ? "info" : status}
          title={message}
          subTitle={
            status === "success"
              ? `Você será redirecionado para o perfil em ${countdown}s.`
              : undefined
          }
          extra={
            <Link to={status === "success" ? "/profile" : "/login"}>
              <Button type="primary">
                {status === "success" ? "Ir para perfil" : "Ir para login"}
              </Button>
            </Link>
          }
        />
      </Card>
    </main>
  );
}

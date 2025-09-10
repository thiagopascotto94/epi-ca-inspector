
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthService } from "../authService";
import { useAuth } from "../contexts/AuthContext";
import { useDialog } from "../hooks/useDialog";
import { PromptDialog } from "../components/PromptDialog";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const { dialogState, prompt } = useDialog();

  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);
      // Optional: clear the state so the message doesn't reappear on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (error: any) {
      setError("Falha no login. Verifique seu e-mail e senha.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/dashboard");
    } catch (error: any) {
      setError("Falha no login com o Google.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setSuccess("");
    const email = await prompt("Por favor, digite seu e-mail para redefinir a senha:");
    if (email) {
      try {
        await AuthService.requestPasswordReset(email);
        setSuccess("Se o e-mail estiver correto, uma mensagem de redefinição de senha será enviada para " + email);
      } catch (error) {
        setError("Falha ao enviar e-mail de redefinição de senha. Verifique o e-mail digitado.");
        console.error(error);
      }
    }
  };

  return (
    <>
      {dialogState && (
        <PromptDialog
          isOpen={dialogState.isOpen}
          message={dialogState.message}
          onConfirm={dialogState.onConfirm}
          onCancel={dialogState.onCancel}
        />
      )}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">Faça login na sua conta</h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                  placeholder="Endereço de e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Senha</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-sky-500 focus:border-sky-500 focus:z-10 sm:text-sm"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{success}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-sky-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Ou continue com</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.8 0-5.18-1.89-6.03-4.43H2.39v2.84C4.26 20.98 7.89 23 12 23z" />
                  <path d="M5.97 14.25c-.21-.66-.33-1.35-.33-2.05s.12-1.39.33-2.05V7.31H2.39c-.78 1.53-1.24 3.25-1.24 5.14s.46 3.61 1.24 5.14l3.58-2.85z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.89 1 4.26 3.02 2.39 6.16l3.58 2.84c.85-2.54 3.23-4.43 6.03-4.43z" />
                </svg>
                Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

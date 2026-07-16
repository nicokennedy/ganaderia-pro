import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      console.error(err);
      setError("No pudimos procesar la solicitud. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6 space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🐄</div>
          <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Te enviaremos un enlace para crear una contraseña nueva.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-700">
              Si <strong>{email}</strong> está registrado, vas a recibir un correo con las instrucciones.
            </p>
            <Link to="/login" className="inline-block text-primary font-semibold hover:underline">
              Volver a ingresar
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar enlace"}
            </Button>

            <p className="text-center text-sm">
              <Link to="/login" className="text-primary font-semibold hover:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

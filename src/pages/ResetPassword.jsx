import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password, confirmation);
      setComplete(true);
    } catch (err) {
      console.error(err);
      setError("El enlace es inválido o venció. Solicitá uno nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6 space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🐄</div>
          <h1 className="text-2xl font-bold">Crear nueva contraseña</h1>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-500">El enlace no es válido.</p>
            <Link to="/forgot-password" className="text-primary font-semibold hover:underline">
              Solicitar otro enlace
            </Link>
          </div>
        ) : complete ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-700">Tu contraseña fue actualizada correctamente.</p>
            <Button asChild className="w-full">
              <Link to="/login">Ingresar</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div>
              <Label>Confirmar contraseña</Label>
              <Input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

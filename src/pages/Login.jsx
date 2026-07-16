import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.login(email, password);
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setError("Email o contraseña incorrectos. Revisá tus datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🐄</div>
          <h1 className="text-2xl font-bold">Ingresar a Ganadería Pro</h1>
          <p className="text-sm text-muted-foreground">Accedé a tu finca</p>
        </div>

        <div>
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <Label>Contraseña</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>

        <p className="text-center text-sm">
          ¿No tenés cuenta?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Crear cuenta
          </Link>
        </p>

        <p className="text-center text-sm">
          <Link to="/forgot-password" className="text-primary font-semibold hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>
    </div>
  );
}

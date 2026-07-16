import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validación local antes de llamar a la API
    if (password.length < 8) {
      setErrors({ password: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }

    setLoading(true);
    try {
      // Rails crea el usuario y vincula cualquier invitación pendiente. Si no
      // tiene una invitación, el onboarding le permitirá crear su finca.
      await authService.register({
        full_name: fullName,
        email,
        password,
        password_confirmation: password,
      });

      toast.success("Cuenta creada correctamente.");
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("email")) {
        setErrors({ email: "Este email ya está registrado." });
      } else {
        setErrors({ general: "No pudimos crear la cuenta. Intentá de nuevo." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSignup} className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-6 space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">🐄</div>
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">Empezá a usar Ganadería Pro</p>
        </div>

        <div>
          <Label>Nombre completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>

        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={errors.email ? "border-red-400" : ""}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <Label>Contraseña</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={errors.password ? "border-red-400" : ""}
          />
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{errors.password}</p>
          )}
        </div>

        {errors.general && (
          <p className="text-sm text-red-500 text-center">{errors.general}</p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </Button>

        <p className="text-center text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Ingresar
          </Link>
        </p>
      </form>
    </div>
  );
}

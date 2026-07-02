import { useState } from "react";
import { potreroService } from "@/services/potreroService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const TIPOS = ["Pastura", "Verdeo", "Corral", "Descanso", "Otro"];
const ESTADOS = ["Disponible", "Ocupado", "En descanso", "Mantenimiento"];
const UNIDADES = ["ha", "m2"];

function initialForm(potrero) {
  if (!potrero) {
    return {
      nombre: "",
      numero: "",
      superficie: "",
      unidad_superficie: "ha",
      tipo: "Pastura",
      estado: "Disponible",
      capacidad_estimada: "",
      notas: "",
      activo: "true",
    };
  }

  return {
    nombre: potrero.nombre || "",
    numero: potrero.numero || "",
    superficie: potrero.superficie ?? potrero.hectareas ?? potrero.area ?? "",
    unidad_superficie: potrero.unidad_superficie || "ha",
    tipo: potrero.tipo || "Pastura",
    estado: potrero.estado || "Disponible",
    capacidad_estimada: potrero.capacidad_estimada ?? potrero.capacidad_animales ?? potrero.capacidad ?? "",
    notas: potrero.notas || "",
    activo: potrero.activo === false ? "false" : "true",
  };
}

export default function PotreroModal({ potrero, onClose, onSave }) {
  const [form, setForm] = useState(initialForm(potrero));
  const [loading, setLoading] = useState(false);
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!form.nombre) return;
    setLoading(true);

    try {
      const data = {
        nombre: form.nombre,
        numero: form.numero || null,
        superficie: form.superficie !== "" && form.superficie != null ? Number(form.superficie) : null,
        unidad_superficie: form.unidad_superficie,
        tipo: form.tipo,
        estado: form.estado,
        capacidad_estimada: form.capacidad_estimada !== "" && form.capacidad_estimada != null ? Number(form.capacidad_estimada) : null,
        notas: form.notas || null,
        activo: form.activo === "true",
      };

      if (potrero?.id) {
        await potreroService.update(potrero.id, data);
      } else {
        await potreroService.create(data);
      }

      onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg text-foreground">{potrero ? "Editar potrero" : "Nuevo potrero"}</h2>
            <p className="text-sm text-muted-foreground">Datos base del perfil del potrero.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Potrero Norte" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Código o número</Label>
              <Input value={form.numero} onChange={(e) => set("numero", e.target.value)} placeholder="Ej: P-01" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Superficie</Label>
              <Input type="number" min="0" step="0.01" value={form.superficie} onChange={(e) => set("superficie", e.target.value)} placeholder="4.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Unidad</Label>
              <Select value={form.unidad_superficie} onValueChange={(v) => set("unidad_superficie", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Capacidad estimada</Label>
              <Input type="number" min="0" value={form.capacidad_estimada} onChange={(e) => set("capacidad_estimada", e.target.value)} placeholder="50" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Activo</Label>
              <Select value={form.activo} onValueChange={(v) => set("activo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Observaciones / notas</Label>
            <Textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} placeholder="Observaciones del potrero..." />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !form.nombre} className="flex-1">
            {loading ? "Guardando..." : "Guardar potrero"}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { animalService } from "@/services/animalService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

const RAZAS = ["Holstein", "Jersey", "Brown Swiss", "Montbeliarde", "Mestiza", "Otra"];
const ESTADOS = ["Ordeño", "Seca", "Preparto", "Ternera", "Vacona", "Toro", "Enfermería", "Vendida", "Muerta"];
const ESTADOS_REPRO = ["Abierta", "En celo", "Inseminada", "Pendiente chequeo", "Preñada positiva", "Negativa", "Dudosa", "Aborto"];

export default function AnimalModal({ animal, animales = [], onClose, onSave }) {
  const [form, setForm] = useState(animal ? {
    ...animal,
    raza: animal.raza || "Holstein",
    sexo: animal.sexo || "Hembra",
    estado: animal.estado || "Ordeño",
    tipo_toro: animal.tipo_toro || "",
    estado_reproductivo: animal.estado_reproductivo || "Abierta",
  } : {
nombre: "",
numero_id: "",
arete: "",
numero_registro: "",
raza: "Holstein",
fecha_nacimiento: "",
sexo: "Hembra",
estado: "Ordeño",
tipo_toro: "",
estado_reproductivo: "Abierta",
grupo: "",
peso_kg: "",
produccion_am: "",
produccion_pm: "",
produccion_diaria_litros: "",
racion_balanceado_kg: "",
costo_balanceado_kg: "",
precio_leche_litro: "",
racion_actual: "",
notas: "",
padre_nombre: "",
padre_id: "",
madre_nombre: "",
madre_id: "",
  });
  const [loading, setLoading] = useState(false);

 
const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

const animalesDisponibles = animales.filter(a => a.id !== animal?.id);

const seleccionarPadre = (animalPadreId) => {
  const seleccionado = animalesDisponibles.find(a => a.id === animalPadreId);

  setForm(f => ({
    ...f,
    padre_id: seleccionado?.numero_id || seleccionado?.id || "",
    padre_nombre: seleccionado?.nombre || "",
  }));
};

const seleccionarMadre = (animalMadreId) => {
  const seleccionado = animalesDisponibles.find(a => a.id === animalMadreId);

  setForm(f => ({
    ...f,
    madre_id: seleccionado?.numero_id || seleccionado?.id || "",
    madre_nombre: seleccionado?.nombre || "",
  }));
};

const handleSave = async () => {

    if (!form.nombre) return;
    setLoading(true);
    const am = form.produccion_am ? Number(form.produccion_am) : undefined;
    const pm = form.produccion_pm ? Number(form.produccion_pm) : undefined;
    const data = {
      ...form,
      fecha_proxima_cria_override: form.fecha_proxima_cria || null,
      peso_kg: form.peso_kg ? Number(form.peso_kg) : undefined,
      produccion_am: am,
      produccion_pm: pm,
      produccion_diaria_litros:
        (am || 0) + (pm || 0) ||
        (form.produccion_diaria_litros
          ? Number(form.produccion_diaria_litros)
          : undefined),
      racion_balanceado_kg: form.racion_balanceado_kg ? Number(form.racion_balanceado_kg) : undefined,
      costo_balanceado_kg: form.costo_balanceado_kg ? Number(form.costo_balanceado_kg) : undefined,
      precio_leche_litro: form.precio_leche_litro ? Number(form.precio_leche_litro) : undefined,
    };
      
      let result;

     if (animal?.id) {
        result = await animalService.update(animal.id, data);
       
      } else {
        result = await animalService.create(data);
        
      }

      setLoading(false);

    onSave(result);
};

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-bold text-lg text-foreground">{animal ? "Editar Animal" : "Nuevo Animal"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
{/* Identificación */}
<p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Identificación</p>

<div className="grid grid-cols-2 gap-3">
  <div>
    <Label className="text-xs font-semibold mb-1.5 block">Nombre *</Label>
    <Input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: Estrella" />
  </div>
  <div>
    <Label className="text-xs font-semibold mb-1.5 block">ID oficial</Label>
    <Input value={form.numero_id} onChange={e => set("numero_id", e.target.value)} placeholder="EC-0001" />
  </div>
</div>

<div className="grid grid-cols-2 gap-3">
  <div>
    <Label className="text-xs font-semibold mb-1.5 block">Arete</Label>
    <Input value={form.arete || ""} onChange={e => set("arete", e.target.value)} placeholder="Ej: 152" />
  </div>
  <div>
    <Label className="text-xs font-semibold mb-1.5 block">Número de Registro</Label>
    <Input value={form.numero_registro || ""} onChange={e => set("numero_registro", e.target.value)} placeholder="Ej: HOL-987654" />
  </div>
</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Raza</Label>
              <Select value={form.raza} onValueChange={v => set("raza", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RAZAS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Sexo</Label>
              <Select value={form.sexo} onValueChange={v => set("sexo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                  <SelectItem value="Macho">Macho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Fecha Nacimiento</Label>
              <Input type="date" value={form.fecha_nacimiento || ""} onChange={e => set("fecha_nacimiento", e.target.value)} />
            </div>
          </div>

          {/* Estado */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2">Estado</p>
          <div className="grid grid-cols-2 gap-3">

<div>
  <Label className="text-xs font-semibold mb-1.5 block">
    Estado productivo
  </Label>

  <Select value={form.estado} onValueChange={v => set("estado", v)}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>

    <SelectContent>
      {ESTADOS.map(e => (
        <SelectItem key={e} value={e}>
          {e}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

<div>
  {form.estado === "Toro" ? (
    <>
      <Label className="text-xs font-semibold mb-1.5 block">
        Tipo de Toro
      </Label>

      <Select
        value={form.tipo_toro || ""}
        onValueChange={v => set("tipo_toro", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar tipo" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="en_explotacion">
            En explotación
          </SelectItem>

          <SelectItem value="solo_genetica">
            Solo genética (IA)
          </SelectItem>
        </SelectContent>
      </Select>
    </>
  ) : (
    <>
      <Label className="text-xs font-semibold mb-1.5 block">
        Estado reproductivo
      </Label>

      <Select
        value={form.estado_reproductivo}
        onValueChange={v => set("estado_reproductivo", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          {ESTADOS_REPRO.map(e => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )}
</div>


          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Grupo / Lote</Label>
              <Input value={form.grupo || ""} onChange={e => set("grupo", e.target.value)} placeholder="Ej: Lote Alto" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Peso (kg)</Label>
              <Input type="number" value={form.peso_kg || ""} onChange={e => set("peso_kg", e.target.value)} placeholder="450" />
            </div>
          </div>

          {/* Producción */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2">Producción</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Litros AM</Label>
              <Input type="number" step="0.1" value={form.produccion_am || ""} onChange={e => set("produccion_am", e.target.value)} placeholder="12.5" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Litros PM</Label>
              <Input type="number" step="0.1" value={form.produccion_pm || ""} onChange={e => set("produccion_pm", e.target.value)} placeholder="10.5" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Ración actual</Label>
            <Input value={form.racion_actual || ""} onChange={e => set("racion_actual", e.target.value)} placeholder="Ej: Balanceado 5kg + pasto" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Balanceado kg/día</Label>
              <Input type="number" step="0.1" value={form.racion_balanceado_kg || ""} onChange={e => set("racion_balanceado_kg", e.target.value)} placeholder="5" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Costo/kg</Label>
              <Input type="number" step="0.01" value={form.costo_balanceado_kg || ""} onChange={e => set("costo_balanceado_kg", e.target.value)} placeholder="0.35" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Precio leche/L</Label>
              <Input type="number" step="0.01" value={form.precio_leche_litro || ""} onChange={e => set("precio_leche_litro", e.target.value)} placeholder="0.45" />
            </div>
          </div>

          {/* Reproducción */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide pt-2">Reproducción</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Último Parto</Label>
              <Input type="date" value={form.fecha_ultimo_parto || ""} onChange={e => set("fecha_ultimo_parto", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Próx. Parto estimado</Label>
              <Input type="date" value={form.fecha_proxima_cria || ""} onChange={e => set("fecha_proxima_cria", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Fecha Secado estimado</Label>
              <Input type="date" value={form.fecha_secado || ""} onChange={e => set("fecha_secado", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Retiro leche hasta</Label>
              <Input type="date" value={form.retiro_leche_hasta || ""} onChange={e => set("retiro_leche_hasta", e.target.value)} />
            </div>
          </div>

         {/* Pedigree */}

<div className="grid grid-cols-2 gap-3">
  <div>
    <Label className="text-xs font-semibold mb-1.5 block">Padre</Label>
    <Select
      value={animalesDisponibles.find(a =>
        a.numero_id === form.padre_id ||
        a.id === form.padre_id ||
        a.nombre === form.padre_nombre
      )?.id || ""}
      onValueChange={seleccionarPadre}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleccionar padre" />
      </SelectTrigger>
      <SelectContent>
        {animalesDisponibles.map(a => (
          <SelectItem key={a.id} value={a.id}>
            {a.nombre} {a.numero_id ? `(${a.numero_id})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label className="text-xs font-semibold mb-1.5 block">ID Padre</Label>
    <Input value={form.padre_id || ""} readOnly />
  </div>

  <div>
    <Label className="text-xs font-semibold mb-1.5 block">Madre</Label>
    <Select
      value={animalesDisponibles.find(a =>
        a.numero_id === form.madre_id ||
        a.id === form.madre_id ||
        a.nombre === form.madre_nombre
      )?.id || ""}
      onValueChange={seleccionarMadre}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleccionar madre" />
      </SelectTrigger>
      <SelectContent>
        {animalesDisponibles.map(a => (
          <SelectItem key={a.id} value={a.id}>
            {a.nombre} {a.numero_id ? `(${a.numero_id})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label className="text-xs font-semibold mb-1.5 block">ID Madre</Label>
    <Input value={form.madre_id || ""} readOnly />
  </div>
</div>

<div>
  <Label className="text-xs font-semibold mb-1.5 block">Notas</Label>
  <Input
    value={form.notas || ""}
    onChange={e => set("notas", e.target.value)}
    placeholder="Observaciones..."
  />
</div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !form.nombre} className="flex-1 bg-primary text-primary-foreground">
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

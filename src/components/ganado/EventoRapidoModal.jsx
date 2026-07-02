import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eventoService, EVENTOS_QUERY_KEY } from "@/services/eventoService";
import { inventarioIAService, INVENTARIO_IA_QUERY_KEY } from "@/services/inventarioIAService";
import {
  inventarioMedicinaService,
  INVENTARIO_MEDICINA_QUERY_KEY,
} from "@/services/inventarioMedicinaService";
import { ANIMALS_QUERY_KEY } from "@/services/animalService";
import { getCurrentFinca } from "@/lib/current-finca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

const ACCIONES = [
  { key: "parto", label: "Registrar Parto", emoji: "🐣", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { key: "inseminacion", label: "Inseminación", emoji: "🧬", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { key: "celo", label: "Celo detectado", emoji: "💕", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { key: "chequeo", label: "Chequeo veterinario", emoji: "🩺", color: "bg-green-50 border-green-200 text-green-700" },
  { key: "tratamiento", label: "Tratamiento", emoji: "💊", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { key: "vacuna", label: "Vacuna", emoji: "💉", color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
  { key: "enfermedad", label: "Enfermedad", emoji: "🤒", color: "bg-red-50 border-red-200 text-red-700" },
  { key: "grupo", label: "Cambio de Grupo", emoji: "👥", color: "bg-gray-50 border-gray-200 text-gray-700" },
];

export default function EventoRapidoModal({ animal, onClose, onSave }) {
  const [accion, setAccion] = useState(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    inventario_ia_id: "",
    inventario_medicina_id: "",
    medicina_cantidad_usada: "",
    agregar_cria: false,
    sexo_cria: "Hembra",
    nombre_cria: "",
    peso_cria: "",
    cria_nombre: "",
    cria_arete: "",
    cria_numero_id: "",
    cria_numero_registro: "",
    cria_sexo: "Hembra",
    cria_fecha_nacimiento: new Date().toISOString().split("T")[0],
    veterinario: "",
    medicamento: "",
    dosis: "",
    requiere_retiro_leche: false,
    dias_retiro: "",
    resultado: "",
    grupo_nuevo: "",
    notas: "",
  });

  const [loading, setLoading] = useState(false);
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }));
  const setFecha = (value) => {
    setForm((previous) => ({
      ...previous,
      fecha: value,
      cria_fecha_nacimiento:
        !previous.cria_fecha_nacimiento || previous.cria_fecha_nacimiento === previous.fecha
          ? value
          : previous.cria_fecha_nacimiento,
    }));
  };
  const setAgregarCria = (value) => {
    setForm((previous) => ({
      ...previous,
      agregar_cria: value,
      cria_nombre: value && !previous.cria_nombre ? previous.nombre_cria : previous.cria_nombre,
      cria_sexo: value ? previous.sexo_cria || previous.cria_sexo : previous.cria_sexo,
      cria_fecha_nacimiento: previous.cria_fecha_nacimiento || previous.fecha,
    }));
  };
  const queryClient = useQueryClient();

  const { data: fincaData } = useQuery({
    queryKey: ["current-finca"],
    queryFn: getCurrentFinca,
  });

  const fincaId = fincaData?.finca?.id;

  const { data: inventarioIA = [] } = useQuery({
    queryKey: [...INVENTARIO_IA_QUERY_KEY, "disponible"],
    enabled: !!fincaId,
    queryFn: () => inventarioIAService.list({ disponibles: true }),
  });

  const { data: inventarioMedicinas = [] } = useQuery({
    queryKey: [...INVENTARIO_MEDICINA_QUERY_KEY, "activos"],
    enabled: !!fincaId,
    queryFn: () => inventarioMedicinaService.list({ activos: true }),
  });

  const pajuelasDisponibles = inventarioIA.filter(
    (item) => Number(item.stock_actual || 0) > 0
  );

  // El <Select> devuelve siempre strings y los ids de Rails son números:
  // se compara con coerción a string para que la selección matchee.
  const pajuelaSeleccionada = pajuelasDisponibles.find(
    (item) => String(item.id) === String(form.inventario_ia_id)
  );

  const medicinasActivas = inventarioMedicinas.filter((item) => item.activo !== false);
  const medicinaSeleccionada = medicinasActivas.find(
    (item) => String(item.id) === String(form.inventario_medicina_id)
  );
  const cantidadMedicinaUsada = form.medicina_cantidad_usada === "" && medicinaSeleccionada
    ? 1
    : Number(form.medicina_cantidad_usada || 0);

  const handleMedicinaChange = (value) => {
    const item = medicinasActivas.find((medicina) => String(medicina.id) === String(value));

    setForm((previous) => ({
      ...previous,
      inventario_medicina_id: value === "__ninguna__" ? "" : value,
      medicamento: item?.nombre || previous.medicamento,
      medicina_cantidad_usada: item && previous.medicina_cantidad_usada === "" ? "1" : previous.medicina_cantidad_usada,
    }));
  };

  const handleSave = async () => {
    const debeAgregarCria = accion === "parto" && form.agregar_cria === true;
    const criaNombre = form.cria_nombre || form.nombre_cria;
    const criaSexo = form.cria_sexo || form.sexo_cria;
    const criaFechaNacimiento = form.cria_fecha_nacimiento || form.fecha;

    // Validación de UX; el backend también valida y descuenta el stock de forma atómica.
    if (accion === "inseminacion" && !pajuelaSeleccionada) {
      toast.error("Seleccioná una pajuela disponible");
      return;
    }

    if (debeAgregarCria && !criaNombre && !form.cria_arete) {
      toast.error("Ingresá al menos nombre o arete de la cría");
      return;
    }

    if ((accion === "tratamiento" || accion === "vacuna") && medicinaSeleccionada) {
      const stockDisponible = Number(medicinaSeleccionada.stock_actual || 0);

      if (!animal?.id) {
        toast.error("Para consumir inventario, seleccioná un animal.");
        return;
      }

      if (cantidadMedicinaUsada <= 0) {
        toast.error("Ingresá una cantidad utilizada mayor a 0");
        return;
      }

      if (cantidadMedicinaUsada > stockDisponible) {
        toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
        return;
      }
    }

    setLoading(true);

    // Solo se envía el evento. La lógica de negocio (descuento de stock IA,
    // numeración de inseminaciones, fechas reproductivas, retiro de leche,
    // cambios de estado del animal) vive en el backend. Nunca se envía finca_id.
    const eventoData = {
      fecha: form.fecha,
      animal_id: animal.id,
      animal_nombre: animal.nombre,
      notas: form.notas || null,
    };

    if (accion === "parto") {
      Object.assign(eventoData, {
        tipo: "Parto",
        sexo_cria: debeAgregarCria ? criaSexo : form.sexo_cria,
        nombre_cria: debeAgregarCria ? criaNombre : form.nombre_cria,
        peso_cria: form.peso_cria ? Number(form.peso_cria) : null,
        crear_cria: debeAgregarCria,
        agregar_cria: debeAgregarCria,
        cria: debeAgregarCria
          ? {
              nombre: criaNombre || null,
              arete: form.cria_arete || null,
              numero_id: form.cria_numero_id || null,
              numero_registro: form.cria_numero_registro || null,
              sexo: criaSexo,
              fecha_nacimiento: criaFechaNacimiento,
            }
          : null,
        cria_nombre: debeAgregarCria ? criaNombre || null : null,
        cria_arete: debeAgregarCria ? form.cria_arete || null : null,
        cria_numero_id: debeAgregarCria ? form.cria_numero_id || null : null,
        cria_numero_registro: debeAgregarCria ? form.cria_numero_registro || null : null,
        cria_sexo: debeAgregarCria ? criaSexo : null,
        cria_fecha_nacimiento: debeAgregarCria ? criaFechaNacimiento : null,
      });
    } else if (accion === "inseminacion") {
      Object.assign(eventoData, {
        tipo: "Inseminacion",
        veterinario: form.veterinario || null,
        inventario_ia_id: pajuelaSeleccionada.id,
      });
    } else if (accion === "celo") {
      Object.assign(eventoData, { tipo: "Celo" });
    } else if (accion === "chequeo") {
      Object.assign(eventoData, {
        tipo: "Chequeo veterinario",
        veterinario: form.veterinario || null,
        resultado: form.resultado || null,
      });
    } else if (accion === "tratamiento") {
      Object.assign(eventoData, {
        tipo: "Tratamiento",
        medicamento: form.medicamento || null,
        dosis: form.dosis || null,
        veterinario: form.veterinario || null,
        inventario_medicina_id: medicinaSeleccionada?.id || null,
        medicina_nombre: medicinaSeleccionada?.nombre || null,
        medicina_tipo: medicinaSeleccionada?.tipo || null,
        medicina_lote: medicinaSeleccionada?.lote || null,
        medicina_unidad_medida: medicinaSeleccionada?.unidad_medida || null,
        medicina_cantidad_usada: medicinaSeleccionada ? cantidadMedicinaUsada : null,
        requiere_retiro_leche: form.requiere_retiro_leche,
        dias_retiro: form.dias_retiro ? Number(form.dias_retiro) : 0,
      });
    } else if (accion === "vacuna") {
      Object.assign(eventoData, {
        tipo: "Vacuna",
        medicamento: form.medicamento || null,
        veterinario: form.veterinario || null,
        inventario_medicina_id: medicinaSeleccionada?.id || null,
        medicina_nombre: medicinaSeleccionada?.nombre || null,
        medicina_tipo: medicinaSeleccionada?.tipo || null,
        medicina_lote: medicinaSeleccionada?.lote || null,
        medicina_unidad_medida: medicinaSeleccionada?.unidad_medida || null,
        medicina_cantidad_usada: medicinaSeleccionada ? cantidadMedicinaUsada : null,
      });
    } else if (accion === "enfermedad") {
      Object.assign(eventoData, {
        tipo: "Enfermedad",
        descripcion: form.notas || null,
      });
    } else if (accion === "grupo") {
      Object.assign(eventoData, {
        tipo: "Cambio de grupo",
        grupo_nuevo: form.grupo_nuevo || null,
      });
    }

    try {
      console.log("EVENTO DATA ENVIADO", eventoData);
      await eventoService.create(eventoData);
      queryClient.invalidateQueries({ queryKey: EVENTOS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ANIMALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: INVENTARIO_IA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: INVENTARIO_MEDICINA_QUERY_KEY });
      toast.success(
        debeAgregarCria
          ? "Parto registrado y cría agregada al inventario"
          : "Evento registrado correctamente"
      );
      onSave();
    } catch (error) {
      toast.error(error.message || "Error al registrar el evento");
      setLoading(false);
    }
  };

  if (!accion) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border w-full max-w-md">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="font-bold text-lg text-foreground">Nuevo Registro</h2>
              <p className="text-xs text-muted-foreground">
                {animal.nombre} · {animal.numero_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-secondary rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-2 gap-2">
            {ACCIONES.map(({ key, label, emoji, color }) => (
              <button
                key={key}
                onClick={() => setAccion(key)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${color}`}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const accionInfo = ACCIONES.find((a) => a.key === accion);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg text-foreground">
              {accionInfo?.label}
            </h2>
            <p className="text-xs text-muted-foreground">
              {animal.nombre} · {animal.numero_id}
            </p>
          </div>
          <button
            onClick={() => setAccion(null)}
            className="p-1.5 hover:bg-secondary rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Fecha</Label>
            <Input
              type="date"
              value={form.fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          {accion === "parto" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Sexo de la cría
                  </Label>
                  <Select
                    value={form.sexo_cria}
                    onValueChange={(v) => set("sexo_cria", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hembra">Hembra</SelectItem>
                      <SelectItem value="Macho">Macho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Peso cría (kg)
                  </Label>
                  <Input
                    type="number"
                    value={form.peso_cria}
                    onChange={(e) => set("peso_cria", e.target.value)}
                    placeholder="35"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1.5 block">
                  Nombre de la cría
                </Label>
                <Input
                  value={form.nombre_cria}
                  onChange={(e) => set("nombre_cria", e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <div>
                  <Label className="text-xs font-semibold mb-2 block">
                    ¿Agregar cría al inventario de ganado?
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAgregarCria(true)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        form.agregar_cria
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgregarCria(false)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                        !form.agregar_cria
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {form.agregar_cria && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block">
                          Nombre
                        </Label>
                        <Input
                          value={form.cria_nombre}
                          onChange={(e) => set("cria_nombre", e.target.value)}
                          placeholder="Nombre"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block">
                          Arete
                        </Label>
                        <Input
                          value={form.cria_arete}
                          onChange={(e) => set("cria_arete", e.target.value)}
                          placeholder="Arete"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block">
                          ID oficial
                        </Label>
                        <Input
                          value={form.cria_numero_id}
                          onChange={(e) => set("cria_numero_id", e.target.value)}
                          placeholder="ID oficial"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block">
                          Número de registro
                        </Label>
                        <Input
                          value={form.cria_numero_registro}
                          onChange={(e) => set("cria_numero_registro", e.target.value)}
                          placeholder="Registro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block">
                          Sexo
                        </Label>
                        <Select
                          value={form.cria_sexo}
                          onValueChange={(v) => set("cria_sexo", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hembra">Hembra</SelectItem>
                            <SelectItem value="Macho">Macho</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1.5 block">
                          Fecha de nacimiento
                        </Label>
                        <Input
                          type="date"
                          value={form.cria_fecha_nacimiento}
                          onChange={(e) => set("cria_fecha_nacimiento", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {(accion === "inseminacion" ||
            accion === "chequeo" ||
            accion === "tratamiento" ||
            accion === "vacuna") && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">
                Veterinario
              </Label>
              <Input
                value={form.veterinario}
                onChange={(e) => set("veterinario", e.target.value)}
                placeholder="Nombre del veterinario"
              />
            </div>
          )}

          {accion === "inseminacion" && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">
                Pajuela disponible
              </Label>

              <Select
                value={form.inventario_ia_id}
                onValueChange={(value) => set("inventario_ia_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar pajuela" />
                </SelectTrigger>

                <SelectContent>
                  {pajuelasDisponibles.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.toro_nombre || "Toro sin nombre"} · Stock{" "}
                      {item.stock_actual}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {pajuelaSeleccionada && (
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                  <p>
                    <span className="font-semibold">Toro:</span>{" "}
                    {pajuelaSeleccionada.toro_nombre || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Proveedor:</span>{" "}
                    {pajuelaSeleccionada.proveedor || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Tipo:</span>{" "}
                    {pajuelaSeleccionada.sexada ? "Sexada" : "Convencional"}
                  </p>
                  <p>
                    <span className="font-semibold">Canastilla:</span>{" "}
                    {pajuelaSeleccionada.canastilla || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Stock actual:</span>{" "}
                    {pajuelaSeleccionada.stock_actual ?? 0}
                  </p>
                </div>
              )}
            </div>
          )}

          {accion === "chequeo" && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">
                Resultado
              </Label>
              <Select
                value={form.resultado || "Pendiente chequeo"}
                onValueChange={(v) => set("resultado", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Preñada positiva", "Negativa", "Dudosa", "Pendiente chequeo"].map(
                    (r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {(accion === "tratamiento" || accion === "vacuna") && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">
                  Producto de inventario
                </Label>
                <Select
                  value={form.inventario_medicina_id || "__ninguna__"}
                  onValueChange={handleMedicinaChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar medicina o vacuna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ninguna__">Sin producto de inventario</SelectItem>
                    {medicinasActivas.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.nombre} · {item.tipo} · Stock {item.stock_actual ?? 0} {item.unidad_medida || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {medicinaSeleccionada && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1">
                    <p><span className="font-semibold">Stock disponible:</span> {medicinaSeleccionada.stock_actual ?? 0} {medicinaSeleccionada.unidad_medida || ""}</p>
                    <p><span className="font-semibold">Tipo:</span> {medicinaSeleccionada.tipo}</p>
                    {medicinaSeleccionada.lote && <p><span className="font-semibold">Lote:</span> {medicinaSeleccionada.lote}</p>}
                  </div>
                )}
              </div>

              {medicinaSeleccionada && (
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Cantidad utilizada
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.medicina_cantidad_usada}
                    onChange={(e) => set("medicina_cantidad_usada", e.target.value)}
                    placeholder="1"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Medicamento / Vacuna
                  </Label>
                  <Input
                    value={form.medicamento}
                    onChange={(e) => set("medicamento", e.target.value)}
                    placeholder="Ej: Ivermectina"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Dosis
                  </Label>
                  <Input
                    value={form.dosis}
                    onChange={(e) => set("dosis", e.target.value)}
                    placeholder="5ml"
                  />
                </div>
              </div>
            </div>
          )}

          {accion === "tratamiento" && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiere_retiro_leche}
                  onChange={(e) => set("requiere_retiro_leche", e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm font-semibold text-foreground">
                  Requiere retiro de leche
                </span>
              </label>

              {form.requiere_retiro_leche && (
                <div className="mt-2">
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Días de retiro
                  </Label>
                  <Input
                    type="number"
                    value={form.dias_retiro}
                    onChange={(e) => set("dias_retiro", e.target.value)}
                    placeholder="7"
                  />
                </div>
              )}
            </div>
          )}

          {accion === "grupo" && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">
                Nuevo Grupo
              </Label>
              <Input
                value={form.grupo_nuevo}
                onChange={(e) => set("grupo_nuevo", e.target.value)}
                placeholder="Ej: Lote Alto"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Notas</Label>
            <Input
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setAccion(null)}
            className="flex-1"
          >
            Atrás
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-primary text-primary-foreground"
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

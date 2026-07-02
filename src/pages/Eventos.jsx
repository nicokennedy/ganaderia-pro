import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eventoService, EVENTOS_QUERY_KEY, eventosQueryKey } from "@/services/eventoService";
import { animalService, ANIMALS_QUERY_KEY } from "@/services/animalService";
import { inventarioIAService, INVENTARIO_IA_QUERY_KEY } from "@/services/inventarioIAService";
import {
  inventarioMedicinaService,
  INVENTARIO_MEDICINA_QUERY_KEY,
} from "@/services/inventarioMedicinaService";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getCurrentFinca } from "@/lib/current-finca";

const TIPOS = ["Produccion", "Parto", "Muerte", "Venta", "Enfermedad", "Tratamiento", "Inseminacion", "Celo", "Chequeo veterinario", "Vacuna", "Diagnóstico", "Secado", "Revisión", "Destete", "Cambio de grupo", "Otro"];

const TIPO_EMOJIS = {
  Produccion: "🥛", Parto: "🐣", Muerte: "💀", Venta: "💰",
  Enfermedad: "🤒", Tratamiento: "💊", Inseminacion: "🧬",
  Celo: "💕", "Chequeo veterinario": "🩺", Vacuna: "💉",
  "Diagnóstico": "🩺", Secado: "🚫", "Revisión": "🔎",
  Destete: "🍼", "Cambio de grupo": "👥", Otro: "📋"
};

export default function Eventos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [modo, setModo] = useState("individual");
  const [busquedaAnimales, setBusquedaAnimales] = useState("");
  const [animalIdsSeleccionados, setAnimalIdsSeleccionados] = useState([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [form, setForm] = useState({
    tipo: "Produccion", animal_nombre: "", fecha: new Date().toISOString().split('T')[0],
    valor_litros: "", valor_usd: "", descripcion: "", veterinario: "",
    medicamento: "", dosis: "", notas: "",
    requiere_retiro_leche: false, dias_retiro: "",
    sexo_cria: "Hembra", nombre_cria: "", peso_cria: "",
    resultado: "", grupo_nuevo: "", inventario_ia_id: "",
    inventario_medicina_id: "", medicina_cantidad_usada: "",
  });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const { data: fincaData } = useQuery({
    queryKey: ['current-finca'],
    queryFn: getCurrentFinca,
  });

  const fincaId = fincaData?.finca?.id;

  const { data: animales = [] } = useQuery({
    queryKey: ANIMALS_QUERY_KEY,
    enabled: !!fincaId,
    queryFn: animalService.list,
  });

  const { data: eventos = [] } = useQuery({
    queryKey: eventosQueryKey({ limit: 50 }),
    enabled: !!fincaId,
    queryFn: () => eventoService.list({ limit: 50 }),
  });

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

  const animalSeleccionado = animales.find(a => a.nombre === form.animal_nombre);
  const pajuelasDisponibles = inventarioIA.filter((item) => Number(item.stock_actual || 0) > 0);
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
  const animalesVisibles = animales.filter((animal) => {
    const query = busquedaAnimales.trim().toLowerCase();
    if (!query) return true;

    return (
      animal.nombre?.toLowerCase().includes(query) ||
      animal.arete?.toLowerCase().includes(query) ||
      animal.numero_id?.toLowerCase().includes(query)
    );
  });
  const animalesSeleccionados = animales.filter((animal) => animalIdsSeleccionados.includes(animal.id));
  const selectedCount = animalIdsSeleccionados.length;
  const consumoTotalMedicina = medicinaSeleccionada ? cantidadMedicinaUsada * selectedCount : 0;

  const handleMedicinaChange = (value) => {
    const item = medicinasActivas.find((medicina) => String(medicina.id) === String(value));

    setForm((previous) => ({
      ...previous,
      inventario_medicina_id: value === "__ninguna__" ? "" : value,
      medicamento: item?.nombre || previous.medicamento,
      medicina_cantidad_usada: item && previous.medicina_cantidad_usada === "" ? "1" : previous.medicina_cantidad_usada,
    }));
  };

  const toggleAnimal = (animalId) => {
    setAnimalIdsSeleccionados((prev) =>
      prev.includes(animalId)
        ? prev.filter((id) => id !== animalId)
        : [...prev, animalId]
    );
  };

  const seleccionarVisibles = () => {
    setAnimalIdsSeleccionados((prev) => Array.from(new Set([...prev, ...animalesVisibles.map((animal) => animal.id)])));
  };

  const deseleccionarTodos = () => {
    setAnimalIdsSeleccionados([]);
  };

  const buildEventoData = (animal = animalSeleccionado) => ({
    tipo: form.tipo,
    animal_nombre: animal?.nombre || form.animal_nombre || null,
    animal_id: animal?.id || null,
    fecha: form.fecha,
    notas: form.notas || null,
    descripcion: form.descripcion || null,
    valor_litros: form.valor_litros ? Number(form.valor_litros) : null,
    valor_usd: form.valor_usd ? Number(form.valor_usd) : null,
    veterinario: form.veterinario || null,
    medicamento: form.medicamento || null,
    dosis: form.dosis || null,
    inventario_medicina_id: (form.tipo === "Tratamiento" || form.tipo === "Vacuna") && medicinaSeleccionada ? medicinaSeleccionada.id : null,
    medicina_nombre: (form.tipo === "Tratamiento" || form.tipo === "Vacuna") && medicinaSeleccionada ? medicinaSeleccionada.nombre : null,
    medicina_tipo: (form.tipo === "Tratamiento" || form.tipo === "Vacuna") && medicinaSeleccionada ? medicinaSeleccionada.tipo : null,
    medicina_lote: (form.tipo === "Tratamiento" || form.tipo === "Vacuna") && medicinaSeleccionada ? medicinaSeleccionada.lote : null,
    medicina_unidad_medida: (form.tipo === "Tratamiento" || form.tipo === "Vacuna") && medicinaSeleccionada ? medicinaSeleccionada.unidad_medida : null,
    medicina_cantidad_usada: (form.tipo === "Tratamiento" || form.tipo === "Vacuna") && medicinaSeleccionada ? cantidadMedicinaUsada : null,
    sexo_cria: form.tipo === "Parto" ? form.sexo_cria : null,
    nombre_cria: form.tipo === "Parto" ? form.nombre_cria : null,
    peso_cria: form.tipo === "Parto" && form.peso_cria ? Number(form.peso_cria) : null,
    requiere_retiro_leche: form.tipo === "Tratamiento" ? form.requiere_retiro_leche : false,
    dias_retiro: form.tipo === "Tratamiento" && form.dias_retiro ? Number(form.dias_retiro) : 0,
    resultado: form.tipo === "Chequeo veterinario" || form.tipo === "Diagnóstico" || form.tipo === "Revisión" ? form.resultado : null,
    grupo_nuevo: form.tipo === "Cambio de grupo" ? form.grupo_nuevo : null,
    inventario_ia_id: form.tipo === "Inseminacion" ? pajuelaSeleccionada?.id : null,
  });

  const invalidateEventoCaches = () => {
    queryClient.invalidateQueries({ queryKey: EVENTOS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ANIMALS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: INVENTARIO_IA_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: INVENTARIO_MEDICINA_QUERY_KEY });
  };

  const validateEvento = ({ requireAnimal }) => {
    if (form.tipo === "Inseminacion" && !pajuelaSeleccionada) {
      toast.error("Seleccioná una pajuela disponible");
      return false;
    }

    if (form.tipo === "Inseminacion" && modo === "masivo") {
      const stockDisponible = Number(pajuelaSeleccionada?.stock_actual || 0);
      if (stockDisponible < selectedCount) {
        toast.error(`Stock insuficiente de pajuelas. Disponible: ${stockDisponible}`);
        return false;
      }
    }

    if ((form.tipo === "Tratamiento" || form.tipo === "Vacuna") && medicinaSeleccionada) {
      const stockDisponible = Number(medicinaSeleccionada.stock_actual || 0);

      if (requireAnimal && !animalSeleccionado) {
        toast.error("Para consumir inventario, seleccioná un animal.");
        return false;
      }

      if (cantidadMedicinaUsada <= 0) {
        toast.error("Ingresá una cantidad utilizada mayor a 0");
        return false;
      }

      const consumo = modo === "masivo" ? consumoTotalMedicina : cantidadMedicinaUsada;
      if (consumo > stockDisponible) {
        toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateEvento({ requireAnimal: true })) return;

    setLoading(true);

    // Toda la lógica de negocio (actualización del animal, fechas reproductivas,
    // retiro de leche, etc.) vive ahora en el backend. El frontend solo envía
    // el evento; nunca envía finca_id.
    const eventoData = buildEventoData();

    try {
      await eventoService.create(eventoData);
      setSuccess(true);
      toast.success("Evento registrado correctamente");
      setForm(f => ({ ...f, animal_nombre: "", valor_litros: "", valor_usd: "", descripcion: "", notas: "" }));
      invalidateEventoCaches();
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      toast.error(error.message || "Error al registrar el evento");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPreview = () => {
    if (selectedCount === 0) {
      toast.error("Seleccioná al menos un animal");
      return;
    }

    if (!validateEvento({ requireAnimal: false })) return;

    setShowBulkConfirm(true);
  };

  const handleBulkConfirm = async () => {
    if (!validateEvento({ requireAnimal: false })) return;

    setLoading(true);
    try {
      const result = await eventoService.bulkCreate({
        animal_ids: animalIdsSeleccionados,
        evento: buildEventoData(null),
      });

      invalidateEventoCaches();
      toast.success(`Se registraron correctamente ${result.count || selectedCount} eventos.`);
      setShowBulkConfirm(false);
      setAnimalIdsSeleccionados([]);
    } catch (error) {
      toast.error(error.message || "Error al registrar eventos masivos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registrar Evento</h1>
          <p className="text-muted-foreground text-sm">Registro rápido de actividades</p>
        </div>
      </div>

      <div className="inline-flex rounded-md border border-border bg-secondary/40 p-1">
        <button
          type="button"
          onClick={() => setModo("individual")}
          className={`px-4 py-2 text-sm font-semibold rounded-sm transition-colors ${
            modo === "individual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Registro individual
        </button>
        <button
          type="button"
          onClick={() => setModo("masivo")}
          className={`px-4 py-2 text-sm font-semibold rounded-sm transition-colors ${
            modo === "masivo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Registro Masivo
        </button>
      </div>

      {modo === "masivo" && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Animales</Label>
              <p className="text-sm font-semibold text-foreground">{selectedCount} animales seleccionados</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={seleccionarVisibles}>
                Seleccionar todos los visibles
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={deseleccionarTodos}>
                Deseleccionar todos
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busquedaAnimales}
              onChange={(e) => setBusquedaAnimales(e.target.value)}
              placeholder="Buscar por nombre, arete o ID..."
              className="pl-9"
            />
          </div>

          <div className="max-h-72 overflow-auto rounded-lg border border-border divide-y divide-border">
            {animalesVisibles.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No hay animales que coincidan con la búsqueda.
              </p>
            ) : (
              animalesVisibles.map((animal) => (
                <label
                  key={animal.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={animalIdsSeleccionados.includes(animal.id)}
                    onChange={() => toggleAnimal(animal.id)}
                    className="rounded border-border"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{animal.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {animal.numero_id ? `ID ${animal.numero_id}` : "Sin ID"}
                      {animal.arete ? ` · Arete ${animal.arete}` : ""}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tipo selector */}
      <div className="bg-card rounded-xl border border-border p-5">
        <Label className="text-xs font-semibold mb-3 block">Tipo de Evento</Label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {TIPOS.map(tipo => (
            <button key={tipo} onClick={() => set("tipo", tipo)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${form.tipo === tipo ? 'border-primary bg-accent' : 'border-border hover:border-primary/30 hover:bg-secondary/50'}`}>
              <span className="text-2xl">{TIPO_EMOJIS[tipo]}</span>
              <span className="text-xs font-semibold text-foreground leading-tight">{tipo}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className={`grid ${modo === "individual" ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Fecha</Label>
            <Input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
          </div>
          {modo === "individual" && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Animal (opcional)</Label>
              <Select value={form.animal_nombre || "__ninguno__"} onValueChange={v => set("animal_nombre", v === "__ninguno__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ninguno__">General (sin animal)</SelectItem>
                  {animales.filter(a => a.nombre).map(a => (
                    <SelectItem key={a.id} value={a.nombre}>{a.nombre} {a.numero_id ? `(${a.numero_id})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {form.tipo === "Produccion" && (
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Total de Litros</Label>
            <div className="relative">
              <Input type="number" className="pr-12 text-lg font-semibold" value={form.valor_litros} onChange={e => set("valor_litros", e.target.value)} placeholder="2000" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">L</span>
            </div>
          </div>
        )}

        {form.tipo === "Venta" && (
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Valor (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input type="number" className="pl-7 text-lg font-semibold" value={form.valor_usd} onChange={e => set("valor_usd", e.target.value)} placeholder="0.00" />
            </div>
          </div>
        )}

        {form.tipo === "Parto" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Sexo de la cría</Label>
                <Select value={form.sexo_cria} onValueChange={v => set("sexo_cria", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hembra">Hembra</SelectItem>
                    <SelectItem value="Macho">Macho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Peso cría (kg)</Label>
                <Input type="number" value={form.peso_cria} onChange={e => set("peso_cria", e.target.value)} placeholder="35" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Nombre de la cría</Label>
              <Input value={form.nombre_cria} onChange={e => set("nombre_cria", e.target.value)} placeholder="Opcional" />
            </div>
          </div>
        )}

        {form.tipo === "Inseminacion" && (
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Pajuela disponible</Label>
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
                    {item.toro_nombre || "Toro sin nombre"} · Stock {item.stock_actual}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {pajuelasDisponibles.length === 0 && (
              <p className="mt-2 text-xs text-red-600">
                No hay pajuelas disponibles con stock.
              </p>
            )}

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

        {(form.tipo === "Tratamiento" || form.tipo === "Enfermedad" || form.tipo === "Vacuna" || form.tipo === "Chequeo veterinario" || form.tipo === "Diagnóstico" || form.tipo === "Revisión") && (
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Veterinario</Label>
            <Input value={form.veterinario} onChange={e => set("veterinario", e.target.value)} placeholder="Nombre del veterinario" />
          </div>
        )}

        {(form.tipo === "Tratamiento" || form.tipo === "Vacuna") && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Producto de inventario</Label>
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
                <Label className="text-xs font-semibold mb-1.5 block">Cantidad utilizada</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.medicina_cantidad_usada}
                  onChange={e => set("medicina_cantidad_usada", e.target.value)}
                  placeholder="1"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Medicamento / Vacuna</Label>
                <Input value={form.medicamento} onChange={e => set("medicamento", e.target.value)} placeholder="Ej: Ivermectina" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Dosis</Label>
                <Input value={form.dosis} onChange={e => set("dosis", e.target.value)} placeholder="5ml" />
              </div>
            </div>
          </div>
        )}

        {form.tipo === "Tratamiento" && (
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" checked={form.requiere_retiro_leche} onChange={e => set("requiere_retiro_leche", e.target.checked)} className="rounded border-border" />
              <span className="text-sm font-semibold">Requiere retiro de leche</span>
            </label>
            {form.requiere_retiro_leche && (
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Días de retiro</Label>
                <Input type="number" value={form.dias_retiro} onChange={e => set("dias_retiro", e.target.value)} placeholder="7" />
              </div>
            )}
          </div>
        )}

        {(form.tipo === "Chequeo veterinario" || form.tipo === "Diagnóstico" || form.tipo === "Revisión") && (
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Resultado</Label>
            <Select value={form.resultado || "Pendiente chequeo"} onValueChange={v => set("resultado", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Preñada positiva", "Negativa", "Dudosa", "Pendiente chequeo"].map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {form.tipo === "Cambio de grupo" && (
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Nuevo Grupo</Label>
            <Input value={form.grupo_nuevo} onChange={e => set("grupo_nuevo", e.target.value)} placeholder="Ej: Lote Alto" />
          </div>
        )}

        <div>
          <Label className="text-xs font-semibold mb-1.5 block">Descripción / Notas</Label>
          <Input value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Observaciones adicionales..." />
        </div>
      </div>

      <Button onClick={modo === "masivo" ? handleBulkPreview : handleSave} disabled={loading}
        className={`w-full h-14 text-base font-bold transition-all ${success ? 'bg-green-500 hover:bg-green-600' : 'bg-primary hover:bg-primary/90'} text-white`}>
        {loading
          ? "Guardando..."
          : success
            ? "✅ Evento registrado"
            : modo === "masivo"
              ? `Revisar registro masivo`
              : `Registrar ${form.tipo}`}
      </Button>

      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-md border border-border overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-semibold">Confirmar registro masivo</h2>
              <p className="text-sm text-muted-foreground">
                Se creará un evento por cada animal seleccionado.
              </p>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Evento</span>
                <span className="font-semibold text-right">{form.tipo}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Animales</span>
                <span className="font-semibold">{selectedCount}</span>
              </div>
              {medicinaSeleccionada && (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Medicamento</span>
                    <span className="font-semibold text-right">{medicinaSeleccionada.nombre}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Cantidad por animal</span>
                    <span className="font-semibold">{cantidadMedicinaUsada}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Consumo total</span>
                    <span className="font-semibold">{consumoTotalMedicina}</span>
                  </div>
                </>
              )}
              {form.tipo === "Inseminacion" && pajuelaSeleccionada && (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Pajuela</span>
                    <span className="font-semibold text-right">{pajuelaSeleccionada.toro_nombre || "Toro sin nombre"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Consumo total</span>
                    <span className="font-semibold">{selectedCount}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBulkConfirm(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleBulkConfirm}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Events */}
      {eventos.length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Eventos Recientes</h3>
          </div>
          <div className="divide-y divide-border">
            {eventos.slice(0, 10).map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{TIPO_EMOJIS[ev.tipo] || '📋'}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{ev.tipo}: {ev.animal_nombre || ev.descripcion || "General"}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(ev.fecha)}</p>
                </div>
                {ev.valor_litros > 0 && <span className="text-xs font-bold text-primary">{ev.valor_litros}L</span>}
                {ev.valor_usd > 0 && <span className="text-xs font-bold text-green-600">${ev.valor_usd}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

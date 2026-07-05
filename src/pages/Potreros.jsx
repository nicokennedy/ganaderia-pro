import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POTREROS_QUERY_KEY, potreroService } from "@/services/potreroService";
import {
  POTRERO_TRABAJOS_QUERY_KEY,
  potreroTrabajoService,
} from "@/services/potreroTrabajoService";
import {
  POTRERO_ROTACIONES_QUERY_KEY,
  potreroRotacionService,
} from "@/services/potreroRotacionService";
import { AlertTriangle, ArrowLeft, Edit, Eye, MapPin, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PotreroModal from "@/components/potreros/PotreroModal";

const ESTADOS = ["Disponible", "Ocupado", "En descanso", "Mantenimiento"];
const TABS = ["General", "Trabajos", "Rotación"];
const TIPOS_TRABAJO = ["Subsolado", "Corte de igualación", "Siembra", "Fertilización", "Otro"];

const estadoClasses = {
  Disponible: "bg-green-50 text-green-700 border-green-200",
  Ocupado: "bg-blue-50 text-blue-700 border-blue-200",
  "En descanso": "bg-amber-50 text-amber-700 border-amber-200",
  Mantenimiento: "bg-red-50 text-red-700 border-red-200",
};

function superficiePotrero(potrero) {
  return Number(potrero.superficie ?? potrero.hectareas ?? potrero.area ?? 0);
}

function unidadPotrero(potrero) {
  return potrero.unidad_superficie || (potrero.hectareas != null ? "ha" : "ha");
}

function capacidadPotrero(potrero) {
  return potrero.capacidad_estimada ?? potrero.capacidad_animales ?? potrero.capacidad ?? null;
}

function superficieEnHectareas(potrero) {
  const superficie = superficiePotrero(potrero);
  return unidadPotrero(potrero) === "m2" ? superficie / 10000 : superficie;
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDays(fecha, days) {
  if (!fecha || !days) return null;
  const date = new Date(`${fecha}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().split("T")[0];
}

function diffDays(fecha) {
  const target = new Date(`${fecha}T12:00:00`);
  const today = new Date(`${todayStr()}T12:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function trabajoInicial() {
  return {
    tipo: "Subsolado",
    fecha: todayStr(),
    descripcion: "",
    notas: "",
    costo: "",
    responsable: "",
    proveedor: "",
    tipo_pasto: "",
    dias_reingreso: "",
    moneda: "UYU",
  };
}

function rotacionInicial() {
  return {
    fecha_entrada: todayStr(),
    fecha_salida: "",
    cantidad_animales: "",
    grupo: "",
    notas: "",
  };
}

function daysSince(fecha) {
  if (!fecha) return null;
  const start = new Date(`${fecha}T12:00:00`);
  const today = new Date(`${todayStr()}T12:00:00`);
  return Math.max(Math.ceil((today - start) / 86400000), 0);
}

function average(values) {
  const valid = values.filter((value) => value !== null && value !== undefined && value !== "");
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
}

function rotacionSummary(rotaciones = []) {
  const ordered = [...rotaciones].sort((a, b) => String(b.fecha_entrada || "").localeCompare(String(a.fecha_entrada || "")));
  const activa = ordered.find((rotacion) => !rotacion.fecha_salida);
  const ultimaEntrada = ordered[0]?.fecha_entrada || null;
  const ultimaSalida = ordered.find((rotacion) => rotacion.fecha_salida)?.fecha_salida || null;
  const promedioOcupacion = average(ordered.map((rotacion) => rotacion.dias_ocupacion));
  const promedioRotacion = average(ordered.map((rotacion) => rotacion.dias_rotacion));

  return {
    activa,
    ultimaEntrada,
    ultimaSalida,
    promedioOcupacion,
    promedioRotacion,
    diasOcupacionActual: activa ? daysSince(activa.fecha_entrada) : null,
    cantidadAnimalesActual: activa?.cantidad_animales ?? null,
  };
}

export default function Potreros() {
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [tab, setTab] = useState("General");
  const [trabajoForm, setTrabajoForm] = useState(trabajoInicial());
  const [guardandoTrabajo, setGuardandoTrabajo] = useState(false);
  const [rotacionForm, setRotacionForm] = useState(rotacionInicial());
  const [guardandoRotacion, setGuardandoRotacion] = useState(false);
  const [salidasRotacion, setSalidasRotacion] = useState({});
  const queryClient = useQueryClient();

  const { data: potreros = [], isLoading } = useQuery({
    queryKey: POTREROS_QUERY_KEY,
    queryFn: potreroService.list,
  });

  const { data: trabajos = [], isLoading: isLoadingTrabajos } = useQuery({
    queryKey: [...POTRERO_TRABAJOS_QUERY_KEY, detalle?.id],
    enabled: !!detalle?.id,
    queryFn: () => potreroTrabajoService.listByPotrero(detalle.id),
  });

  const { data: rotaciones = [], isLoading: isLoadingRotaciones } = useQuery({
    queryKey: [...POTRERO_ROTACIONES_QUERY_KEY, detalle?.id],
    enabled: !!detalle?.id,
    queryFn: () => potreroRotacionService.listByPotrero(detalle.id),
  });

  const { data: todasRotaciones = [] } = useQuery({
    queryKey: [...POTRERO_ROTACIONES_QUERY_KEY, "comparativa"],
    queryFn: () => potreroRotacionService.list(),
  });

  useEffect(() => {
    const openPotrero = (potreroId) => {
      const potrero = potreros.find((item) => String(item.id) === String(potreroId));
      if (potrero) {
        setDetalle(potrero);
        setTab("General");
        window.sessionStorage.removeItem("globalSearchPotreroId");
      }
    };

    const pendingPotreroId = window.sessionStorage.getItem("globalSearchPotreroId");
    if (pendingPotreroId) openPotrero(pendingPotreroId);

    const handleGlobalSearchOpen = (event) => openPotrero(event.detail?.potreroId);
    window.addEventListener("open-potrero-detail", handleGlobalSearchOpen);
    return () => window.removeEventListener("open-potrero-detail", handleGlobalSearchOpen);
  }, [potreros]);

  const activos = potreros.filter((potrero) => potrero.activo !== false);
  const superficieTotal = activos.reduce((sum, potrero) => sum + superficieEnHectareas(potrero), 0);
  const rotacionesPorPotrero = todasRotaciones.reduce((acc, rotacion) => {
    const key = String(rotacion.potrero_id);
    acc[key] = acc[key] || [];
    acc[key].push(rotacion);
    return acc;
  }, {});
  const ocupados = activos.filter((potrero) => (
    potrero.estado === "Ocupado" || rotacionSummary(rotacionesPorPotrero[String(potrero.id)] || []).activa
  )).length;
  const enDescanso = activos.filter((potrero) => potrero.estado === "En descanso").length;

  const handleSave = () => {
    queryClient.invalidateQueries({ queryKey: POTREROS_QUERY_KEY });
    setShowModal(false);
    setEditando(null);
  };

  const openEdit = (potrero) => {
    setEditando(potrero);
    setShowModal(true);
  };

  const toggleActivo = async (potrero) => {
    await potreroService.update(potrero.id, { activo: potrero.activo === false });
    queryClient.invalidateQueries({ queryKey: POTREROS_QUERY_KEY });
    if (detalle?.id === potrero.id) {
      setDetalle((prev) => ({ ...prev, activo: prev.activo === false }));
    }
  };

  const handleDeletePotrero = async (potrero) => {
    const ok = window.confirm(`¿Borrar el potrero "${potrero.nombre}"? También se borrarán sus trabajos y rotaciones.`);
    if (!ok) return;

    await potreroService.destroy(potrero.id);
    await queryClient.invalidateQueries({ queryKey: POTREROS_QUERY_KEY });
    setDetalle(null);
  };

  const handleDeleteTrabajo = async (trabajo) => {
    const ok = window.confirm(`¿Borrar el trabajo "${trabajo.tipo}" del ${trabajo.fecha}?`);
    if (!ok) return;

    await potreroTrabajoService.destroy(trabajo.id);
    await queryClient.invalidateQueries({ queryKey: POTRERO_TRABAJOS_QUERY_KEY });
  };

  const handleDeleteRotacion = async (rotacion) => {
    const ok = window.confirm(`¿Borrar la ocupación iniciada el ${rotacion.fecha_entrada}?`);
    if (!ok) return;

    await potreroRotacionService.destroy(rotacion.id);
    await queryClient.invalidateQueries({ queryKey: POTRERO_ROTACIONES_QUERY_KEY });
  };

  const setTrabajo = (field, value) => {
    setTrabajoForm((prev) => ({ ...prev, [field]: value }));
  };

  const setRotacion = (field, value) => {
    setRotacionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTrabajo = async () => {
    if (!detalle?.id || !trabajoForm.tipo || !trabajoForm.fecha) return;

    setGuardandoTrabajo(true);
    try {
      await potreroTrabajoService.create(detalle.id, {
        tipo: trabajoForm.tipo,
        fecha: trabajoForm.fecha,
        descripcion: trabajoForm.descripcion || null,
        notas: trabajoForm.notas || null,
        costo: trabajoForm.costo !== "" ? Number(trabajoForm.costo) : null,
        responsable: trabajoForm.responsable || null,
        proveedor: trabajoForm.proveedor || null,
        moneda: trabajoForm.moneda || null,
        tipo_pasto: trabajoForm.tipo === "Siembra" ? trabajoForm.tipo_pasto || null : null,
        dias_reingreso: trabajoForm.tipo === "Fertilización" && trabajoForm.dias_reingreso !== "" ? Number(trabajoForm.dias_reingreso) : null,
        fecha_reingreso_seguro: trabajoForm.tipo === "Fertilización" ? addDays(trabajoForm.fecha, trabajoForm.dias_reingreso) : null,
      });
      setTrabajoForm(trabajoInicial());
      queryClient.invalidateQueries({ queryKey: POTRERO_TRABAJOS_QUERY_KEY });
    } finally {
      setGuardandoTrabajo(false);
    }
  };

  const handleSaveRotacion = async () => {
    if (!detalle?.id || !rotacionForm.fecha_entrada) return;

    setGuardandoRotacion(true);
    try {
      await potreroRotacionService.create(detalle.id, {
        fecha_entrada: rotacionForm.fecha_entrada,
        fecha_salida: rotacionForm.fecha_salida || null,
        cantidad_animales: rotacionForm.cantidad_animales !== "" ? Number(rotacionForm.cantidad_animales) : null,
        grupo: rotacionForm.grupo || null,
        notas: rotacionForm.notas || null,
      });
      setRotacionForm(rotacionInicial());
      queryClient.invalidateQueries({ queryKey: POTRERO_ROTACIONES_QUERY_KEY });
    } finally {
      setGuardandoRotacion(false);
    }
  };

  const handleGuardarSalidaRotacion = async (rotacion) => {
    const fechaSalida = salidasRotacion[rotacion.id] ?? rotacion.fecha_salida ?? todayStr();
    await potreroRotacionService.update(rotacion.id, { fecha_salida: fechaSalida || null });
    queryClient.invalidateQueries({ queryKey: POTRERO_ROTACIONES_QUERY_KEY });
  };

  if (detalle) {
    const capacidad = capacidadPotrero(detalle);
    const ultimaSiembra = trabajos.find((trabajo) => trabajo.tipo === "Siembra");
    const fertilizacionActiva = trabajos.find((trabajo) => (
      trabajo.tipo === "Fertilización" &&
      trabajo.fecha_reingreso_seguro &&
      diffDays(trabajo.fecha_reingreso_seguro) > 0
    ));
    const diasFaltantes = fertilizacionActiva ? diffDays(fertilizacionActiva.fecha_reingreso_seguro) : null;
    const resumenRotacion = rotacionSummary(rotaciones);
    const estadoVisual = resumenRotacion.activa ? "Ocupado" : detalle.estado;

    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{detalle.nombre}</h1>
              <p className="text-sm text-muted-foreground">
                {detalle.numero ? `Código ${detalle.numero}` : "Sin código"} · {detalle.activo === false ? "Inactivo" : "Activo"}
              </p>
            </div>
          </div>
          <Button onClick={() => openEdit(detalle)} variant="outline" className="gap-2">
            <Edit className="w-4 h-4" />
            Editar
          </Button>
          <Button onClick={() => handleDeletePotrero(detalle)} variant="outline" className="gap-2 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
            Borrar
          </Button>
        </div>

        {fertilizacionActiva && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Potrero fertilizado: faltan {diasFaltantes} días para reingreso seguro
              </p>
              <p className="text-xs text-amber-700">
                Reingreso seguro desde {fertilizacionActiva.fecha_reingreso_seguro}.
              </p>
            </div>
          </div>
        )}

        {ultimaSiembra && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">
              Siembra: {ultimaSiembra.fecha} - {ultimaSiembra.tipo_pasto || "tipo de pasto no informado"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Estado actual</p>
            <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoClasses[estadoVisual] || "bg-muted text-muted-foreground border-border"}`}>
              {estadoVisual || "-"}
            </span>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Superficie</p>
            <p className="text-2xl font-bold">{formatNumber(superficiePotrero(detalle))} {unidadPotrero(detalle)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Capacidad estimada</p>
            <p className="text-2xl font-bold">{capacidad ?? "-"}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === item ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "General" && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-foreground">Datos generales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Info label="Tipo" value={detalle.tipo} />
              <Info label="Código o número" value={detalle.numero} />
              <Info label="Unidad de superficie" value={unidadPotrero(detalle)} />
              <Info label="Estado" value={detalle.estado} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Observaciones</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{detalle.notas || "Sin observaciones."}</p>
            </div>
          </div>
        )}

        {tab === "Trabajos" && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="font-semibold text-foreground">Agregar trabajo</h2>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Tipo</Label>
                <Select value={trabajoForm.tipo} onValueChange={(value) => setTrabajo("tipo", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_TRABAJO.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Fecha</Label>
                <Input type="date" value={trabajoForm.fecha} onChange={(e) => setTrabajo("fecha", e.target.value)} />
              </div>
              {trabajoForm.tipo === "Siembra" && (
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Tipo de pasto</Label>
                  <Input value={trabajoForm.tipo_pasto} onChange={(e) => setTrabajo("tipo_pasto", e.target.value)} placeholder="Ej: Rye grass" />
                </div>
              )}
              {trabajoForm.tipo === "Fertilización" && (
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Días de reingreso</Label>
                  <Input type="number" min="0" value={trabajoForm.dias_reingreso} onChange={(e) => setTrabajo("dias_reingreso", e.target.value)} placeholder="Ej: 14" />
                  {trabajoForm.dias_reingreso && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reingreso seguro: {addDays(trabajoForm.fecha, trabajoForm.dias_reingreso)}
                    </p>
                  )}
                </div>
              )}
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Costo</Label>
                <Input type="number" min="0" step="0.01" value={trabajoForm.costo} onChange={(e) => setTrabajo("costo", e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Moneda</Label>
                <Input value={trabajoForm.moneda} onChange={(e) => setTrabajo("moneda", e.target.value)} placeholder="UYU" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Responsable</Label>
                <Input value={trabajoForm.responsable} onChange={(e) => setTrabajo("responsable", e.target.value)} placeholder="Responsable" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Proveedor</Label>
                <Input value={trabajoForm.proveedor} onChange={(e) => setTrabajo("proveedor", e.target.value)} placeholder="Proveedor" />
              </div>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Notas</Label>
                <Textarea value={trabajoForm.notas} onChange={(e) => setTrabajo("notas", e.target.value)} placeholder="Detalle del trabajo..." />
              </div>
              <Button onClick={handleSaveTrabajo} disabled={guardandoTrabajo || !trabajoForm.tipo || !trabajoForm.fecha} className="w-full">
                {guardandoTrabajo ? "Guardando..." : "Guardar trabajo"}
              </Button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Timeline de trabajos</h2>
              </div>
              {isLoadingTrabajos ? (
                <p className="p-6 text-sm text-muted-foreground">Cargando trabajos...</p>
              ) : trabajos.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Todavía no hay trabajos registrados para este potrero.</p>
              ) : (
                <div className="divide-y divide-border">
                  {trabajos.map((trabajo) => (
                    <div key={trabajo.id} className="p-4 space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{trabajo.tipo}</p>
                          <p className="text-xs text-muted-foreground">{trabajo.fecha}</p>
                        </div>
                        {trabajo.costo != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {trabajo.moneda || "$"} {formatNumber(trabajo.costo)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTrabajo(trabajo)}
                              className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        {trabajo.costo == null && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTrabajo(trabajo)}
                            className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {trabajo.tipo === "Siembra" && trabajo.tipo_pasto && (
                        <p className="text-xs text-green-700 font-semibold">Pasto: {trabajo.tipo_pasto}</p>
                      )}
                      {trabajo.tipo === "Fertilización" && trabajo.fecha_reingreso_seguro && (
                        <p className="text-xs text-amber-700 font-semibold">
                          Reingreso seguro: {trabajo.fecha_reingreso_seguro}
                        </p>
                      )}
                      {(trabajo.responsable || trabajo.proveedor) && (
                        <p className="text-xs text-muted-foreground">
                          {[trabajo.responsable ? `Responsable: ${trabajo.responsable}` : null, trabajo.proveedor ? `Proveedor: ${trabajo.proveedor}` : null].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {trabajo.descripcion && <p className="text-xs text-muted-foreground">{trabajo.descripcion}</p>}
                      {trabajo.notas && <p className="text-xs text-muted-foreground">{trabajo.notas}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Rotación" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <SummaryCard
                label="Ocupación actual"
                value={resumenRotacion.activa ? `${resumenRotacion.diasOcupacionActual} días` : "—"}
                sublabel={resumenRotacion.activa ? `${resumenRotacion.cantidadAnimalesActual ?? 0} animales` : "sin ocupación activa"}
              />
              <SummaryCard
                label="Promedio ocupación"
                value={resumenRotacion.promedioOcupacion != null ? `${formatNumber(resumenRotacion.promedioOcupacion)} días` : "—"}
                sublabel="histórico"
              />
              <SummaryCard
                label="Promedio rotación"
                value={resumenRotacion.promedioRotacion != null ? `${formatNumber(resumenRotacion.promedioRotacion)} días` : "—"}
                sublabel="entre salidas y entradas"
              />
              <SummaryCard label="Última entrada" value={resumenRotacion.ultimaEntrada || "—"} sublabel="más reciente" />
              <SummaryCard label="Última salida" value={resumenRotacion.ultimaSalida || "—"} sublabel="más reciente" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h2 className="font-semibold text-foreground">Registrar ocupación</h2>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Fecha entrada</Label>
                  <Input type="date" value={rotacionForm.fecha_entrada} onChange={(e) => setRotacion("fecha_entrada", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Fecha salida</Label>
                  <Input type="date" value={rotacionForm.fecha_salida} onChange={(e) => setRotacion("fecha_salida", e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Dejala vacía para marcar ocupación activa.</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Cantidad animales</Label>
                  <Input type="number" min="0" value={rotacionForm.cantidad_animales} onChange={(e) => setRotacion("cantidad_animales", e.target.value)} placeholder="Ej: 24" />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Grupo / lote</Label>
                  <Input value={rotacionForm.grupo} onChange={(e) => setRotacion("grupo", e.target.value)} placeholder="Ej: Lote vaquillonas" />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Notas</Label>
                  <Textarea value={rotacionForm.notas} onChange={(e) => setRotacion("notas", e.target.value)} placeholder="Observaciones de entrada o salida..." />
                </div>
                <Button onClick={handleSaveRotacion} disabled={guardandoRotacion || !rotacionForm.fecha_entrada} className="w-full">
                  {guardandoRotacion ? "Guardando..." : "Guardar ocupación"}
                </Button>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">Historial de rotación</h2>
                </div>
                {isLoadingRotaciones ? (
                  <p className="p-6 text-sm text-muted-foreground">Cargando rotaciones...</p>
                ) : rotaciones.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">Todavía no hay ocupaciones registradas para este potrero.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Entrada</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Salida</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Ocupación</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Rotación</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Animales</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Notas</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rotaciones.map((rotacion) => (
                          <tr key={rotacion.id} className="border-b border-border hover:bg-muted/20">
                            <td className="px-4 py-3 text-sm font-semibold">{rotacion.fecha_entrada}</td>
                            <td className="px-4 py-3 text-sm">
                              {rotacion.fecha_salida || <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Activa</span>}
                            </td>
                            <td className="px-4 py-3 text-sm">{rotacion.dias_ocupacion ?? (rotacion.fecha_salida ? "—" : `${daysSince(rotacion.fecha_entrada)} actual`)}</td>
                            <td className="px-4 py-3 text-sm">{rotacion.dias_rotacion ?? "—"}</td>
                            <td className="px-4 py-3 text-sm">
                              {[rotacion.cantidad_animales ?? "—", rotacion.grupo].filter(Boolean).join(" · ")}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
                              <span className="line-clamp-2">{rotacion.notas || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex min-w-48 items-center gap-2">
                                <Input
                                  type="date"
                                  value={salidasRotacion[rotacion.id] ?? rotacion.fecha_salida ?? ""}
                                  onChange={(e) => setSalidasRotacion((prev) => ({ ...prev, [rotacion.id]: e.target.value }))}
                                  className="h-8"
                                />
                                <Button size="sm" variant="outline" onClick={() => handleGuardarSalidaRotacion(rotacion)}>
                                  Guardar
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRotacion(rotacion)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showModal && (
          <PotreroModal
            potrero={editando}
            onClose={() => { setShowModal(false); setEditando(null); }}
            onSave={handleSave}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Potreros</h1>
          <p className="text-muted-foreground text-sm">{potreros.length} potreros registrados</p>
        </div>
        <Button onClick={() => { setEditando(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo potrero</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Activos" value={activos.length} sublabel="potreros" />
        <SummaryCard label="Superficie total" value={`${formatNumber(superficieTotal)} ha`} sublabel="m2 convertidos a ha" />
        <SummaryCard label="Ocupados" value={ocupados} sublabel="potreros" />
        <SummaryCard label="En descanso" value={enDescanso} sublabel="potreros" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Resumen de rotación</h2>
          <p className="text-xs text-muted-foreground mt-1">Vista comparativa por potrero</p>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando resumen...</p>
        ) : potreros.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay potreros para comparar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Potrero</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Última entrada</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Última salida</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Días ocupación actual</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Promedio ocupación</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Promedio rotación</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Animales actual</th>
                </tr>
              </thead>
              <tbody>
                {potreros.map((potrero) => {
                  const resumen = rotacionSummary(rotacionesPorPotrero[String(potrero.id)] || []);
                  const estado = resumen.activa ? "Ocupado" : potrero.estado;

                  return (
                    <tr key={potrero.id} className="border-b border-border hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => { setDetalle(potrero); setTab("Rotación"); }} className="text-left">
                          <span className="block text-sm font-semibold text-foreground">{potrero.nombre}</span>
                          <span className="block text-xs text-muted-foreground">{potrero.numero ? `Código ${potrero.numero}` : "Sin código"}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${estadoClasses[estado] || "bg-muted text-muted-foreground border-border"}`}>
                          {estado || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{resumen.ultimaEntrada || "—"}</td>
                      <td className="px-4 py-3 text-sm">{resumen.ultimaSalida || "—"}</td>
                      <td className="px-4 py-3 text-sm">{resumen.diasOcupacionActual != null ? resumen.diasOcupacionActual : "—"}</td>
                      <td className="px-4 py-3 text-sm">{resumen.promedioOcupacion != null ? formatNumber(resumen.promedioOcupacion) : "—"}</td>
                      <td className="px-4 py-3 text-sm">{resumen.promedioRotacion != null ? formatNumber(resumen.promedioRotacion) : "—"}</td>
                      <td className="px-4 py-3 text-sm">{resumen.cantidadAnimalesActual ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Listado de potreros</h2>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando potreros...</p>
        ) : potreros.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-foreground font-semibold">No hay potreros</p>
            <p className="text-muted-foreground text-sm mt-1">Registrá tus áreas de pastoreo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Potrero</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Estado</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Superficie</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Capacidad</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Activo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {potreros.map((potrero) => {
                  const estado = rotacionSummary(rotacionesPorPotrero[String(potrero.id)] || []).activa ? "Ocupado" : potrero.estado;

                  return (
                    <tr key={potrero.id} className={`border-b border-border hover:bg-muted/20 ${potrero.activo === false ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold">{potrero.nombre}</p>
                        <p className="text-xs text-muted-foreground">{potrero.numero ? `Código ${potrero.numero}` : "Sin código"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{potrero.tipo || "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${estadoClasses[estado] || "bg-muted text-muted-foreground border-border"}`}>
                          {estado || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {formatNumber(superficiePotrero(potrero))} {unidadPotrero(potrero)}
                      </td>
                      <td className="px-4 py-3 text-sm">{capacidadPotrero(potrero) ?? "-"}</td>
                      <td className="px-4 py-3 text-sm">{potrero.activo === false ? "No" : "Sí"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetalle(potrero)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(potrero)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleActivo(potrero)}
                            className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {potrero.activo === false ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePotrero(potrero)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <PotreroModal
          potrero={editando}
          onClose={() => { setShowModal(false); setEditando(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, sublabel }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground">{value || "-"}</p>
    </div>
  );
}

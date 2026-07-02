import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POTREROS_QUERY_KEY, potreroService } from "@/services/potreroService";
import {
  POTRERO_TRABAJOS_QUERY_KEY,
  potreroTrabajoService,
} from "@/services/potreroTrabajoService";
import { AlertTriangle, ArrowLeft, Edit, Eye, MapPin, Plus, Power, PowerOff } from "lucide-react";
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

export default function Potreros() {
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [tab, setTab] = useState("General");
  const [trabajoForm, setTrabajoForm] = useState(trabajoInicial());
  const [guardandoTrabajo, setGuardandoTrabajo] = useState(false);
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
  const ocupados = activos.filter((potrero) => potrero.estado === "Ocupado").length;
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

  const setTrabajo = (field, value) => {
    setTrabajoForm((prev) => ({ ...prev, [field]: value }));
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

  if (detalle) {
    const capacidad = capacidadPotrero(detalle);
    const ultimaSiembra = trabajos.find((trabajo) => trabajo.tipo === "Siembra");
    const fertilizacionActiva = trabajos.find((trabajo) => (
      trabajo.tipo === "Fertilización" &&
      trabajo.fecha_reingreso_seguro &&
      diffDays(trabajo.fecha_reingreso_seguro) > 0
    ));
    const diasFaltantes = fertilizacionActiva ? diffDays(fertilizacionActiva.fecha_reingreso_seguro) : null;

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
            <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${estadoClasses[detalle.estado] || "bg-muted text-muted-foreground border-border"}`}>
              {detalle.estado || "-"}
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
                          <span className="text-sm font-semibold text-primary">
                            {trabajo.moneda || "$"} {formatNumber(trabajo.costo)}
                          </span>
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
          <div className="bg-secondary/40 border border-border rounded-xl p-5">
            <p className="text-sm font-semibold text-foreground">Rotación de animales</p>
            <p className="text-sm text-muted-foreground mt-1">
              La ocupación y rotación se gestionará en el próximo paso.
            </p>
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
                {potreros.map((potrero) => (
                  <tr key={potrero.id} className={`border-b border-border hover:bg-muted/20 ${potrero.activo === false ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{potrero.nombre}</p>
                      <p className="text-xs text-muted-foreground">{potrero.numero ? `Código ${potrero.numero}` : "Sin código"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{potrero.tipo || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${estadoClasses[potrero.estado] || "bg-muted text-muted-foreground border-border"}`}>
                        {potrero.estado || "-"}
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
                      </div>
                    </td>
                  </tr>
                ))}
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

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { eventoService, eventosQueryKey } from "@/services/eventoService";
import { milkRecordService } from "@/services/milkRecordService";
import {
  LITROS_LIBRES_QUERY_KEY,
  litrosLibresService,
} from "@/services/litrosLibresService";
import { ANIMALS_QUERY_KEY, animalService } from "@/services/animalService";
import { formatDate, calcularEdad } from "@/lib/utils";
import EstadoBadge from "@/components/shared/EstadoBadge";
import EventoRapidoModal from "@/components/ganado/EventoRapidoModal";
import { ChevronLeft, ChevronRight, Plus, Milk, Heart, Weight, Users, Calendar, AlertTriangle, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TABS = ["General", "Registro Lechero", "Litros Libres", "Reproducción", "Salud", "Agrupamiento", "Pedigrí", "Historial"];

export default function AnimalDetalle({ animal, animales = [], animalesNavegacion = [], onBack, onEdit, onSelectAnimal }) {

  const [showEventoModal, setShowEventoModal] = useState(false);
  const [tab, setTab] = useState("General");
  const [busquedaAnimal, setBusquedaAnimal] = useState("");
  const [litrosLibresForm, setLitrosLibresForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    produccion_total_dia: "",
    balanceado_kg_dia: "",
    costo_por_kg: "",
    precio_leche_litro: "",
    notas: "",
  });
  const [guardandoLitrosLibres, setGuardandoLitrosLibres] = useState(false);
  const queryClient = useQueryClient();
  const fincaId = animal?.finca_id;

  const { data: eventos = [], refetch: refetchEventos } = useQuery({
    queryKey: eventosQueryKey({ animalId: animal.id, scope: "timeline" }),
    enabled: !!animal?.id,
    queryFn: () => eventoService.list({ animal_id: animal.id }),
  });

  const { data: registrosLeche = [] } = useQuery({
    queryKey: ['leche-animal', animal.id],
    enabled: !!animal?.id,
    queryFn: async () => {
      // El backend filtra por animal_id y ordena por fecha desc.
      const records = await milkRecordService.list({ animal_id: animal.id });
      return records.slice(0, 60);
    },
  });

  const { data: registrosLitrosLibres = [] } = useQuery({
    queryKey: [...LITROS_LIBRES_QUERY_KEY, animal.id],
    enabled: !!animal?.id,
    queryFn: () => litrosLibresService.list({ animal_id: animal.id }),
  });

const { data: animalesFinca = [] } = useQuery({
  queryKey: ANIMALS_QUERY_KEY,
  enabled: !!animal?.id,
  queryFn: animalService.list,
});

const madreDisplay = animal.madre_nombre || "-";

const buscarAnimal = (id) => {
  if (!id) return null;
  const valor = String(id).trim().toLowerCase();

  return animalesFinca.find(a =>
    String(a.id || "").trim().toLowerCase() === valor ||
    String(a.numero_id || "").trim().toLowerCase() === valor ||
    String(a.arete || "").trim().toLowerCase() === valor ||
    String(a.numero_registro || "").trim().toLowerCase() === valor ||
    String(a.nombre || "").trim().toLowerCase() === valor
  ) || null;
};


const padre = buscarAnimal(animal.padre_id);
const madre = buscarAnimal(animal.madre_id);


const abueloPaterno = buscarAnimal(padre?.padre_id);
const abuelaPaterna = buscarAnimal(padre?.madre_id);
const abueloMaterno = buscarAnimal(madre?.padre_id);
const abuelaMaterna = buscarAnimal(madre?.madre_id);

const hijos = animalesFinca.filter(a =>
  a.padre_id === animal.id ||
  a.madre_id === animal.id ||
  a.padre_id === animal.numero_id ||
  a.madre_id === animal.numero_id
);
const listaAnimales = animales.length > 0 ? animales : animalesFinca;
const listaNavegacion = animalesNavegacion.length > 0 ? animalesNavegacion : listaAnimales;
const indiceActual = listaNavegacion.findIndex(a => a.id === animal.id);
const animalAnterior = indiceActual > 0 ? listaNavegacion[indiceActual - 1] : null;
const animalSiguiente = indiceActual >= 0 && indiceActual < listaNavegacion.length - 1
  ? listaNavegacion[indiceActual + 1]
  : null;
const sugerenciasAnimales = busquedaAnimal.trim()
  ? listaAnimales
      .filter(a => a.id !== animal.id)
      .filter(a => {
        const query = busquedaAnimal.trim().toLowerCase();
        return (
          a.nombre?.toLowerCase().includes(query) ||
          a.arete?.toLowerCase().includes(query) ||
          a.numero_id?.toLowerCase().includes(query)
        );
      })
      .slice(0, 6)
  : [];
const seleccionarAnimal = (animalSeleccionado) => {
  setBusquedaAnimal("");
  onSelectAnimal?.(animalSeleccionado);
};

  const hoy = new Date().toISOString().split('T')[0];
  const enRetiro = animal.retiro_leche_hasta && animal.retiro_leche_hasta >= hoy;
  const diasRetiro = enRetiro ? Math.ceil((new Date(animal.retiro_leche_hasta) - new Date()) / 86400000) : 0;

  // Chart data from milk records
  const chartData = registrosLeche.slice(0, 30).reverse().map(r => ({
    fecha: formatDate(r.fecha),
    AM: r.litros_am || 0,
    PM: r.litros_pm || 0,
    total: r.total_litros || 0,
  }));
  const produccionDesdeRegistroLeche = (fecha) => {
    const registro = registrosLeche.find(r => r.fecha === fecha);
    if (!registro) {
      return Number(animal.produccion_diaria_litros || 0) || Number(animal.produccion_am || 0) + Number(animal.produccion_pm || 0);
    }

    return Number(registro.total_litros ?? 0) || Number(registro.litros_am || 0) + Number(registro.litros_pm || 0);
  };

  const registroLitrosLibresActual = registrosLitrosLibres.find(r => r.fecha === litrosLibresForm.fecha);

  useEffect(() => {
    const fecha = litrosLibresForm.fecha || hoy;
    const registroGuardado = registrosLitrosLibres.find(r => r.fecha === fecha);

    setLitrosLibresForm({
      fecha,
      produccion_total_dia: registroGuardado?.produccion_total_dia ?? (produccionDesdeRegistroLeche(fecha) || ""),
      balanceado_kg_dia: registroGuardado?.balanceado_kg_dia ?? animal.racion_balanceado_kg ?? "",
      costo_por_kg: registroGuardado?.costo_por_kg ?? animal.costo_balanceado_kg ?? "",
      precio_leche_litro: registroGuardado?.precio_leche_litro ?? animal.precio_leche_litro ?? "",
      notas: registroGuardado?.notas ?? "",
    });
  }, [animal.id, animal.racion_balanceado_kg, animal.costo_balanceado_kg, animal.precio_leche_litro, litrosLibresForm.fecha, registrosLeche, registrosLitrosLibres]);

  const setLitrosLibres = (field, value) => {
    setLitrosLibresForm(prev => ({ ...prev, [field]: value }));
  };

  const produccionTotalDia = Number(litrosLibresForm.produccion_total_dia || 0);
  const kgBalanceado = Number(litrosLibresForm.balanceado_kg_dia || 0);
  const costoKg = Number(litrosLibresForm.costo_por_kg || 0);
  const precioLitro = Number(litrosLibresForm.precio_leche_litro || 0);
  const costoBalanceado = kgBalanceado * costoKg;
  const ingresoLeche = produccionTotalDia * precioLitro;
  const margenSimple = ingresoLeche - costoBalanceado;
  const litrosLibres = precioLitro > 0 ? margenSimple / precioLitro : 0;

  const guardarLitrosLibres = async () => {
    setGuardandoLitrosLibres(true);
    try {
      const payload = {
        animal_id: animal.id,
        fecha: litrosLibresForm.fecha,
        produccion_total_dia: produccionTotalDia,
        balanceado_kg_dia: kgBalanceado,
        costo_por_kg: costoKg,
        precio_leche_litro: precioLitro,
        notas: litrosLibresForm.notas || null,
      };

      if (registroLitrosLibresActual?.id) {
        await litrosLibresService.update(registroLitrosLibresActual.id, payload);
      } else {
        await litrosLibresService.create(payload);
      }

      const actualizado = await animalService.update(animal.id, {
        racion_balanceado_kg: kgBalanceado,
        costo_balanceado_kg: costoKg,
        precio_leche_litro: precioLitro,
        produccion_diaria_litros: produccionTotalDia,
      });
      await queryClient.invalidateQueries({ queryKey: LITROS_LIBRES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ANIMALS_QUERY_KEY });
      onSelectAnimal?.({ ...animal, ...actualizado });
    } finally {
      setGuardandoLitrosLibres(false);
    }
  };

  const borrarLitrosLibres = async (record) => {
    const ok = window.confirm(`¿Borrar el registro de Litros Libres del ${formatDate(record.fecha)}?`);
    if (!ok) return;

    await litrosLibresService.destroy(record.id);
    await queryClient.invalidateQueries({ queryKey: LITROS_LIBRES_QUERY_KEY });
  };

  const eventosOrdenados = [...eventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const eventosSalud = eventosOrdenados.filter(e => ["Enfermedad", "Tratamiento", "Vacuna", "Chequeo veterinario", "Diagnóstico", "Revisión", "Secado"].includes(e.tipo));
  const eventosRepro = eventosOrdenados.filter(e => ["Parto", "Inseminacion", "Celo", "Chequeo veterinario"].includes(e.tipo));
  const parseEventDate = (fecha) => {
    if (!fecha) return null;

    const parsed = new Date(`${fecha}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const diffDays = (later, earlier) => {
    const laterDate = parseEventDate(later);
    const earlierDate = parseEventDate(earlier);
    if (!laterDate || !earlierDate) return null;

    const diff = Math.round((laterDate - earlierDate) / 86400000);
    return diff < 0 ? null : diff;
  };
  const addDays = (fecha, days) => {
    const date = parseEventDate(fecha);
    const daysNumber = Number(days || 0);
    if (!date || !daysNumber) return null;

    date.setDate(date.getDate() + daysNumber);
    return date.toISOString().split("T")[0];
  };
  const retiroHastaEvento = (ev) => {
    if (!ev.requiere_retiro_leche) return null;

    return addDays(ev.fecha, ev.dias_retiro) || animal.retiro_leche_hasta;
  };
  const intervalosReproductivos = new Map();
  const eventosReproCronologicos = eventosRepro.filter((ev) => parseEventDate(ev.fecha)).sort((a, b) => {
    const dateDiff = parseEventDate(a.fecha) - parseEventDate(b.fecha);
    if (dateDiff !== 0) return dateDiff;

    return new Date(a.created_at || 0) - new Date(b.created_at || 0);
  });
  const ultimoEventoPorTipo = {};

  eventosReproCronologicos.forEach((ev) => {
    if (!["Inseminacion", "Parto"].includes(ev.tipo)) return;

    const anterior = ultimoEventoPorTipo[ev.tipo];
    const intervalo = anterior ? diffDays(ev.fecha, anterior.fecha) : null;

    if (intervalo !== null) {
      intervalosReproductivos.set(ev, intervalo);
    }

    ultimoEventoPorTipo[ev.tipo] = ev;
  });

  const TIPO_EMOJI = {
    Parto: "🐣", Inseminacion: "🧬", Celo: "💕", "Chequeo veterinario": "🩺",
    Tratamiento: "💊", Vacuna: "💉", Enfermedad: "🤒", "Cambio de grupo": "👥",
    "Diagnóstico": "🩺", "Revisión": "🔎",
    Produccion: "🥛", Muerte: "💀", Venta: "💰", Destete: "🍼", Secado: "💤", Aborto: "⚠️", Otro: "📋"
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={!animalAnterior}
              onClick={() => animalAnterior && seleccionarAnimal(animalAnterior)}
              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Animal anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">{animal.nombre}</h1>
            <button
              type="button"
              disabled={!animalSiguiente}
              onClick={() => animalSiguiente && seleccionarAnimal(animalSiguiente)}
              className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Animal siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {animal.numero_id && <span className="text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{animal.numero_id}</span>}
            <EstadoBadge estado={animal.estado} size="md" />
            {animal.estado === "Toro" ? (
  animal.tipo_toro && (
    <EstadoBadge
      estado={animal.tipo_toro === "en_explotacion" ? "En explotación" : "Solo genética"}
      type="reproductivo"
      size="sm"
    />
  )
) : (
  animal.estado_reproductivo && (
    <EstadoBadge estado={animal.estado_reproductivo} type="reproductivo" size="sm" />
  )
)}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{animal.raza} · {calcularEdad(animal.fecha_nacimiento)}</p>
          <div className="relative mt-3 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busquedaAnimal}
              onChange={e => setBusquedaAnimal(e.target.value)}
              placeholder="Buscar animal por nombre, arete o ID..."
              className="pl-9"
            />
            {sugerenciasAnimales.length > 0 && (
              <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                {sugerenciasAnimales.map(sugerencia => (
                  <button
                    key={sugerencia.id}
                    type="button"
                    onClick={() => seleccionarAnimal(sugerencia)}
                    className="w-full px-3 py-2 text-left hover:bg-secondary"
                  >
                    <p className="text-sm font-semibold text-foreground">{sugerencia.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {sugerencia.numero_id || "-"} · {sugerencia.arete || "Sin arete"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {onEdit && <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>}
          <Button size="sm" className="bg-primary text-primary-foreground gap-1.5" onClick={() => setShowEventoModal(true)}>
            <Plus className="w-4 h-4" /> Registrar
          </Button>
        </div>
      </div>

      {/* Retiro Leche Alert */}
      {enRetiro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">🚫 En retiro de leche</p>
            <p className="text-xs text-red-600">Hasta {formatDate(animal.retiro_leche_hasta)} · {diasRetiro} días restantes. Leche no apta para venta.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-primary/10'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {tab === "General" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4" />Información General</h3>
            {[
              ["Nombre", animal.nombre],
              ["ID oficial", animal.numero_id || "-"],
              ["Arete", [animal.arete || "-"],],
              ["Número de Registro", animal.numero_registro || "-"],
              ["Raza", animal.raza || "-"],
              ["Edad", calcularEdad(animal.fecha_nacimiento)],
              ["Peso actual", animal.peso_kg ? `${animal.peso_kg} kg` : "-"],
              ["Grupo / Lote", animal.grupo || "-"],
              ["Padre", animal.padre_nombre || "-"],
              ["ID Padre", animal.padre_id || "-"],
              ["Madre", madreDisplay],
              ["ID Madre", animal.madre_id || "-"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Milk className="w-4 h-4" />Producción actual</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">AM</p>
                  <p className="text-xl font-bold text-blue-700">{animal.produccion_am || 0}L</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">PM</p>
                  <p className="text-xl font-bold text-blue-700">{animal.produccion_pm || 0}L</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-primary">{(animal.produccion_am || 0) + (animal.produccion_pm || 0)}L</p>
                </div>
              </div>
              {animal.racion_actual && (
                <p className="text-xs text-muted-foreground">🌾 Ración: {animal.racion_actual}</p>
              )}
            </div>
            <div className="bg-card rounded-xl border border-border p-5 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2"><Calendar className="w-4 h-4" />Fechas clave</h3>
              {[
                ["Último parto", animal.fecha_ultimo_parto],
                ["Próx. parto estimado", animal.fecha_proxima_cria],
                ["Fecha secado", animal.fecha_secado],
                ["Próx. chequeo vet.", animal.fecha_proximo_chequeo],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-semibold ${value ? 'text-foreground' : 'text-muted-foreground'}`}>{value ? formatDate(value) : '-'}</span>
                </div>
              ))}
            </div>
          </div>
          {animal.notas && (
            <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-yellow-700 mb-1">Notas</p>
              <p className="text-sm text-yellow-800">{animal.notas}</p>
            </div>
          )}
        </div>
      )}

      {/* Registro Lechero */}
      {tab === "Registro Lechero" && (
        <div className="space-y-4">
          {chartData.length > 0 ? (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Producción últimos 30 días</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152,60%,32%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(152,60%,32%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,88%)" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [`${v}L`, '']} />
                  <Area type="monotone" dataKey="total" stroke="hsl(152,60%,32%)" fill="url(#grad)" name="Total" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
              <Milk className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin registros de leche aún. Usa el Registro Lechero Maestro para ingresar datos.</p>
            </div>
          )}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground">Historial de producciones</h3></div>
            {registrosLeche.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Sin registros</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs text-muted-foreground">Fecha</th>
                    <th className="text-center px-4 py-2 text-xs text-muted-foreground">AM</th>
                    <th className="text-center px-4 py-2 text-xs text-muted-foreground">PM</th>
                    <th className="text-center px-4 py-2 text-xs text-muted-foreground font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {registrosLeche.slice(0, 30).map(r => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-muted-foreground">{formatDate(r.fecha)}</td>
                      <td className="px-4 py-2 text-center">{r.litros_am || '-'}</td>
                      <td className="px-4 py-2 text-center">{r.litros_pm || '-'}</td>
                      <td className="px-4 py-2 text-center font-bold text-primary">{r.total_litros || '-'}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "Litros Libres" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Litros Libres</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Fecha</label>
                <Input type="date" value={litrosLibresForm.fecha} onChange={e => setLitrosLibres("fecha", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Producción total día</label>
                <Input type="number" step="0.1" value={litrosLibresForm.produccion_total_dia} onChange={e => setLitrosLibres("produccion_total_dia", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Balanceado kg/día</label>
                <Input type="number" step="0.1" value={litrosLibresForm.balanceado_kg_dia} onChange={e => setLitrosLibres("balanceado_kg_dia", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Costo por kg</label>
                <Input type="number" step="0.01" value={litrosLibresForm.costo_por_kg} onChange={e => setLitrosLibres("costo_por_kg", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Precio leche/L</label>
                <Input type="number" step="0.01" value={litrosLibresForm.precio_leche_litro} onChange={e => setLitrosLibres("precio_leche_litro", e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Notas</label>
              <Input value={litrosLibresForm.notas} onChange={e => setLitrosLibres("notas", e.target.value)} placeholder="Observaciones opcionales" />
            </div>
            <Button onClick={guardarLitrosLibres} disabled={guardandoLitrosLibres} className="mt-4">
              {guardandoLitrosLibres ? "Guardando..." : registroLitrosLibresActual ? "Actualizar registro" : "Guardar registro"}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Costo balanceado</p>
              <p className="text-2xl font-bold text-red-500">${costoBalanceado.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Ingreso leche</p>
              <p className="text-2xl font-bold text-green-600">${ingresoLeche.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Margen simple</p>
              <p className={`text-2xl font-bold ${margenSimple >= 0 ? "text-green-600" : "text-red-500"}`}>${margenSimple.toFixed(2)}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Litros libres</p>
              <p className="text-2xl font-bold text-primary">{litrosLibres.toFixed(1)}L</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Historial de Litros Libres</h3>
            </div>
            {registrosLitrosLibres.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Sin registros guardados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-muted-foreground">Fecha</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Producción</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Kg balanceado</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Costo bal.</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Ingreso</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Margen</th>
                      <th className="text-right px-4 py-2 text-xs text-muted-foreground">Litros libres</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {registrosLitrosLibres.map(record => (
                      <tr key={record.id} className="hover:bg-secondary/20">
                        <td className="px-4 py-2">
                          <button type="button" onClick={() => setLitrosLibres("fecha", record.fecha)} className="font-semibold text-foreground hover:text-primary">
                            {formatDate(record.fecha)}
                          </button>
                          {record.notas && <p className="text-xs text-muted-foreground">{record.notas}</p>}
                        </td>
                        <td className="px-4 py-2 text-right">{record.produccion_total_dia}L</td>
                        <td className="px-4 py-2 text-right">{record.balanceado_kg_dia}kg</td>
                        <td className="px-4 py-2 text-right">${Number(record.costo_balanceado || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">${Number(record.ingreso_leche || 0).toFixed(2)}</td>
                        <td className={`px-4 py-2 text-right font-semibold ${Number(record.margen_simple || 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                          ${Number(record.margen_simple || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-primary">{Number(record.litros_libres || 0).toFixed(1)}L</td>
                        <td className="px-4 py-2 text-right">
                          <button type="button" onClick={() => borrarLitrosLibres(record)} className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reproducción */}
      {tab === "Reproducción" && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Heart className="w-4 h-4" />Estado reproductivo actual</h3>
            <EstadoBadge
  estado={
    animal.estado === "Toro"
      ? animal.tipo_toro === "en_explotacion"
        ? "En explotación"
        : "Solo genética"
      : animal.estado_reproductivo || "Abierta"
  }
  type="reproductivo"
  size="md"
/>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground">Timeline reproductivo</h3></div>
            {eventosRepro.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Sin eventos reproductivos</p>
            ) : (
              <div className="divide-y divide-border">
                {eventosRepro.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-xl">{TIPO_EMOJI[ev.tipo] || '📋'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
  {ev.tipo === "Inseminacion"
    ? `${ev.numero_inseminacion ? `IA #${ev.numero_inseminacion} · ` : ""}Inseminación`
    : ev.tipo}
</p>

{ev.tipo === "Inseminacion" && (
  <div className="mt-1 space-y-0.5">
    {ev.toro_nombre && (
      <p className="text-xs text-muted-foreground">
        Toro: {ev.toro_nombre}
      </p>
    )}

    {ev.pajuela_proveedor && (
      <p className="text-xs text-muted-foreground">
        Proveedor: {ev.pajuela_proveedor}
      </p>
    )}

    {typeof ev.pajuela_sexada === "boolean" && (
      <p className="text-xs text-muted-foreground">
        Tipo: {ev.pajuela_sexada ? "Sexada" : "Convencional"}
      </p>
    )}

    {ev.pajuela_canastilla && (
      <p className="text-xs text-muted-foreground">
        Canastilla: {ev.pajuela_canastilla}
      </p>
    )}

    {ev.inventario_ia_id && (
      <p className="text-xs text-muted-foreground">
        Lote IA: {ev.inventario_ia_id}
      </p>
    )}

    {typeof intervalosReproductivos.get(ev) === "number" && (
      <p className="text-xs text-muted-foreground">
        {intervalosReproductivos.get(ev) === 0
          ? "Intervalo: mismo día"
          : `Intervalo: ${intervalosReproductivos.get(ev)} días desde IA anterior`}
      </p>
    )}
  </div>
)}

{ev.tipo === "Parto" && (
  <div className="mt-1 space-y-0.5">
    {ev.nombre_cria && (
      <p className="text-xs text-muted-foreground">
        Cría: {ev.nombre_cria}
      </p>
    )}

    {ev.sexo_cria && (
      <p className="text-xs text-muted-foreground">
        Sexo: {ev.sexo_cria}
      </p>
    )}

    {ev.peso_cria && (
      <p className="text-xs text-muted-foreground">
        Peso al nacer: {ev.peso_cria} kg
      </p>
    )}

    {typeof intervalosReproductivos.get(ev) === "number" && (
      <p className="text-xs text-muted-foreground">
        {intervalosReproductivos.get(ev) === 0
          ? "Intervalo: mismo día"
          : `Intervalo entre partos: ${intervalosReproductivos.get(ev)} días`}
      </p>
    )}
  </div>
)}

{ev.veterinario && (
  <p className="text-xs text-muted-foreground">Vet: {ev.veterinario}</p>
)}

{ev.resultado && (
  <p className="text-xs text-blue-600 font-semibold">
    Resultado: {ev.resultado}
  </p>
)}

{ev.notas && (
  <p className="text-xs text-muted-foreground">{ev.notas}</p>
)}

{ev.descripcion && ev.descripcion !== ev.notas && (
  <p className="text-xs text-muted-foreground">{ev.descripcion}</p>
)}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(ev.fecha)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salud */}
      {tab === "Salud" && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground">Historial de salud</h3></div>
            {eventosSalud.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No hay eventos de salud registrados para este animal.</p>
            ) : (
              <div className="divide-y divide-border">
                {eventosSalud.map((ev, i) => {
                  const retiroHasta = retiroHastaEvento(ev);

                  return (
                    <div key={ev.id || i} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-xl">{TIPO_EMOJI[ev.tipo] || '📋'}</span>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">{ev.tipo}</p>
                        {ev.medicamento && (
                          <p className="text-xs text-muted-foreground">
                            Medicamento/Vacuna: {ev.medicamento}
                          </p>
                        )}
                        {ev.medicina_nombre && (
                          <p className="text-xs text-muted-foreground">
                            Inventario: {ev.medicina_nombre}
                            {ev.medicina_tipo ? ` · ${ev.medicina_tipo}` : ""}
                            {ev.medicina_lote ? ` · Lote ${ev.medicina_lote}` : ""}
                          </p>
                        )}
                        {ev.medicina_cantidad_usada != null && (
                          <p className="text-xs text-muted-foreground">
                            Cantidad usada: {ev.medicina_cantidad_usada} {ev.medicina_unidad_medida || ""}
                          </p>
                        )}
                        {ev.dosis && (
                          <p className="text-xs text-muted-foreground">Dosis: {ev.dosis}</p>
                        )}
                        {ev.veterinario && (
                          <p className="text-xs text-muted-foreground">Vet: {ev.veterinario}</p>
                        )}
                        {ev.descripcion && (
                          <p className="text-xs text-muted-foreground">{ev.descripcion}</p>
                        )}
                        {ev.notas && (
                          <p className="text-xs text-muted-foreground">{ev.notas}</p>
                        )}
                        {ev.requiere_retiro_leche && (
                          <div className="pt-1 text-xs text-red-600 font-semibold space-y-0.5">
                            <p>Retiro de leche: sí</p>
                            <p>Días de retiro: {ev.dias_retiro || 0}</p>
                            {retiroHasta && <p>Retiro hasta: {formatDate(retiroHasta)}</p>}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(ev.fecha)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Historial */}
      {tab === "Historial" && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Historial completo del animal</h3>
            </div>

            {eventosOrdenados.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                No existen eventos registrados para este animal.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {eventosOrdenados.map((ev, i) => (
                  <div key={ev.id || i} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-xl">{TIPO_EMOJI[ev.tipo] || "📋"}</span>

                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {ev.tipo === "Inseminacion"
                          ? `${ev.numero_inseminacion ? `IA #${ev.numero_inseminacion} · ` : ""}Inseminación`
                          : ev.tipo}
                      </p>

                      {ev.tipo === "Inseminacion" && ev.toro_nombre && (
                        <p className="text-xs text-muted-foreground">Toro: {ev.toro_nombre}</p>
                      )}

                      {ev.tipo === "Parto" && ev.nombre_cria && (
                        <p className="text-xs text-muted-foreground">Cría: {ev.nombre_cria}</p>
                      )}

                      {ev.tipo === "Parto" && ev.sexo_cria && (
                        <p className="text-xs text-muted-foreground">Sexo cría: {ev.sexo_cria}</p>
                      )}

                      {ev.resultado && (
                        <p className="text-xs text-blue-600 font-semibold">Resultado: {ev.resultado}</p>
                      )}

                      {ev.medicamento && (
                        <p className="text-xs text-muted-foreground">Medicamento/Vacuna: {ev.medicamento}</p>
                      )}

                      {ev.medicina_nombre && (
                        <p className="text-xs text-muted-foreground">
                          Inventario: {ev.medicina_nombre}
                          {ev.medicina_tipo ? ` · ${ev.medicina_tipo}` : ""}
                          {ev.medicina_lote ? ` · Lote ${ev.medicina_lote}` : ""}
                        </p>
                      )}

                      {ev.medicina_cantidad_usada != null && (
                        <p className="text-xs text-muted-foreground">
                          Cantidad usada: {ev.medicina_cantidad_usada} {ev.medicina_unidad_medida || ""}
                        </p>
                      )}

                      {ev.dosis && (
                        <p className="text-xs text-muted-foreground">Dosis: {ev.dosis}</p>
                      )}

                      {ev.veterinario && (
                        <p className="text-xs text-muted-foreground">Vet: {ev.veterinario}</p>
                      )}

                      {ev.grupo_anterior || ev.grupo_nuevo ? (
                        <p className="text-xs text-muted-foreground">
                          Grupo: {ev.grupo_anterior || "?"} → {ev.grupo_nuevo || "?"}
                        </p>
                      ) : null}

                      {ev.descripcion && (
                        <p className="text-xs text-muted-foreground">{ev.descripcion}</p>
                      )}

                      {ev.notas && ev.notas !== ev.descripcion && (
                        <p className="text-xs text-muted-foreground">{ev.notas}</p>
                      )}

                      {ev.requiere_retiro_leche && (
                        <p className="text-xs text-red-600 font-semibold">
                          Retiro de leche: {ev.dias_retiro || 0} días
                        </p>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(ev.fecha)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agrupamiento */}
      {tab === "Agrupamiento" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Grupo actual</h3>
            <p className="text-2xl font-bold text-foreground">{animal.grupo || "Sin grupo"}</p>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground">Historial de grupos</h3></div>
            {eventosOrdenados.filter(e => e.tipo === "Cambio de grupo").length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Sin cambios de grupo registrados</p>
            ) : (
              <div className="divide-y divide-border">
                {eventosOrdenados.filter(e => e.tipo === "Cambio de grupo").map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl">👥</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{ev.grupo_anterior || '?'} → {ev.grupo_nuevo || '?'}</p>
                      {ev.notas && <p className="text-xs text-muted-foreground">{ev.notas}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(ev.fecha)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

{tab === "Pedigrí" && (
  <div className="space-y-4">
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4">Árbol genealógico</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start text-sm">
        <div className="bg-secondary/40 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Animal</p>
          <p className="font-bold text-foreground">{animal.nombre}</p>
          <p className="text-xs text-muted-foreground">{animal.numero_id || "-"}</p>
        </div>

        <div className="space-y-3">
<div
  className={`bg-blue-50 rounded-xl p-4 ${
    padre ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""
  }`}
  onClick={() => {
    if (padre) {
      setTab("General");
      onSelectAnimal?.(padre);
    }
  }}
>
            <p className="text-xs text-muted-foreground mb-1">Padre</p>
            <p className="font-bold text-foreground">{padre?.nombre || animal.padre_nombre || "-"}</p>
            <p className="text-xs text-muted-foreground">{padre?.numero_id || animal.padre_id || "-"}</p>
          </div>

            <div
  className={`bg-pink-50 rounded-xl p-4 ${
    madre ? "cursor-pointer hover:ring-2 hover:ring-primary/30" : ""
  }`}
  onClick={() => {
    if (madre) {
      setTab("General");
      onSelectAnimal?.(madre);
    }
  }}
>
              <p className="text-xs text-muted-foreground mb-1">Madre</p>
              <p className="font-bold text-foreground">
                {madre?.nombre || animal.madre_nombre || animal.madre_id || "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                {madre?.numero_id || animal.madre_id || "-"}
              </p>
            </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-blue-50/60 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Abuelo paterno</p>
            <p className="font-semibold">{abueloPaterno?.nombre || "-"}</p>
          </div>
          <div className="bg-pink-50/60 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Abuela paterna</p>
            <p className="font-semibold">{abuelaPaterna?.nombre || "-"}</p>
          </div>
          <div className="bg-blue-50/60 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Abuelo materno</p>
            <p className="font-semibold">{abueloMaterno?.nombre || "-"}</p>
          </div>
          <div className="bg-pink-50/60 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Abuela materna</p>
            <p className="font-semibold">{abuelaMaterna?.nombre || "-"}</p>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Hijos/as</h3>
      </div>

      {hijos.length === 0 ? (
        <p className="text-center text-muted-foreground py-6 text-sm">Sin hijos registrados</p>
      ) : (
        <div className="divide-y divide-border">
          {hijos.map(hijo => (
            <div key={hijo.id} className="px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{hijo.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {hijo.numero_id || "-"} · {hijo.raza || "-"} · {calcularEdad(hijo.fecha_nacimiento)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}
      {showEventoModal && (
        <EventoRapidoModal
          animal={animal}
          onClose={() => setShowEventoModal(false)}
          onSave={() => { setShowEventoModal(false); refetchEventos(); }}
        />
      )}
    </div>
  );
}

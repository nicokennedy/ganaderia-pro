import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ANIMALS_QUERY_KEY, animalService } from "@/services/animalService";
import { MILK_RECORDS_QUERY_KEY, milkRecordService } from "@/services/milkRecordService";
import { formatDate, calcularEdad } from "@/lib/utils";
import EstadoBadge from "@/components/shared/EstadoBadge";
import { Search, Plus, Eye, Edit, Milk, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AnimalModal from "@/components/ganado/AnimalModal";
import AnimalDetalle from "@/components/ganado/AnimalDetalle";

const FILTROS = [
  { key: "Todos", label: "Todos" },
  { key: "Ordeño", label: "Ordeño" },
  { key: "Seca", label: "Seca" },
  { key: "Preparto", label: "Preparto" },
  { key: "Ternera", label: "Terneras" },
  { key: "Vacona", label: "Vaconas" },
  { key: "Toro", label: "Toros" },
  { key: "Enfermería", label: "Enfermería" },
  { key: "Vendida", label: "Vendidas" },
  { key: "Muerta", label: "Muertas" },
];

function parseLitros(value) {
  return parseFloat(value) || 0;
}

function formatLitros(value) {
  const litros = parseLitros(value);
  return Number.isInteger(litros) ? String(litros) : litros.toFixed(1);
}

export default function Ganado() {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [animalEditar, setAnimalEditar] = useState(null);
  const [animalDetalle, setAnimalDetalle] = useState(null);
  const [orden, setOrden] = useState({ campo: "nombre", direccion: "asc" });

  const queryClient = useQueryClient();
  const hoy = new Date().toISOString().split('T')[0];

  const { data: animales = [], isLoading } = useQuery({
    queryKey: ANIMALS_QUERY_KEY,
    queryFn: animalService.list,
  });

  const { data: registrosLeche = [] } = useQuery({
    queryKey: MILK_RECORDS_QUERY_KEY,
    queryFn: milkRecordService.list,
  });

  const registrosHoyPorAnimal = registrosLeche.reduce((acc, record) => {
    if (record.fecha === hoy) {
      acc[record.animal_id] = record;
    }
    return acc;
  }, {});

  const produccionHoyAnimal = (animal) => {
    const registroHoy = registrosHoyPorAnimal[animal.id];

    if (registroHoy) {
      const am = parseLitros(registroHoy.litros_am);
      const pm = parseLitros(registroHoy.litros_pm);
      const total = registroHoy.total_litros !== null && registroHoy.total_litros !== undefined
        ? parseLitros(registroHoy.total_litros)
        : am + pm;

      return {
        am,
        pm,
        total,
        hasSplit: registroHoy.litros_am != null || registroHoy.litros_pm != null,
      };
    }

    const am = parseLitros(animal.produccion_am);
    const pm = parseLitros(animal.produccion_pm);
    const total = parseLitros(animal.produccion_diaria_litros) || am + pm;

    return {
      am,
      pm,
      total,
      hasSplit: animal.produccion_am != null || animal.produccion_pm != null,
    };
  };

  const handleSave = async (animalActualizado) => {
    await queryClient.invalidateQueries({ queryKey: ANIMALS_QUERY_KEY });

    setShowModal(false);
    setAnimalEditar(null);

      if (animalDetalle?.id && animalActualizado?.id === animalDetalle.id) {
    setAnimalDetalle(prev => ({
      ...prev,
      ...animalActualizado,
    }));
}
  };

  const filtrados = animales.filter(a => {
    const matchEstado = filtroEstado === "Todos" || a.estado === filtroEstado;
    const matchBusqueda = !busqueda ||
      a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.numero_id?.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const produccionAnimal = (animal) => produccionHoyAnimal(animal).total;
  const valorOrden = (animal, campo) => {
    switch (campo) {
      case "nombre":
        return animal.nombre || "";
      case "arete":
        return animal.arete || "";
      case "numero_id":
        return animal.numero_id || "";
      case "estado":
        return animal.estado || "";
      case "estado_reproductivo":
        return animal.estado === "Toro" ? animal.tipo_toro || "" : animal.estado_reproductivo || "";
      case "fecha_nacimiento":
        return animal.fecha_nacimiento || "";
      case "produccion":
        return produccionAnimal(animal);
      default:
        return "";
    }
  };
  const compararValores = (a, b) => {
    if (typeof a === "number" || typeof b === "number") {
      return Number(a || 0) - Number(b || 0);
    }

    return String(a || "").localeCompare(String(b || ""), "es", {
      numeric: true,
      sensitivity: "base",
    });
  };
  const filtradosOrdenados = [...filtrados].sort((a, b) => {
    const result = compararValores(valorOrden(a, orden.campo), valorOrden(b, orden.campo));
    return orden.direccion === "asc" ? result : -result;
  });
  const cambiarOrden = (campo) => {
    setOrden(prev => ({
      campo,
      direccion: prev.campo === campo && prev.direccion === "asc" ? "desc" : "asc",
    }));
  };
  const indicadorOrden = (campo) => {
    if (orden.campo !== campo) return "↕";
    return orden.direccion === "asc" ? "↑" : "↓";
  };
  const headerOrdenClass = "text-left text-xs font-semibold text-muted-foreground px-4 py-3 hover:text-foreground transition-colors";

  const conteos = FILTROS.slice(1).reduce((acc, f) => {
    acc[f.key] = animales.filter(a => a.estado === f.key).length;
    return acc;
  }, {});

  const totalActivos = animales.filter(a => !["Vendida", "Muerta"].includes(a.estado)).length;

  // Quick stats
  const enOrdenio = animales.filter(a => a.estado === "Ordeño").length;
  const enRetiro = animales.filter(a => a.retiro_leche_hasta && a.retiro_leche_hasta >= hoy).length;
  const produccionTotal = animales.filter(a => a.estado === "Ordeño")
    .reduce((s, a) => s + produccionHoyAnimal(a).total, 0);

if (animalDetalle) {
  return (
    <>
      <AnimalDetalle
        animal={animalDetalle}
        animales={animales}
        animalesNavegacion={filtradosOrdenados}
        onBack={() => setAnimalDetalle(null)}
        onEdit={() => { setAnimalEditar(animalDetalle); setShowModal(true); }}
        onSelectAnimal={(animalSeleccionado) => setAnimalDetalle(animalSeleccionado)}
      />

      {showModal && (
        <AnimalModal
          animal={animalEditar}
           animales={animales}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario de Ganado</h1>
          <p className="text-muted-foreground text-sm">{totalActivos} animales activos</p>
        </div>
        <Button onClick={() => { setAnimalEditar(null); setShowModal(true); }} className="bg-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Animal</span>
        </Button>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">En Ordeño</p>
          <p className="text-2xl font-bold text-green-600">{enOrdenio}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Producción hoy</p>
          <p className="text-2xl font-bold text-primary">{produccionTotal.toFixed(0)}L</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${enRetiro > 0 ? 'bg-red-50 border-red-200' : 'bg-card border-border'}`}>
          <p className="text-xs text-muted-foreground mb-1">En retiro leche</p>
          <p className={`text-2xl font-bold ${enRetiro > 0 ? 'text-red-600' : 'text-foreground'}`}>{enRetiro}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filtroEstado === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-primary/10'
            }`}
          >
            {f.label} {f.key !== "Todos" ? `(${conteos[f.key] || 0})` : `(${animales.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o ID..."
          className="pl-9"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando animales...</div>
      ) : filtradosOrdenados.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <p className="text-4xl mb-3">🐄</p>
          <p className="text-foreground font-semibold">No hay animales en este filtro</p>
          <Button onClick={() => { setAnimalEditar(null); setShowModal(true); }} className="mt-4 bg-primary text-primary-foreground">
            + Agregar animal
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-auto max-h-[70vh]">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-secondary/50">
                <tr>
                  <th className={headerOrdenClass}>
                    <button type="button" onClick={() => cambiarOrden("nombre")} className="flex items-center gap-1">
                      ID / Nombre <span>{indicadorOrden("nombre")}</span>
                    </button>
                  </th>
                  <th className={headerOrdenClass}>
                    <button type="button" onClick={() => cambiarOrden("arete")} className="flex items-center gap-1">
                      Arete <span>{indicadorOrden("arete")}</span>
                    </button>
                  </th>
                  <th className={headerOrdenClass}>
                    <button type="button" onClick={() => cambiarOrden("numero_id")} className="flex items-center gap-1">
                      ID oficial <span>{indicadorOrden("numero_id")}</span>
                    </button>
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Raza</th>
                  <th className={headerOrdenClass}>
                    <button type="button" onClick={() => cambiarOrden("fecha_nacimiento")} className="flex items-center gap-1">
                      Edad <span>{indicadorOrden("fecha_nacimiento")}</span>
                    </button>
                  </th>
                  <th className={headerOrdenClass}>
                    <button type="button" onClick={() => cambiarOrden("estado")} className="flex items-center gap-1">
                      Estado <span>{indicadorOrden("estado")}</span>
                    </button>
                  </th>
                  <th className={headerOrdenClass}>
                    <button type="button" onClick={() => cambiarOrden("estado_reproductivo")} className="flex items-center gap-1">
                      Reproductivo <span>{indicadorOrden("estado_reproductivo")}</span>
                    </button>
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Grupo</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">
                    <button type="button" onClick={() => cambiarOrden("produccion")} className="ml-auto flex items-center gap-1 hover:text-foreground transition-colors">
                      AM / PM <span>{indicadorOrden("produccion")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtradosOrdenados.slice(0, 100).map(animal => {
                  const enRetiro = animal.retiro_leche_hasta && animal.retiro_leche_hasta >= hoy;
                  const produccionHoy = produccionHoyAnimal(animal);
                  return (
                    <tr key={animal.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setAnimalDetalle(animal)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {enRetiro && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                          <div>
                            <p className="font-semibold text-sm text-foreground">{animal.nombre}</p>
                            <p className="text-xs text-muted-foreground">{animal.numero_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{animal.arete || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{animal.numero_id || '-'}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{animal.raza || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{calcularEdad(animal.fecha_nacimiento)}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={animal.estado} /></td>
                      <td className="px-4 py-3">
                      {animal.estado === "Toro" ? (
  animal.tipo_toro ? (
    <EstadoBadge
      estado={animal.tipo_toro === "en_explotacion" ? "En explotación" : "Solo genética"}
      type="reproductivo"
    />
  ) : (
    <span className="text-muted-foreground text-xs">-</span>
  )
) : (
  animal.estado_reproductivo ? (
    <EstadoBadge estado={animal.estado_reproductivo} type="reproductivo" />
  ) : (
    <span className="text-muted-foreground text-xs">-</span>
  )
)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{animal.grupo || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {animal.estado === "Ordeño" ? (
                          <div className="flex items-center justify-end gap-1">
                            <Milk className="w-3.5 h-3.5 text-primary" />
                            <span className="text-sm font-semibold text-primary">
                              {produccionHoy.hasSplit
                                ? `${formatLitros(produccionHoy.am)}/${formatLitros(produccionHoy.pm)}L`
                                : `${formatLitros(produccionHoy.total)}L`}
                            </span>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setAnimalEditar(animal); setShowModal(true); }}
                          className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filtradosOrdenados.slice(0, 50).map(animal => {
              const enRetiro = animal.retiro_leche_hasta && animal.retiro_leche_hasta >= hoy;
              const produccionHoy = produccionHoyAnimal(animal);
              return (
                <div key={animal.id} className={`bg-card rounded-xl border p-4 ${enRetiro ? 'border-red-200' : 'border-border'}`}
                  onClick={() => setAnimalDetalle(animal)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {enRetiro && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        <p className="font-semibold text-foreground">{animal.nombre}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{animal.numero_id} · {animal.raza} · {calcularEdad(animal.fecha_nacimiento)}</p>
                    </div>
                    <EstadoBadge estado={animal.estado} />
                  </div>
                  {animal.estado === "Ordeño" && (
                    <p className="text-sm text-primary font-semibold mt-2">
                      🥛 {formatLitros(produccionHoy.total)}L/día
                      {produccionHoy.hasSplit ? ` (AM:${formatLitros(produccionHoy.am)} PM:${formatLitros(produccionHoy.pm)})` : ""}
                    </p>
                  )}
                  {animal.grupo && <p className="text-xs text-muted-foreground mt-1">👥 {animal.grupo}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <AnimalModal
          animal={animalEditar}
           animales={animales}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

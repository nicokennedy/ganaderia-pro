import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Calendar, ClipboardList, Dna, MapPin, Milk, PackageSearch, Pill, Search, Users } from "lucide-react";
import { ANIMALS_QUERY_KEY, animalService } from "@/services/animalService";
import { EVENTOS_QUERY_KEY, eventoService } from "@/services/eventoService";
import { INVENTARIO_IA_QUERY_KEY, inventarioIAService } from "@/services/inventarioIAService";
import {
  INVENTARIO_MEDICINA_QUERY_KEY,
  inventarioMedicinaService,
} from "@/services/inventarioMedicinaService";
import { POTREROS_QUERY_KEY, potreroService } from "@/services/potreroService";
import { Input } from "@/components/ui/input";

const SECTION_RESULTS = [
  { label: "Ganado", path: "/ganado", icon: Users, keywords: "animales vacas arete inventario ganado" },
  { label: "Potreros", path: "/potreros", icon: MapPin, keywords: "potreros pastura verdeo corral superficie campo" },
  { label: "Eventos", path: "/eventos/nuevo", icon: ClipboardList, keywords: "eventos tratamiento vacuna diagnostico revision" },
  { label: "Registro Lechero", path: "/registro-leche", icon: Milk, keywords: "leche registro produccion ordeño am pm" },
  { label: "Inventario Medicinas", path: "/inventario-medicinas", icon: Pill, keywords: "medicina vacuna stock sanitario" },
  { label: "Inventario IA", path: "/inventario-ia", icon: Dna, keywords: "inseminacion pajuela toro ia genética" },
  { label: "Calendario", path: "/calendario", icon: Calendar, keywords: "calendario agenda fechas" },
];

function useDebouncedValue(value, delay = 220) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function matches(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const debouncedQuery = useDebouncedValue(query);
  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const shouldSearch = open && normalizedQuery.length >= 2;

  const { data: animales = [] } = useQuery({
    queryKey: ANIMALS_QUERY_KEY,
    queryFn: animalService.list,
    enabled: open,
    staleTime: 60_000,
  });

  const { data: eventos = [] } = useQuery({
    queryKey: [...EVENTOS_QUERY_KEY, "global-search"],
    queryFn: () => eventoService.list({ limit: 80 }),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: medicinas = [] } = useQuery({
    queryKey: [...INVENTARIO_MEDICINA_QUERY_KEY, "global-search"],
    queryFn: () => inventarioMedicinaService.list(),
    enabled: open,
    staleTime: 60_000,
  });

  const { data: inventarioIA = [] } = useQuery({
    queryKey: [...INVENTARIO_IA_QUERY_KEY, "global-search"],
    queryFn: () => inventarioIAService.list(),
    enabled: open,
    staleTime: 60_000,
  });

  const { data: potreros = [] } = useQuery({
    queryKey: [...POTREROS_QUERY_KEY, "global-search"],
    queryFn: potreroService.list,
    enabled: open,
    staleTime: 60_000,
  });

  useEffect(() => {
    const handleClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const groupedResults = useMemo(() => {
    if (!shouldSearch) {
      return { animales: [], eventos: [], potreros: [], inventario: [], secciones: [] };
    }

    const animalResults = animales
      .filter((animal) =>
        matches(animal.nombre, normalizedQuery) ||
        matches(animal.arete, normalizedQuery) ||
        matches(animal.numero_id, normalizedQuery) ||
        matches(animal.numero_registro, normalizedQuery)
      )
      .slice(0, 6)
      .map((animal) => ({
        id: `animal-${animal.id}`,
        title: animal.nombre,
        subtitle: [animal.numero_id ? `ID ${animal.numero_id}` : null, animal.arete ? `Arete ${animal.arete}` : null].filter(Boolean).join(" · "),
        onSelect: () => {
          window.sessionStorage.setItem("globalSearchAnimalId", String(animal.id));
          window.dispatchEvent(new CustomEvent("open-animal-detail", { detail: { animalId: animal.id } }));
          navigate("/ganado");
        },
      }));

    const eventResults = eventos
      .filter((evento) =>
        matches(evento.tipo, normalizedQuery) ||
        matches(evento.descripcion, normalizedQuery) ||
        matches(evento.notas, normalizedQuery) ||
        matches(evento.animal_nombre, normalizedQuery) ||
        matches(evento.medicamento, normalizedQuery) ||
        matches(evento.medicina_nombre, normalizedQuery)
      )
      .slice(0, 5)
      .map((evento) => ({
        id: `evento-${evento.id}`,
        title: evento.tipo,
        subtitle: [evento.animal_nombre, evento.descripcion || evento.notas, evento.fecha].filter(Boolean).join(" · "),
        onSelect: () => navigate("/eventos/nuevo"),
      }));

    const medicinaResults = medicinas
      .filter((item) =>
        matches(item.nombre, normalizedQuery) ||
        matches(item.tipo, normalizedQuery) ||
        matches(item.categoria, normalizedQuery) ||
        matches(item.lote, normalizedQuery) ||
        matches(item.laboratorio, normalizedQuery)
      )
      .slice(0, 5)
      .map((item) => ({
        id: `medicina-${item.id}`,
        title: item.nombre,
        subtitle: [item.tipo, item.lote ? `Lote ${item.lote}` : null, `Stock ${item.stock_actual ?? 0}`].filter(Boolean).join(" · "),
        onSelect: () => navigate("/inventario-medicinas"),
      }));

    const iaResults = inventarioIA
      .filter((item) =>
        matches(item.toro_nombre, normalizedQuery) ||
        matches(item.toro_id, normalizedQuery) ||
        matches(item.proveedor, normalizedQuery) ||
        matches(item.canastilla, normalizedQuery)
      )
      .slice(0, 4)
      .map((item) => ({
        id: `ia-${item.id}`,
        title: item.toro_nombre || "Pajuela IA",
        subtitle: [item.proveedor, item.canastilla ? `Canastilla ${item.canastilla}` : null, `Stock ${item.stock_actual ?? 0}`].filter(Boolean).join(" · "),
        onSelect: () => navigate("/inventario-ia"),
      }));

    const potreroResults = potreros
      .filter((potrero) =>
        matches(potrero.nombre, normalizedQuery) ||
        matches(potrero.numero, normalizedQuery) ||
        matches(potrero.codigo, normalizedQuery) ||
        matches(potrero.tipo, normalizedQuery) ||
        matches(potrero.estado, normalizedQuery)
      )
      .slice(0, 5)
      .map((potrero) => ({
        id: `potrero-${potrero.id}`,
        title: potrero.nombre,
        subtitle: [potrero.numero ? `Código ${potrero.numero}` : null, potrero.tipo, potrero.estado].filter(Boolean).join(" · "),
        icon: MapPin,
        onSelect: () => {
          window.sessionStorage.setItem("globalSearchPotreroId", String(potrero.id));
          window.dispatchEvent(new CustomEvent("open-potrero-detail", { detail: { potreroId: potrero.id } }));
          navigate("/potreros");
        },
      }));

    const sectionResults = SECTION_RESULTS
      .filter((section) => matches(section.label, normalizedQuery) || matches(section.keywords, normalizedQuery))
      .slice(0, 5)
      .map((section) => ({
        id: `section-${section.path}`,
        title: section.label,
        subtitle: "Ir a sección",
        icon: section.icon,
        onSelect: () => navigate(section.path),
      }));

    return {
      animales: animalResults,
      eventos: eventResults,
      potreros: potreroResults,
      inventario: [...medicinaResults, ...iaResults].slice(0, 7),
      secciones: sectionResults,
    };
  }, [animales, eventos, inventarioIA, medicinas, navigate, normalizedQuery, potreros, shouldSearch]);

  const resultCount = Object.values(groupedResults).reduce((sum, group) => sum + group.length, 0);

  const handleSelect = (result) => {
    result.onSelect();
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder="Buscar animal, evento, medicina..."
        className="h-9 pl-9 pr-3 bg-background"
      />

      {open && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[70vh] overflow-auto rounded-lg border border-border bg-popover shadow-lg">
          {!shouldSearch ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Escribí al menos 2 caracteres.</p>
          ) : resultCount === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-muted-foreground">Sin resultados</p>
          ) : (
            <div className="py-2">
              <ResultGroup title="Animales" results={groupedResults.animales} onSelect={handleSelect} defaultIcon={Users} />
              <ResultGroup title="Eventos" results={groupedResults.eventos} onSelect={handleSelect} defaultIcon={ClipboardList} />
              <ResultGroup title="Potreros" results={groupedResults.potreros} onSelect={handleSelect} defaultIcon={MapPin} />
              <ResultGroup title="Inventario" results={groupedResults.inventario} onSelect={handleSelect} defaultIcon={PackageSearch} />
              <ResultGroup title="Secciones" results={groupedResults.secciones} onSelect={handleSelect} defaultIcon={Search} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, results, onSelect, defaultIcon: DefaultIcon }) {
  if (results.length === 0) return null;

  return (
    <div className="py-1">
      <p className="px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {results.map((result) => {
        const Icon = result.icon || DefaultIcon;

        return (
          <button
            key={result.id}
            type="button"
            onClick={() => onSelect(result)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/60"
          >
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{result.title}</span>
              {result.subtitle && (
                <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

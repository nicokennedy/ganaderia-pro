import { apiClient } from "./apiClient";

// Prefijo usado para invalidar todas las variantes de la query de eventos.
export const EVENTOS_QUERY_KEY = ["eventos"];

// Query key parametrizada: cada combinación de filtros/límite tiene su propia
// entrada de caché, para que React Query no comparta resultados entre pantallas
// con distinto limit/animal_id.
export const eventosQueryKey = (params = {}) => ["eventos", params];

const DECIMAL_FIELDS = ["valor_litros", "valor_usd", "peso_cria", "medicina_cantidad_usada"];

function toNum(value) {
  if (value === null || value === undefined || value === "") return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function normalizeEvento(e) {
  if (!e) return e;
  return DECIMAL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: toNum(acc[f]) }), { ...e });
}

function normalizeEventos(items) {
  return Array.isArray(items) ? items.map(normalizeEvento) : items;
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  if (params.animal_id != null) qs.set("animal_id", params.animal_id);
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.limit) qs.set("limit", params.limit);
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export const eventoService = {
  async list(params = {}) {
    const items = await apiClient.get(`/api/eventos${buildQuery(params)}`);
    return normalizeEventos(items);
  },
  async create(data) {
    const item = await apiClient.post("/api/eventos", data);
    return normalizeEvento(item);
  },
  async bulkCreate(data) {
    const result = await apiClient.post("/api/eventos/bulk_create", data);
    return {
      ...result,
      eventos: normalizeEventos(result?.eventos),
    };
  },
};

import { apiClient } from "./apiClient";

export const LITROS_LIBRES_QUERY_KEY = ["litros-libres-records"];

const NUMBER_FIELDS = [
  "produccion_total_dia",
  "balanceado_kg_dia",
  "costo_por_kg",
  "precio_leche_litro",
  "costo_balanceado",
  "ingreso_leche",
  "margen_simple",
  "litros_libres",
];

function toNum(value) {
  if (value === null || value === undefined || value === "") return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function normalizeRecord(record) {
  if (!record) return record;
  return NUMBER_FIELDS.reduce((acc, field) => ({ ...acc, [field]: toNum(acc[field]) }), { ...record });
}

function normalizeRecords(items) {
  return Array.isArray(items) ? items.map(normalizeRecord) : items;
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  if (params.animal_id != null) qs.set("animal_id", params.animal_id);
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export const litrosLibresService = {
  async list(params = {}) {
    const items = await apiClient.get(`/api/litros_libres_records${buildQuery(params)}`);
    return normalizeRecords(items);
  },
  async create(data) {
    const item = await apiClient.post("/api/litros_libres_records", data);
    return normalizeRecord(item);
  },
  async update(id, data) {
    const item = await apiClient.patch(`/api/litros_libres_records/${id}`, data);
    return normalizeRecord(item);
  },
  destroy(id) {
    return apiClient.delete(`/api/litros_libres_records/${id}`);
  },
};

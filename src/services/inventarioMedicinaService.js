import { apiClient } from "./apiClient";

export const INVENTARIO_MEDICINA_QUERY_KEY = ["inventario-medicinas"];

const NUMBER_FIELDS = ["stock_actual", "stock_minimo"];

function toNum(value) {
  if (value === null || value === undefined || value === "") return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function normalizeItem(item) {
  if (!item) return item;
  return NUMBER_FIELDS.reduce((acc, f) => ({ ...acc, [f]: toNum(acc[f]) }), { ...item });
}

function normalizeItems(items) {
  return Array.isArray(items) ? items.map(normalizeItem) : items;
}

export const inventarioMedicinaService = {
  async list(params = {}) {
    const query = params.activos ? "?activos=true" : "";
    const items = await apiClient.get(`/api/inventario_medicinas${query}`);
    return normalizeItems(items);
  },
  async create(data) {
    const item = await apiClient.post("/api/inventario_medicinas", data);
    return normalizeItem(item);
  },
  async update(id, data) {
    const item = await apiClient.patch(`/api/inventario_medicinas/${id}`, data);
    return normalizeItem(item);
  },
  destroy(id) {
    return apiClient.delete(`/api/inventario_medicinas/${id}`);
  },
};

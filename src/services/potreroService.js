import { apiClient } from "./apiClient";

export const POTREROS_QUERY_KEY = ["potreros"];

const DECIMAL_FIELDS = ["area", "hectareas", "superficie", "capacidad", "capacidad_animales", "capacidad_estimada", "animales_actuales"];

function toNum(value) {
  if (value === null || value === undefined || value === "") return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function normalizePotrero(p) {
  if (!p) return p;
  return DECIMAL_FIELDS.reduce((acc, f) => ({ ...acc, [f]: toNum(acc[f]) }), { ...p });
}

function normalizePotreros(items) {
  return Array.isArray(items) ? items.map(normalizePotrero) : items;
}

export const potreroService = {
  async list() {
    const items = await apiClient.get("/api/potreros");
    return normalizePotreros(items);
  },
  async create(data) {
    const item = await apiClient.post("/api/potreros", data);
    return normalizePotrero(item);
  },
  async update(id, data) {
    const item = await apiClient.patch(`/api/potreros/${id}`, data);
    return normalizePotrero(item);
  },
  destroy(id) {
    return apiClient.delete(`/api/potreros/${id}`);
  },
};

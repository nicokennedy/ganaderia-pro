import { apiClient } from "./apiClient";

export const POTRERO_TRABAJOS_QUERY_KEY = ["potrero-trabajos"];

const NUMBER_FIELDS = ["costo", "dias_reingreso"];

function toNum(value) {
  if (value === null || value === undefined || value === "") return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function normalizeTrabajo(trabajo) {
  if (!trabajo) return trabajo;
  return NUMBER_FIELDS.reduce((acc, f) => ({ ...acc, [f]: toNum(acc[f]) }), { ...trabajo });
}

function normalizeTrabajos(items) {
  return Array.isArray(items) ? items.map(normalizeTrabajo) : items;
}

export const potreroTrabajoService = {
  async list(params = {}) {
    const query = params.potrero_id ? `?potrero_id=${params.potrero_id}` : "";
    const items = await apiClient.get(`/api/potrero_trabajos${query}`);
    return normalizeTrabajos(items);
  },
  async listByPotrero(potreroId) {
    const items = await apiClient.get(`/api/potreros/${potreroId}/potrero_trabajos`);
    return normalizeTrabajos(items);
  },
  async create(potreroId, data) {
    const item = await apiClient.post(`/api/potreros/${potreroId}/potrero_trabajos`, data);
    return normalizeTrabajo(item);
  },
  async update(id, data) {
    const item = await apiClient.patch(`/api/potrero_trabajos/${id}`, data);
    return normalizeTrabajo(item);
  },
  destroy(id) {
    return apiClient.delete(`/api/potrero_trabajos/${id}`);
  },
};

import { apiClient } from "./apiClient";

export const POTRERO_ROTACIONES_QUERY_KEY = ["potrero-rotaciones"];

const NUMBER_FIELDS = ["cantidad_animales", "dias_ocupacion", "dias_rotacion"];

function toNum(value) {
  if (value === null || value === undefined || value === "") return value;
  const n = Number(value);
  return Number.isNaN(n) ? value : n;
}

function normalizeRotacion(rotacion) {
  if (!rotacion) return rotacion;
  return NUMBER_FIELDS.reduce((acc, field) => ({ ...acc, [field]: toNum(acc[field]) }), { ...rotacion });
}

function normalizeRotaciones(items) {
  return Array.isArray(items) ? items.map(normalizeRotacion) : items;
}

export const potreroRotacionService = {
  async list(params = {}) {
    const query = params.potrero_id ? `?potrero_id=${params.potrero_id}` : "";
    const items = await apiClient.get(`/api/potrero_rotaciones${query}`);
    return normalizeRotaciones(items);
  },
  async listByPotrero(potreroId) {
    const items = await apiClient.get(`/api/potreros/${potreroId}/potrero_rotaciones`);
    return normalizeRotaciones(items);
  },
  async create(potreroId, data) {
    const item = await apiClient.post(`/api/potreros/${potreroId}/potrero_rotaciones`, data);
    return normalizeRotacion(item);
  },
  async update(id, data) {
    const item = await apiClient.patch(`/api/potrero_rotaciones/${id}`, data);
    return normalizeRotacion(item);
  },
  destroy(id) {
    return apiClient.delete(`/api/potrero_rotaciones/${id}`);
  },
};

import { apiClient } from "./apiClient";

export const ANIMALS_QUERY_KEY = ["animals"];

const DECIMAL_FIELDS = [
  "peso_kg",
  "produccion_diaria_litros",
  "produccion_am",
  "produccion_pm",
  "racion_balanceado_kg",
  "costo_balanceado_kg",
  "precio_leche_litro",
];

function toNumberOrOriginal(value) {
  if (value === null || value === undefined || value === "") return value;

  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

function normalizeAnimal(animal) {
  if (!animal) return animal;

  return DECIMAL_FIELDS.reduce(
    (normalized, field) => ({
      ...normalized,
      [field]: toNumberOrOriginal(normalized[field]),
    }),
    { ...animal }
  );
}

function normalizeAnimals(animals) {
  return Array.isArray(animals) ? animals.map(normalizeAnimal) : animals;
}

export const animalService = {
  async list() {
    const animals = await apiClient.get("/api/animals");
    return normalizeAnimals(animals);
  },

  async get(id) {
    const animal = await apiClient.get(`/api/animals/${id}`);
    return normalizeAnimal(animal);
  },

  async create(data) {
    const animal = await apiClient.post("/api/animals", data);
    return normalizeAnimal(animal);
  },

  async update(id, data) {
    const animal = await apiClient.patch(`/api/animals/${id}`, data);
    return normalizeAnimal(animal);
  },

  destroy(id) {
    return apiClient.delete(`/api/animals/${id}`);
  },
};

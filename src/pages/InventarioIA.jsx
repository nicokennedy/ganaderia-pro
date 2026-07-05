import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { inventarioIAService, INVENTARIO_IA_QUERY_KEY } from "@/services/inventarioIAService";
import { animalService, ANIMALS_QUERY_KEY } from "@/services/animalService";
import { getCurrentFinca } from "@/lib/current-finca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Syringe, Trash2, X } from "lucide-react";

const initialForm = {
  toro_id: "",
  toro_nombre: "",
  proveedor: "",
  fecha_compra: new Date().toISOString().split("T")[0],
  cantidad_inicial: "",
  precio_unitario: "",
  sexada: "false",
  canastilla: "",
  notas: "",
};

export default function InventarioIA() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: fincaData } = useQuery({
    queryKey: ["current-finca"],
    queryFn: getCurrentFinca,
  });

  const fincaId = fincaData?.finca?.id;
  const { data: inventario = [], isLoading } = useQuery({
    queryKey: INVENTARIO_IA_QUERY_KEY,
    enabled: !!fincaId,
    queryFn: () => inventarioIAService.list(),
  });

  const { data: animales = [] } = useQuery({
    queryKey: ANIMALS_QUERY_KEY,
    enabled: !!fincaId,
    queryFn: animalService.list,
  });

  const toros = animales.filter((animal) => animal.estado === "Toro");

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(initialForm);
    setSaving(false);
  };

  const handleToroChange = (animalId) => {
    // El <Select> devuelve strings y los ids de Rails son números:
    // se compara con coerción a string para encontrar el toro.
    const toro = toros.find((t) => String(t.id) === String(animalId));

    setForm((prev) => ({
      ...prev,
      toro_id: animalId,
      toro_nombre: toro?.nombre || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fincaId) return;

    setSaving(true);

    const cantidad = Number(form.cantidad_inicial || 0);

    try {
      // Nunca se envía finca_id: el backend lo resuelve desde el token.
      await inventarioIAService.create({
        toro_id: form.toro_id,
        toro_nombre: form.toro_nombre,
        proveedor: form.proveedor,
        fecha_compra: form.fecha_compra,
        cantidad_inicial: cantidad,
        stock_actual: cantidad,
        precio_unitario: form.precio_unitario
          ? Number(form.precio_unitario)
          : null,
        sexada: form.sexada === "true",
        canastilla: form.canastilla,
        notas: form.notas,
      });

      await queryClient.invalidateQueries({
        queryKey: INVENTARIO_IA_QUERY_KEY,
      });

      closeModal();
    } catch (error) {
      console.error("Error guardando compra IA:", error);
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = window.confirm(`¿Borrar la compra de pajuelas de "${item.toro_nombre || "toro sin nombre"}"?`);
    if (!ok) return;

    await inventarioIAService.destroy(item.id);
    await queryClient.invalidateQueries({ queryKey: INVENTARIO_IA_QUERY_KEY });
  };

  const stockTotal = inventario.reduce(
    (sum, item) => sum + Number(item.stock_actual || 0),
    0
  );

  const sexadas = inventario.reduce(
    (sum, item) => sum + (item.sexada ? Number(item.stock_actual || 0) : 0),
    0
  );

  const convencionales = stockTotal - sexadas;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario IA</h1>
          <p className="text-muted-foreground text-sm">
            Stock de pajuelas disponibles para inseminación artificial.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva compra
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Stock total</p>
          <p className="text-2xl font-bold">{stockTotal}</p>
          <p className="text-xs text-muted-foreground">pajuelas disponibles</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Sexadas</p>
          <p className="text-2xl font-bold">{sexadas}</p>
          <p className="text-xs text-muted-foreground">pajuelas sexadas</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Convencionales</p>
          <p className="text-2xl font-bold">{convencionales}</p>
          <p className="text-xs text-muted-foreground">pajuelas no sexadas</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Syringe className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Pajuelas en stock</h2>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">
            Cargando inventario...
          </p>
        ) : inventario.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Todavía no hay compras de pajuelas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Fecha
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Toro
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Proveedor
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Inicial
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Stock
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Canastilla
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                    Precio
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>

              <tbody>
                {inventario.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 text-sm">
                      {item.fecha_compra || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {item.toro_nombre || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.proveedor || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.cantidad_inicial ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {item.stock_actual ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                        {item.sexada ? "Sexada" : "Convencional"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.canastilla || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.precio_unitario ? `$${item.precio_unitario}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600 transition-colors"
                        title="Borrar compra"
                      >
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

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-2xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Nueva compra</h2>
                <p className="text-sm text-muted-foreground">
                  Registrar ingreso de pajuelas al inventario.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-md hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Toro *
                  </Label>
                  <Select value={form.toro_id} onValueChange={handleToroChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar toro" />
                    </SelectTrigger>
                    <SelectContent>
                      {toros.map((toro) => (
                        <SelectItem key={toro.id} value={String(toro.id)}>
                          {toro.nombre} ·{" "}
                          {toro.numero_id ||
                            toro.arete ||
                            toro.numero_registro ||
                            "sin ID"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Proveedor *
                  </Label>
                  <Input
                    value={form.proveedor}
                    onChange={(e) => set("proveedor", e.target.value)}
                    placeholder="Ej: ABS, Genex, Select Sires"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Fecha compra
                  </Label>
                  <Input
                    type="date"
                    value={form.fecha_compra}
                    onChange={(e) => set("fecha_compra", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Cantidad *
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.cantidad_inicial}
                    onChange={(e) => set("cantidad_inicial", e.target.value)}
                    placeholder="Ej: 120"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Precio unitario
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.precio_unitario}
                    onChange={(e) => set("precio_unitario", e.target.value)}
                    placeholder="Ej: 18"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Tipo de pajuela
                  </Label>
                  <Select
                    value={form.sexada}
                    onValueChange={(v) => set("sexada", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Convencional</SelectItem>
                      <SelectItem value="true">Sexada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Canastilla
                  </Label>
                  <Input
                    value={form.canastilla}
                    onChange={(e) => set("canastilla", e.target.value)}
                    placeholder="Ej: A3"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Notas
                  </Label>
                  <Input
                    value={form.notas}
                    onChange={(e) => set("notas", e.target.value)}
                    placeholder="Observaciones opcionales"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    saving ||
                    !form.toro_id ||
                    !form.proveedor ||
                    !form.cantidad_inicial
                  }
                >
                  {saving ? "Guardando..." : "Guardar compra"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

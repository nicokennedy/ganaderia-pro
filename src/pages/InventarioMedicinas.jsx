import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventarioMedicinaService,
  INVENTARIO_MEDICINA_QUERY_KEY,
} from "@/services/inventarioMedicinaService";
import { getCurrentFinca } from "@/lib/current-finca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Edit, PackagePlus, Pill, Plus, X } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const initialForm = {
  nombre: "",
  tipo: "Medicamento",
  categoria: "",
  presentacion: "",
  unidad_medida: "",
  stock_actual: "",
  stock_minimo: "",
  proveedor: "",
  laboratorio: "",
  lote: "",
  fecha_vencimiento: "",
  notas: "",
  activo: "true",
};

function parseStock(value) {
  return parseFloat(value) || 0;
}

function formatStock(value) {
  const stock = parseStock(value);
  return Number.isInteger(stock) ? String(stock) : stock.toFixed(2);
}

function isLowStock(item) {
  return parseStock(item.stock_minimo) > 0 && parseStock(item.stock_actual) <= parseStock(item.stock_minimo);
}

function isExpired(item) {
  return item.fecha_vencimiento && item.fecha_vencimiento < today;
}

function formFromItem(item) {
  return {
    nombre: item.nombre || "",
    tipo: item.tipo || "Medicamento",
    categoria: item.categoria || "",
    presentacion: item.presentacion || "",
    unidad_medida: item.unidad_medida || "",
    stock_actual: item.stock_actual ?? "",
    stock_minimo: item.stock_minimo ?? "",
    proveedor: item.proveedor || "",
    laboratorio: item.laboratorio || "",
    lote: item.lote || "",
    fecha_vencimiento: item.fecha_vencimiento || "",
    notas: item.notas || "",
    activo: item.activo ? "true" : "false",
  };
}

export default function InventarioMedicinas() {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  const { data: fincaData } = useQuery({
    queryKey: ["current-finca"],
    queryFn: getCurrentFinca,
  });

  const fincaId = fincaData?.finca?.id;
  const { data: inventario = [], isLoading } = useQuery({
    queryKey: INVENTARIO_MEDICINA_QUERY_KEY,
    enabled: !!fincaId,
    queryFn: () => inventarioMedicinaService.list(),
  });

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreate = () => {
    setEditingItem(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm(formFromItem(item));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setForm(initialForm);
    setSaving(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fincaId) return;

    setSaving(true);

    const payload = {
      nombre: form.nombre,
      tipo: form.tipo,
      categoria: form.categoria,
      presentacion: form.presentacion,
      unidad_medida: form.unidad_medida,
      stock_actual: parseStock(form.stock_actual),
      stock_minimo: parseStock(form.stock_minimo),
      proveedor: form.proveedor,
      laboratorio: form.laboratorio,
      lote: form.lote,
      fecha_vencimiento: form.fecha_vencimiento || null,
      notas: form.notas,
      activo: form.activo === "true",
    };

    try {
      if (editingItem) {
        await inventarioMedicinaService.update(editingItem.id, payload);
      } else {
        await inventarioMedicinaService.create(payload);
      }

      await queryClient.invalidateQueries({
        queryKey: INVENTARIO_MEDICINA_QUERY_KEY,
      });
      closeModal();
    } catch (error) {
      console.error("Error guardando inventario de medicinas:", error);
      setSaving(false);
    }
  };

  const activos = inventario.filter((item) => item.activo !== false);
  const stockBajo = activos.filter(isLowStock).length;
  const vencidos = activos.filter(isExpired).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario de Medicinas</h1>
          <p className="text-muted-foreground text-sm">
            Medicamentos y vacunas disponibles por finca.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo producto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Productos activos</p>
          <p className="text-2xl font-bold">{activos.length}</p>
          <p className="text-xs text-muted-foreground">medicinas y vacunas</p>
        </div>

        <div className={`border rounded-xl p-4 ${stockBajo > 0 ? "bg-amber-50 border-amber-200" : "bg-card border-border"}`}>
          <p className="text-sm text-muted-foreground">Stock bajo</p>
          <p className={`text-2xl font-bold ${stockBajo > 0 ? "text-amber-700" : ""}`}>{stockBajo}</p>
          <p className="text-xs text-muted-foreground">bajo mínimo</p>
        </div>

        <div className={`border rounded-xl p-4 ${vencidos > 0 ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
          <p className="text-sm text-muted-foreground">Vencidos</p>
          <p className={`text-2xl font-bold ${vencidos > 0 ? "text-red-700" : ""}`}>{vencidos}</p>
          <p className="text-xs text-muted-foreground">requieren revisión</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Pill className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Productos en inventario</h2>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">
            Cargando inventario...
          </p>
        ) : inventario.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Todavía no hay medicinas ni vacunas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Producto</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Presentación</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Stock</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Mínimo</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Vencimiento</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Proveedor</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Lote</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>

              <tbody>
                {inventario.map((item) => {
                  const lowStock = isLowStock(item);
                  const expired = isExpired(item);

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border hover:bg-muted/20 ${item.activo === false ? "opacity-60" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(lowStock || expired) && (
                            <AlertTriangle className={`w-4 h-4 ${expired ? "text-red-600" : "text-amber-600"}`} />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.nombre}</p>
                            <p className="text-xs text-muted-foreground">{item.categoria || item.laboratorio || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium">
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{item.presentacion || "-"}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${lowStock ? "text-amber-700" : ""}`}>
                        {formatStock(item.stock_actual)}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatStock(item.stock_minimo)}</td>
                      <td className={`px-4 py-3 text-sm ${expired ? "font-semibold text-red-700" : ""}`}>
                        {item.fecha_vencimiento || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.proveedor || "-"}</td>
                      <td className="px-4 py-3 text-sm">{item.lote || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-3xl border border-border overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingItem ? "Editar producto" : "Nuevo producto"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Registrar medicamento o vacuna en inventario.
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
                  <Label className="text-xs font-semibold mb-1.5 block">Nombre *</Label>
                  <Input
                    value={form.nombre}
                    onChange={(e) => set("nombre", e.target.value)}
                    placeholder="Ej: Oxitetraciclina"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(value) => set("tipo", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Medicamento">Medicamento</SelectItem>
                      <SelectItem value="Vacuna">Vacuna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Categoría</Label>
                  <Input
                    value={form.categoria}
                    onChange={(e) => set("categoria", e.target.value)}
                    placeholder="Ej: Antibiótico, antiparasitario"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Presentación</Label>
                  <Input
                    value={form.presentacion}
                    onChange={(e) => set("presentacion", e.target.value)}
                    placeholder="Ej: Frasco 100 ml"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Unidad de medida</Label>
                  <Input
                    value={form.unidad_medida}
                    onChange={(e) => set("unidad_medida", e.target.value)}
                    placeholder="Ej: ml, dosis, unidades"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Stock actual *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.stock_actual}
                    onChange={(e) => set("stock_actual", e.target.value)}
                    placeholder="Ej: 25"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Stock mínimo</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.stock_minimo}
                    onChange={(e) => set("stock_minimo", e.target.value)}
                    placeholder="Ej: 5"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Fecha vencimiento</Label>
                  <Input
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => set("fecha_vencimiento", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Proveedor</Label>
                  <Input
                    value={form.proveedor}
                    onChange={(e) => set("proveedor", e.target.value)}
                    placeholder="Ej: Agrovet"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Laboratorio</Label>
                  <Input
                    value={form.laboratorio}
                    onChange={(e) => set("laboratorio", e.target.value)}
                    placeholder="Ej: Zoetis"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Lote</Label>
                  <Input
                    value={form.lote}
                    onChange={(e) => set("lote", e.target.value)}
                    placeholder="Ej: L-2034"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Estado</Label>
                  <Select value={form.activo} onValueChange={(value) => set("activo", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold mb-1.5 block">Notas</Label>
                  <Textarea
                    value={form.notas}
                    onChange={(e) => set("notas", e.target.value)}
                    placeholder="Observaciones opcionales"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>
                  Cancelar
                </Button>

                <Button type="submit" disabled={saving || !form.nombre || !form.tipo}>
                  <PackagePlus className="w-4 h-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar producto"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

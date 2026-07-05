import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FINANCIAL_TRANSACTIONS_QUERY_KEY, financialTransactionService } from "@/services/financialTransactionService";
import { formatCurrency, formatDate, getMonthName } from "@/lib/utils";
import { Plus, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import TransaccionModal from "@/components/finanzas/TransaccionModal";

const CATEGORIAS_COLORES = {
  "Venta de leche": "#22c55e",
  "Venta de animal": "#3b82f6",
  "Alimentacion": "#f59e0b",
  "Veterinario": "#ef4444",
  "Medicamentos": "#f97316",
  "Mano de obra": "#8b5cf6",
  "Equipos": "#06b6d4",
  "Combustible": "#84cc16",
  "Mantenimiento": "#6b7280",
  "Servicios": "#ec4899",
  "Otros": "#94a3b8",
};

const CATEGORIAS = Object.keys(CATEGORIAS_COLORES);

function dateStr(date) {
  return date.toISOString().split("T")[0];
}

function previousMonthRange(fechaDesde, fechaHasta) {
  const from = new Date(`${fechaDesde}T12:00:00`);
  const to = new Date(`${fechaHasta}T12:00:00`);
  from.setMonth(from.getMonth() - 1);
  to.setMonth(to.getMonth() - 1);
  return { from: dateStr(from), to: dateStr(to) };
}

function transactionInRange(t, fechaDesde, fechaHasta) {
  if (!t.fecha) return false;
  return t.fecha >= fechaDesde && t.fecha <= fechaHasta;
}

function totals(items) {
  const ingresos = items.filter(t => t.tipo === "Ingreso").reduce((s, t) => s + (t.monto_usd || 0), 0);
  const egresos = items.filter(t => t.tipo === "Egreso").reduce((s, t) => s + (t.monto_usd || 0), 0);
  return { total: ingresos + egresos, ingresos, egresos, neto: ingresos - egresos };
}

export default function Finanzas() {
  const [showModal, setShowModal] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("Todos");
  const queryClient = useQueryClient();
  const now = new Date();
  const [fechaDesde, setFechaDesde] = useState(dateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [fechaHasta, setFechaHasta] = useState(dateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");

  const { data: transacciones = [], isLoading } = useQuery({
    queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY,
    queryFn: financialTransactionService.list,
  });

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const applyFilters = (items, from = fechaDesde, to = fechaHasta) => items.filter(t => {
    const matchFecha = transactionInRange(t, from, to);
    const matchTipo = tipoFiltro === "Todos" || t.tipo === tipoFiltro;
    const matchCategoria = categoriaFiltro === "Todas" || t.categoria === categoriaFiltro;
    return matchFecha && matchTipo && matchCategoria;
  });

  const mesFiltradas = applyFilters(transacciones);
  const rangoAnterior = previousMonthRange(fechaDesde, fechaHasta);
  const filtradasMesAnterior = applyFilters(transacciones, rangoAnterior.from, rangoAnterior.to);
  const totalesFiltro = totals(mesFiltradas);
  const totalesAnterior = totals(filtradasMesAnterior);
  const diferenciaNeto = totalesFiltro.neto - totalesAnterior.neto;

  const ingresosMes = mesFiltradas.filter(t => t.tipo === 'Ingreso').reduce((s, t) => s + (t.monto_usd || 0), 0);
  const egresosMes = mesFiltradas.filter(t => t.tipo === 'Egreso').reduce((s, t) => s + (t.monto_usd || 0), 0);
  const gananciaMes = ingresosMes - egresosMes;
  const litrosMes = mesFiltradas.filter(t => t.categoria === 'Venta de leche').reduce((s, t) => s + (t.litros || 0), 0);
  const costoPorLitro = litrosMes > 0 ? (egresosMes / litrosMes).toFixed(3) : 0;

  const gastosCategorias = mesFiltradas
    .filter(t => t.tipo === 'Egreso')
    .reduce((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + (t.monto_usd || 0);
      return acc;
    }, {});

  const pieData = Object.entries(gastosCategorias).map(([name, value]) => ({ name, value }));

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: d.getMonth(), year: d.getFullYear(), label: getMonthName(d.getMonth()).substring(0, 3) };
  }).map(({ month, year, label }) => {
    const monthTrans = transacciones.filter(t => {
      const d = new Date(t.fecha + "T12:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    });
    return {
      mes: label,
      ingresos: monthTrans.filter(t => t.tipo === 'Ingreso').reduce((s, t) => s + (t.monto_usd || 0), 0),
      egresos: monthTrans.filter(t => t.tipo === 'Egreso').reduce((s, t) => s + (t.monto_usd || 0), 0),
    };
  });

  const transFiltered = mesFiltradas;

  const handleDelete = async (transaction) => {
    const ok = window.confirm(`¿Borrar la transacción "${transaction.categoria}" de ${formatDate(transaction.fecha)}?`);
    if (!ok) return;

    await financialTransactionService.destroy(transaction.id);
    queryClient.invalidateQueries({ queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finanzas</h1>
          <p className="text-muted-foreground text-sm">{fechaDesde} a {fechaHasta}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nueva Transacción</span>
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Fecha desde</Label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Fecha hasta</Label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Categoría / item</Label>
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                {CATEGORIAS.map(categoria => (
                  <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Tipo</Label>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Ingreso">Ingreso</SelectItem>
                <SelectItem value="Egreso">Egreso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground font-semibold">Total filtrado</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalesFiltro.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{transFiltered.length} movimientos</p>
        </div>
        <div className="bg-card rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-green-600" />
            <p className="text-xs text-muted-foreground font-semibold">Ingresos</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(ingresosMes)}</p>
          <p className="text-xs text-muted-foreground mt-1">filtrados</p>
        </div>
        <div className="bg-card rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight className="w-4 h-4 text-red-500" />
            <p className="text-xs text-muted-foreground font-semibold">Egresos</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(egresosMes)}</p>
          <p className="text-xs text-muted-foreground mt-1">filtrados</p>
        </div>
        <div className={`bg-card rounded-xl border p-5 ${gananciaMes >= 0 ? 'border-green-200' : 'border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {gananciaMes >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            <p className="text-xs text-muted-foreground font-semibold">Ganancia</p>
          </div>
          <p className={`text-2xl font-bold ${gananciaMes >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(gananciaMes)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {diferenciaNeto === 0 ? "igual que mes anterior" : `${diferenciaNeto > 0 ? "+" : ""}${formatCurrency(diferenciaNeto)} vs mes anterior`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground font-semibold">Costo/Litro</p>
          </div>
          <p className="text-2xl font-bold text-primary">${costoPorLitro}</p>
          <p className="text-xs text-muted-foreground mt-1">{litrosMes.toLocaleString()} L vendidos</p>
        </div>
        <div className="md:col-span-3 bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground">Comparación contra mes anterior</p>
          <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Ingresos anteriores</p>
              <p className="font-bold text-green-600">{formatCurrency(totalesAnterior.ingresos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Egresos anteriores</p>
              <p className="font-bold text-red-500">{formatCurrency(totalesAnterior.egresos)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Neto anterior</p>
              <p className={`font-bold ${totalesAnterior.neto >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(totalesAnterior.neto)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-4">Ingresos vs Egresos (6 meses)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last6Months}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,88%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(220,15%,50%)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220,15%,50%)' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`$${v.toFixed(0)}`, '']} />
              <Bar dataKey="ingresos" fill="#22c55e" radius={[4,4,0,0]} name="Ingresos" />
              <Bar dataKey="egresos" fill="#ef4444" radius={[4,4,0,0]} name="Egresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-4">Gastos por Categoría</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={false}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORIAS_COLORES[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={v => [`$${v.toFixed(0)}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">Sin gastos registrados</p>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-foreground">Transacciones</h2>
          <p className="text-xs text-muted-foreground">{transFiltered.length} resultados</p>
        </div>
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Cargando...</div>
        ) : transFiltered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">No hay transacciones</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transFiltered.slice(0, 50).map((t, i) => (
              <div key={t.id ?? i} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/30 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${t.tipo === 'Ingreso' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {t.tipo === 'Ingreso' ? '↑' : '↓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.categoria}</p>
                  <p className="text-xs text-muted-foreground">{t.descripcion || '-'} · {formatDate(t.fecha)}</p>
                </div>
                <p className={`text-sm font-bold ${t.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.tipo === 'Ingreso' ? '+' : '-'}{formatCurrency(t.monto_usd)}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600 transition-colors"
                  title="Borrar transacción"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TransaccionModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: FINANCIAL_TRANSACTIONS_QUERY_KEY });
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

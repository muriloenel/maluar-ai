'use client';

import { useState } from 'react';
import { useToast } from './Toast';

const MATERIAL_PRESETS = [
  { name: 'Gel construtor', price: 5 },
  { name: 'Primer / Prep', price: 2 },
  { name: 'Top coat', price: 3 },
  { name: 'Esmalte gel/cor', price: 4 },
  { name: 'Tip/molde', price: 3 },
  { name: 'Lixa/buffer', price: 2 },
  { name: 'Glitter/foil', price: 3 },
  { name: 'Pedraria', price: 5 },
  { name: 'Removedor', price: 1 },
  { name: 'Outros', price: 0 },
];

export default function PricingCalculator() {
  const [materials, setMaterials] = useState(
    MATERIAL_PRESETS.map((m) => ({ ...m, active: false }))
  );
  const [customMaterial, setCustomMaterial] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [timeMinutes, setTimeMinutes] = useState(90);
  const [hourlyRate, setHourlyRate] = useState(40);
  const [profitMargin, setProfitMargin] = useState(30);
  const toast = useToast();

  const toggleMaterial = (idx) => {
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, active: !m.active } : m)));
  };

  const addCustomMaterial = () => {
    if (!customMaterial.trim()) return;
    setMaterials((prev) => [...prev, { name: customMaterial.trim(), price: parseFloat(customPrice) || 0, active: true }]);
    setCustomMaterial('');
    setCustomPrice('');
  };

  const activeMaterials = materials.filter((m) => m.active);
  const materialCost = activeMaterials.reduce((sum, m) => sum + m.price, 0);
  const laborCost = (timeMinutes / 60) * hourlyRate;
  const subtotal = materialCost + laborCost;
  const profit = subtotal * (profitMargin / 100);
  const total = subtotal + profit;

  const handleCopyPrice = () => {
    const text = `💰 Precificação Maluar AI\n\nMateriais: R$ ${materialCost.toFixed(2)}\nMão de obra (${timeMinutes}min): R$ ${laborCost.toFixed(2)}\nMargem (${profitMargin}%): R$ ${profit.toFixed(2)}\n\n✨ Preço sugerido: R$ ${total.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    toast?.('Preço copiado!');
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-text">💰 Calculadora de Preço</h2>
            <p className="text-text-muted text-sm mt-0.5">
              Calcule o preço ideal do seu serviço
            </p>
          </div>

          {/* Materials */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Materiais usados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => toggleMaterial(idx)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    m.active
                      ? 'border-accent bg-accent-light text-text font-medium'
                      : 'border-border-light bg-surface-card text-text-muted hover:border-accent/40'
                  }`}
                >
                  {m.name} {m.price > 0 && `(R$${m.price})`}
                </button>
              ))}
            </div>
            {/* Add custom material */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customMaterial}
                onChange={(e) => setCustomMaterial(e.target.value)}
                placeholder="Material..."
                className="flex-1 text-xs bg-surface-card border border-border rounded-lg px-3 py-2 text-text placeholder-text-light focus:outline-none focus:border-accent"
                maxLength={30}
              />
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="R$"
                className="w-20 text-xs bg-surface-card border border-border rounded-lg px-3 py-2 text-text placeholder-text-light focus:outline-none focus:border-accent"
                min="0"
                step="0.5"
              />
              <button
                onClick={addCustomMaterial}
                className="text-xs px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium"
              >
                +
              </button>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Tempo do serviço: {timeMinutes} min ({(timeMinutes / 60).toFixed(1)}h)
            </label>
            <input
              type="range"
              min={15}
              max={300}
              step={15}
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-light mt-1">
              <span>15min</span>
              <span>5h</span>
            </div>
          </div>

          {/* Hourly rate */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Valor da sua hora: R$ {hourlyRate}
            </label>
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-light mt-1">
              <span>R$ 10/h</span>
              <span>R$ 200/h</span>
            </div>
          </div>

          {/* Profit margin */}
          <div>
            <label className="block text-text text-xs font-medium mb-2 uppercase tracking-wide">
              Margem de lucro: {profitMargin}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={profitMargin}
              onChange={(e) => setProfitMargin(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-light mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Result card */}
          <div className="bg-surface-card border border-accent/20 rounded-xl p-5 shadow-soft space-y-3">
            <div className="text-[10px] font-medium text-accent uppercase tracking-wider">Resultado</div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Materiais ({activeMaterials.length} itens)</span>
                <span className="text-text font-medium">R$ {materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Mão de obra ({timeMinutes}min)</span>
                <span className="text-text font-medium">R$ {laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Margem ({profitMargin}%)</span>
                <span className="text-text font-medium">R$ {profit.toFixed(2)}</span>
              </div>
              <div className="border-t border-border-light pt-2">
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-text">Preço sugerido</span>
                  <span className="text-lg font-bold text-accent">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyPrice}
              className="w-full py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-soft mt-2 flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar resultado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

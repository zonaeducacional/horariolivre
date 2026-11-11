import React from 'react';
import {
  Clock,
  Users,
  GraduationCap,
  BookOpen,
  TableProperties,
  Cpu,
  Calendar,
  Printer,
} from 'lucide-react';

export type TabKey =
  | 'turnos'
  | 'turmas'
  | 'professores'
  | 'disciplinas'
  | 'matriz'
  | 'gerador'
  | 'grade'
  | 'relatorios';

interface Props {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  aulasAlocadas: number;
}

export const Sidebar: React.FC<Props> = ({ activeTab, onTabChange, aulasAlocadas }) => {
  const tabs = [
    { key: 'turnos' as TabKey, label: 'Turnos e Tempos', icon: Clock },
    { key: 'turmas' as TabKey, label: 'Turmas', icon: Users },
    { key: 'professores' as TabKey, label: 'Professores', icon: GraduationCap },
    { key: 'disciplinas' as TabKey, label: 'Disciplinas', icon: BookOpen },
    { key: 'matriz' as TabKey, label: 'Matriz Curricular', icon: TableProperties },
    { key: 'gerador' as TabKey, label: 'Gerar Horário (Cálculo)', icon: Cpu, highlight: true },
    { key: 'grade' as TabKey, label: 'Grade Semanal', icon: Calendar, badge: aulasAlocadas > 0 },
    { key: 'relatorios' as TabKey, label: 'Relatórios e Impressão', icon: Printer },
  ];

  return (
    <aside className="w-72 bg-[#a2bc97] border-r-2 border-[#7e9a72] flex flex-col justify-between gap-4 min-h-0 overflow-y-auto p-4 shrink-0 select-none shadow-sm">
      <nav className="space-y-2">
        <span className="text-xs uppercase font-black tracking-wider text-[#141c12] px-3 pb-2 block">
          Etapas de Configuração
        </span>

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-black text-lg transition-all text-left ${
                isActive
                  ? 'bg-[#141c12] text-[#fbe5ac] shadow-md'
                  : tab.highlight
                  ? 'bg-[#fbe5ac] text-[#141c12] hover:bg-[#ffffff] border-2 border-[#141c12]'
                  : 'text-[#141c12] hover:bg-[#8fae83] hover:text-[#141c12]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-6 h-6 ${
                    isActive ? 'text-[#fbe5ac]' : 'text-[#141c12]'
                  }`}
                />
                <span>{tab.label}</span>
              </div>

              {tab.badge && (
                <span
                  className={`px-2 py-0.5 text-xs font-black rounded-full font-mono ${
                    isActive
                      ? 'bg-[#fbe5ac] text-[#141c12]'
                      : 'bg-[#141c12] text-[#fbe5ac]'
                  }`}
                >
                  {aulasAlocadas}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Rodapé Informativo */}
      <div className="bg-[#fff8e4]/70 p-3 rounded-lg border-2 border-[#7e9a72] text-xs text-[#141c12]">
        <p className="font-black text-[#141c12]">Vibe Lab Horário</p>
        <p className="font-semibold text-[#283824]">100% Offline • FOSS</p>
      </div>
    </aside>
  );
};

"use client";

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { BASES_OPERATIVAS } from '@/lib/constants';
import { getUniqueCanonicalTopics } from '@/lib/canonicalTrainings';

type DashboardData = {
  id: number;
  status: string;
  effectiveness: string | null;
  trainingName: string;
  rawTrainingName?: string;
  date: string | null;
  scheduledDate?: string | null;
  rescheduledDate?: string | null;
  completedAt?: string | null;
  isRescheduled?: boolean;
  employeeName: string;
  employeeId: number;
  baseOperativa?: string | null;
  sectorId: number;
  sectorName: string;
  profileId: number | null;
  profileTitle: string;
};

type Props = {
  data: DashboardData[];
  sectors: { id: number; name: string }[];
  profiles: { id: number; title: string; gerencia?: string | null }[];
  isSector: boolean;
};

type CrossFilter = {
  source: 'BarChart' | 'PieChart' | 'KpiBox';
  monthIndex?: number;
  statusKey?: string; // 'Realizadas' | 'Programadas' | 'Reprogramadas'
  tema?: string;
};

const COLORS = ['#0078D4', '#00CC6A', '#FFB900', '#D83B01', '#E3008C', '#8E562E', '#004B8B', '#B4009E'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function DashboardClient({ data, sectors, profiles, isSector }: Props) {
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedBases, setSelectedBases] = useState<string[]>([]);
  const [isBaseDropdownOpen, setIsBaseDropdownOpen] = useState<boolean>(false);
  const baseDropdownRef = React.useRef<HTMLDivElement>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>('Todos');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('Todos');
  const [selectedTopic, setSelectedTopic] = useState<string>('Todos');

  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (baseDropdownRef.current && !baseDropdownRef.current.contains(event.target as Node)) {
        setIsBaseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleBaseSelection = (base: string) => {
    setSelectedBases(prev =>
      prev.includes(base) ? prev.filter(b => b !== base) : [...prev, base]
    );
  };

  // Extract unique years for filters
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => {
      if (d.date) years.add(new Date(d.date).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [data]);

  // Dynamic Bases Operativas (Sitios: Dock Sud, Berazategui, Quilmes, Hudson, etc.)
  // Filtrado dinámicamente según el Sector elegido
  const availableBases = useMemo(() => {
    const basesFound = new Set<string>();
    data.forEach(d => {
      if (selectedSector !== 'Todos' && d.sectorId.toString() !== selectedSector) return;
      if (d.baseOperativa) basesFound.add(d.baseOperativa);
    });

    if (basesFound.size > 0) {
      return Array.from(basesFound).sort((a, b) => a.localeCompare(b, 'es'));
    }
    return BASES_OPERATIVAS;
  }, [data, selectedSector]);

  // Map specific Sectors to their Gerencia
  const getGerenciaForSector = (sectorName: string) => {
    const map: Record<string, string> = {
      'Asistencia Vial': 'Gerencia de Prevencion y Seguridad Integral',
      'Seguridad Patrimonial': 'Gerencia de Prevencion y Seguridad Integral',
      'CCM': 'Gerencia de Prevencion y Seguridad Integral',
      'SGI': 'Auditoría Interna y Control de Gestión',
    };
    return map[sectorName] || sectorName;
  };

  // Cascading logic for Profiles (depends on Sector and Base Operativa)
  const availableProfiles = useMemo(() => {
    if (selectedSector === 'Todos') {
      if (selectedBases.length === 0) return profiles;
      const baseProfileIds = new Set<number>();
      data.forEach(d => {
        if (d.baseOperativa && selectedBases.includes(d.baseOperativa) && d.profileId) {
          baseProfileIds.add(d.profileId);
        }
      });
      return profiles.filter(p => baseProfileIds.has(p.id));
    }
    
    const sectorObj = sectors.find(s => s.id.toString() === selectedSector);
    const sectorName = sectorObj?.name || "";
    const mappedGerencia = getGerenciaForSector(sectorName);
    
    // Si además filtró por base operativa, cruzamos con la base
    const sectorDataProfileIds = new Set<number>();
    data.forEach(d => {
      if (d.sectorId.toString() === selectedSector) {
        if (selectedBases.length === 0 || (d.baseOperativa && selectedBases.includes(d.baseOperativa))) {
          if (d.profileId) sectorDataProfileIds.add(d.profileId);
        }
      }
    });

    if (selectedBases.length > 0) {
      return profiles.filter(p => sectorDataProfileIds.has(p.id));
    }

    const staticProfiles = profiles.filter(p => p.gerencia === mappedGerencia || p.gerencia === sectorName);
    if (staticProfiles.length > 0) return staticProfiles;
    
    return profiles.filter(p => sectorDataProfileIds.has(p.id));
  }, [profiles, data, selectedSector, selectedBases, sectors]);

  // Cascading logic for Employees (depends on Sector, Base, and Profile)
  const availableEmployees = useMemo(() => {
    const emps = new Set<string>();
    data.forEach(d => {
      let pass = true;
      if (selectedSector !== 'Todos' && d.sectorId.toString() !== selectedSector) pass = false;
      if (selectedBases.length > 0 && (!d.baseOperativa || !selectedBases.includes(d.baseOperativa))) pass = false;
      if (selectedProfile !== 'Todos' && d.profileId?.toString() !== selectedProfile) pass = false;
      if (pass) emps.add(d.employeeName);
    });
    return Array.from(emps).sort((a, b) => a.localeCompare(b, 'es'));
  }, [data, selectedSector, selectedBases, selectedProfile]);

  // Cascading logic for Topics (unificados y canónicos sin repetidos)
  const availableTopics = useMemo(() => {
    const rawTopics: string[] = [];
    data.forEach(d => {
      let pass = true;
      if (selectedSector !== 'Todos' && d.sectorId.toString() !== selectedSector) pass = false;
      if (selectedBases.length > 0 && (!d.baseOperativa || !selectedBases.includes(d.baseOperativa))) pass = false;
      if (selectedProfile !== 'Todos' && d.profileId?.toString() !== selectedProfile) pass = false;
      if (selectedEmployee !== 'Todos' && d.employeeName !== selectedEmployee) pass = false;
      if (pass && d.trainingName) rawTopics.push(d.trainingName);
    });
    return getUniqueCanonicalTopics(rawTopics);
  }, [data, selectedSector, selectedBases, selectedProfile, selectedEmployee]);

  // Reset dependent filters if they become invalid
  React.useEffect(() => {
    setSelectedBases(prev => {
      const valid = prev.filter(b => availableBases.includes(b));
      return valid.length === prev.length ? prev : valid;
    });
  }, [availableBases]);

  React.useEffect(() => {
    if (selectedProfile !== 'Todos' && !availableProfiles.some(p => p.id.toString() === selectedProfile)) {
      setSelectedProfile('Todos');
    }
  }, [availableProfiles, selectedProfile]);

  React.useEffect(() => {
    if (selectedEmployee !== 'Todos' && !availableEmployees.includes(selectedEmployee)) {
      setSelectedEmployee('Todos');
    }
  }, [availableEmployees, selectedEmployee]);

  React.useEffect(() => {
    if (selectedTopic !== 'Todos' && !availableTopics.includes(selectedTopic)) {
      setSelectedTopic('Todos');
    }
  }, [availableTopics, selectedTopic]);

  // Apply GLOBAL filters EXCEPT topic (used for PAC table so all topics stay visible)
  const baseFilteredData = useMemo(() => {
    return data.filter(d => {
      let pass = true;
      if (selectedSector !== 'Todos' && d.sectorId.toString() !== selectedSector) pass = false;
      if (selectedBases.length > 0 && (!d.baseOperativa || !selectedBases.includes(d.baseOperativa))) pass = false;
      if (selectedProfile !== 'Todos' && d.profileId?.toString() !== selectedProfile) pass = false;
      if (selectedEmployee !== 'Todos' && d.employeeName !== selectedEmployee) pass = false;

      if (selectedStatus === 'Realizadas' && d.status !== 'COMPLETED') pass = false;
      if (selectedStatus === 'Programadas' && !(d.status === 'COMPLETED' || (d.status === 'IN_PLAN' && !d.isRescheduled))) pass = false;
      if (selectedStatus === 'Reprogramadas' && !(d.status === 'IN_PLAN' && Boolean(d.isRescheduled))) pass = false;
      if (selectedStatus === 'Brechas' && d.status !== 'GAP') pass = false;
      
      if (d.date) {
        const dObj = new Date(d.date);
        if (selectedYear !== 'Todos' && dObj.getFullYear().toString() !== selectedYear) pass = false;
        if (selectedMonth !== 'Todos' && dObj.getMonth().toString() !== selectedMonth) pass = false;
      } else {
        if (selectedYear !== 'Todos' || selectedMonth !== 'Todos') pass = false;
      }
      
      return pass;
    });
  }, [data, selectedYear, selectedMonth, selectedStatus, selectedSector, selectedBases, selectedProfile, selectedEmployee]);

  // Apply GLOBAL filters INCLUDING topic (used for BarChart, detailedData, and KPIs)
  const filteredData = useMemo(() => {
    if (selectedTopic === 'Todos') return baseFilteredData;
    return baseFilteredData.filter(d => d.trainingName === selectedTopic);
  }, [baseFilteredData, selectedTopic]);

  // Apply CROSS filters (Chart Clicks)
  const detailedData = useMemo(() => {
    let result = filteredData;
    if (crossFilter) {
      if (crossFilter.source === 'BarChart') {
        result = result.filter(d => {
          if (!d.date) return false;
          const month = new Date(d.date).getMonth();
          if (month !== crossFilter.monthIndex) return false;
          
          if (crossFilter.statusKey === 'Realizadas') return d.status === 'COMPLETED';
          if (crossFilter.statusKey === 'Programadas') return d.status === 'COMPLETED' || (d.status === 'IN_PLAN' && !d.isRescheduled);
          if (crossFilter.statusKey === 'Reprogramadas') return d.status === 'IN_PLAN' && Boolean(d.isRescheduled);
          return true;
        });
      } else if (crossFilter.source === 'PieChart') {
        result = result.filter(d => d.trainingName === crossFilter.tema && d.status === 'COMPLETED');
      } else if (crossFilter.source === 'KpiBox') {
        if (crossFilter.statusKey === 'Reprogramadas') {
          result = result.filter(d => d.status === 'IN_PLAN' && Boolean(d.isRescheduled));
        } else if (crossFilter.statusKey === 'Realizadas') {
          result = result.filter(d => d.status === 'COMPLETED');
        } else if (crossFilter.statusKey === 'Programadas') {
          result = result.filter(d => d.status === 'COMPLETED' || (d.status === 'IN_PLAN' && !d.isRescheduled));
        }
      }
    }
    return result;
  }, [filteredData, crossFilter]);

  // Chart 1: Donut (Categorías/Temas de las Realizadas)
  const donutData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.filter(d => d.status === 'COMPLETED').forEach(d => {
      counts[d.trainingName] = (counts[d.trainingName] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a,b) => b.value - a.value).slice(0, 8);
  }, [filteredData]);

  // Chart 2: Bar (Mensual)
  const monthlyData = useMemo(() => {
    const mData = MONTHS.map((m) => ({ name: m, Programadas: 0, Realizadas: 0, Reprogramadas: 0 }));
    filteredData.forEach(d => {
      if (d.date) {
        const monthIndex = new Date(d.date).getMonth();
        if (d.status === 'COMPLETED') {
          mData[monthIndex].Programadas += 1;
          mData[monthIndex].Realizadas += 1;
        } else if (d.status === 'IN_PLAN' && Boolean(d.isRescheduled)) {
          mData[monthIndex].Reprogramadas += 1;
        } else if (d.status === 'IN_PLAN' && !d.isRescheduled) {
          mData[monthIndex].Programadas += 1;
        }
      }
    });
    return mData;
  }, [filteredData]);

  // KPIs
  const realizadas = detailedData.filter(d => d.status === 'COMPLETED').length;
  const programadas = detailedData.filter(d => d.status === 'COMPLETED' || (d.status === 'IN_PLAN' && !d.isRescheduled)).length;
  const reprogramadas = detailedData.filter(d => d.status === 'IN_PLAN' && Boolean(d.isRescheduled)).length;
  const pendientes = detailedData.filter(d => d.status === 'GAP').length;
  const totalGeneral = programadas + reprogramadas + pendientes;
  const tasaCumplimiento = totalGeneral > 0 ? Math.round((realizadas / totalGeneral) * 100) : 0;
  
  const strokeDasharray = 125.6;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * tasaCumplimiento) / 100;

  // Table: Cumplimiento PAC por Tema
  const { pacData, pacTotals } = useMemo(() => {
    const stats: Record<string, { realizadas: number, programadas: number, eficaces: number }> = {};
    let totalRealizadas = 0;
    let totalProgramadas = 0;
    let totalEficaces = 0;

    baseFilteredData.forEach(d => {
      if (d.status === 'GAP') return; 
      if (!stats[d.trainingName]) {
        stats[d.trainingName] = { realizadas: 0, programadas: 0, eficaces: 0 };
      }
      stats[d.trainingName].programadas += 1;
      totalProgramadas += 1;

      if (d.status === 'COMPLETED') {
        stats[d.trainingName].realizadas += 1;
        totalRealizadas += 1;
        if (d.effectiveness === 'EFFECTIVE') {
          stats[d.trainingName].eficaces += 1;
          totalEficaces += 1;
        }
      }
    });

    const rows = Object.keys(stats).map(topic => {
      const { realizadas: r, programadas: p, eficaces: e } = stats[topic];
      const cumPct = p > 0 ? Math.round((r / p) * 100) : 0;
      const eficPct = r > 0 ? Math.round((e / r) * 100) : 0;
      return { topic, programadas: p, realizadas: r, cumPct, eficaces: e, eficPct };
    }).sort((a, b) => b.programadas - a.programadas);

    const cumTotalPct = totalProgramadas > 0 ? Math.round((totalRealizadas / totalProgramadas) * 100) : 0;
    const eficTotalPct = totalRealizadas > 0 ? Math.round((totalEficaces / totalRealizadas) * 100) : 0;

    return {
      pacData: rows,
      pacTotals: {
        programadas: totalProgramadas,
        realizadas: totalRealizadas,
        cumPct: cumTotalPct,
        eficaces: totalEficaces,
        eficPct: eficTotalPct
      }
    };
  }, [baseFilteredData]);

  // Handle Chart Clicks
  const handleBarClick = (data: any, index: number, statusKey: string) => {
    if (crossFilter?.source === 'BarChart' && crossFilter.monthIndex === index && crossFilter.statusKey === statusKey) {
      setCrossFilter(null);
    } else {
      setCrossFilter({ source: 'BarChart', monthIndex: index, statusKey });
    }
  };

  const handlePieClick = (data: any) => {
    if (selectedTopic === data.name) {
      setSelectedTopic('Todos');
    } else {
      setSelectedTopic(data.name);
    }
  };

  const handleKpiClick = (statusKey: string) => {
    if (crossFilter?.source === 'KpiBox' && crossFilter.statusKey === statusKey) {
      setCrossFilter(null);
    } else {
      setCrossFilter({ source: 'KpiBox', statusKey });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Top Filter Bar */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1rem', background: '#004B8B', color: 'white' }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Año</label>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: '100%', padding: '0.25rem', color: 'black' }}>
            <option value="Todos">Todos</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Mes</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: '100%', padding: '0.25rem', color: 'black' }}>
            <option value="Todos">Todos</option>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Estado</label>
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} style={{ width: '100%', padding: '0.25rem', color: 'black' }}>
            <option value="Todos">Todos los estados</option>
            <option value="Realizadas">Realizadas</option>
            <option value="Programadas">Programadas (Sin reprogramar)</option>
            <option value="Reprogramadas">Reprogramadas</option>
            <option value="Brechas">Brechas (Pendientes)</option>
          </select>
        </div>
      </div>

      {/* Main Filters & Content Grid */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        
        {/* Left Sidebar Filters */}
        <div className="card" style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isSector && (
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>Gerencia / Sector</label>
              <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)} className="form-input">
                <option value="Todos">Todas las gerencias</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Sitio / Base Operativa (Multi-selección: Dock Sud, Berazategui, Quilmes, Hudson, etc.) */}
          <div ref={baseDropdownRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                Sitio / Base {selectedSector !== 'Todos' ? `(${availableBases.length})` : ''}
              </label>
              {selectedBases.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBases([])}
                  style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                >
                  Limpiar ({selectedBases.length})
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsBaseDropdownOpen(prev => !prev)}
              className="form-input"
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                fontWeight: selectedBases.length > 0 ? 600 : 400,
                color: selectedBases.length > 0 ? '#004B8B' : 'inherit'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedBases.length === 0
                  ? 'Todos los sitios'
                  : selectedBases.length === 1
                    ? selectedBases[0]
                    : `${selectedBases.length} sitios seleccionados`}
              </span>
              <span style={{ fontSize: '0.75rem', marginLeft: '0.4rem', color: '#64748b' }}>
                {isBaseDropdownOpen ? '▲' : '▼'}
              </span>
            </button>

            {isBaseDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '0.35rem'
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0.5rem',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    fontWeight: selectedBases.length === 0 ? 700 : 500,
                    backgroundColor: selectedBases.length === 0 ? '#eff6ff' : 'transparent',
                    color: selectedBases.length === 0 ? '#004B8B' : '#1e293b',
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '0.2rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedBases.length === 0}
                    onChange={() => setSelectedBases([])}
                    style={{ cursor: 'pointer', accentColor: '#004B8B' }}
                  />
                  <span>Todos los sitios</span>
                </label>

                {availableBases.map(b => {
                  const isChecked = selectedBases.includes(b);
                  return (
                    <label
                      key={b}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.4rem 0.5rem',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        fontSize: '0.84rem',
                        fontWeight: isChecked ? 700 : 400,
                        backgroundColor: isChecked ? '#f0f9ff' : 'transparent',
                        color: isChecked ? '#004B8B' : '#1e293b'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBaseSelection(b)}
                        style={{ cursor: 'pointer', accentColor: '#004B8B' }}
                      />
                      <span>{b}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedBases.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                {selectedBases.map(b => (
                  <span
                    key={b}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      borderRadius: '999px',
                      padding: '0.15rem 0.5rem',
                      fontSize: '0.73rem',
                      fontWeight: 700
                    }}
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => toggleBaseSelection(b)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0369a1',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        lineHeight: 1
                      }}
                      title={`Quitar ${b}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              Perfil de Puesto {selectedSector !== 'Todos' || selectedBases.length > 0 ? `(${availableProfiles.length})` : ''}
            </label>
            <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="form-input">
              <option value="Todos">Todos los puestos</option>
              {availableProfiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              Nombre y Apellido ({availableEmployees.length})
            </label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="form-input">
              <option value="Todos">Todos los colaboradores</option>
              {availableEmployees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>Tema a capacitar</label>
              {selectedTopic !== 'Todos' && (
                <button
                  type="button"
                  onClick={() => setSelectedTopic('Todos')}
                  style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Limpiar
                </button>
              )}
            </div>
            <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} className="form-input">
              <option value="Todos">Todos los temas ({availableTopics.length})</option>
              {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div
                onClick={() => handleKpiClick('Realizadas')}
                style={{ flex: 1, textAlign: 'center', background: '#0078D4', color: 'white', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', opacity: (crossFilter?.statusKey && crossFilter.statusKey !== 'Realizadas') ? 0.5 : 1 }}
                title="Click para filtrar Realizadas"
              >
                <div style={{ fontSize: '0.72rem' }}>Cap. Realizadas</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{realizadas}</div>
              </div>
              <div
                onClick={() => handleKpiClick('Programadas')}
                style={{ flex: 1, textAlign: 'center', background: '#004B8B', color: 'white', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', opacity: (crossFilter?.statusKey && crossFilter.statusKey !== 'Programadas') ? 0.5 : 1 }}
                title="Click para filtrar Programadas"
              >
                <div style={{ fontSize: '0.72rem' }}>Cap. Programadas</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{programadas}</div>
              </div>
            </div>
            <div
              onClick={() => handleKpiClick('Reprogramadas')}
              style={{ textAlign: 'center', background: '#f97316', color: 'white', padding: '0.45rem 0.5rem', borderRadius: '4px', cursor: 'pointer', opacity: (crossFilter?.statusKey && crossFilter.statusKey !== 'Reprogramadas') ? 0.5 : 1 }}
              title="Click para ver solo las Capacitaciones Reprogramadas"
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>🔄 Cap. Reprogramadas</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 'bold' }}>{reprogramadas}</div>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Tasa de Cumplimiento (%)</span>
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <svg width="80" height="80" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="#00CC6A" strokeWidth="6" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round" transform="rotate(-90 24 24)" />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--primary-color)' }}>
                {tasaCumplimiento}%
              </div>
            </div>
          </div>
          
          {crossFilter && (
            <button onClick={() => setCrossFilter(null)} className="btn btn-secondary" style={{ padding: '0.25rem', fontSize: '0.75rem', marginTop: '-0.5rem' }}>
              Limpiar Filtro Gráfico
            </button>
          )}

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)', textAlign: 'center', display: 'block' }}>Top Temas (Realizados)</label>
            <div style={{ width: '100%', height: '200px', cursor: 'pointer' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none" onClick={handlePieClick}>
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={(selectedTopic === entry.name) ? 1 : (selectedTopic !== 'Todos' ? 0.35 : 1)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '0.7rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Haz click en una porción para filtrar</p>
          </div>
        </div>

        {/* Right Dashboard Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          
          {/* Banner de Tema Activo */}
          {selectedTopic !== 'Todos' && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #93c5fd',
                borderRadius: '8px',
                padding: '0.55rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#1e40af', fontSize: '0.88rem' }}>
                <span style={{ fontSize: '1.15rem' }}>🎯</span>
                <span>
                  Filtrando gráfico de barras y personas por: <strong>{selectedTopic}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopic('Todos')}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.78rem', backgroundColor: '#ffffff', color: '#1e40af', borderColor: '#93c5fd', fontWeight: 600 }}
              >
                ✕ Quitar filtro de tema
              </button>
            </div>
          )}

          {/* Top Bar Chart */}
          <div className="card" style={{ height: '300px' }}>
            <h3 style={{ fontSize: '1rem', textAlign: 'center', color: 'white', background: '#0078D4', padding: '0.25rem', marginTop: '-1rem', marginLeft: '-1rem', marginRight: '-1rem', marginBottom: '1rem', borderRadius: '4px 4px 0 0' }}>
              {selectedTopic === 'Todos'
                ? 'Capacitaciones Realizadas / Programadas / Reprogramadas Mensualmente (Click para filtrar)'
                : `Capacitaciones Mensuales: "${selectedTopic}" (Click para filtrar)`
              }
            </h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Legend iconType="circle" />
                <Bar 
                  dataKey="Realizadas" 
                  fill="#0078D4" 
                  radius={[4, 4, 0, 0]} 
                  onClick={(d, i) => handleBarClick(d, i, 'Realizadas')}
                  cursor="pointer"
                >
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-real-${index}`} fill="#0078D4" opacity={(crossFilter?.source === 'BarChart' && (crossFilter.monthIndex !== index || crossFilter.statusKey !== 'Realizadas')) ? 0.3 : 1} />
                  ))}
                </Bar>
                <Bar 
                  dataKey="Programadas" 
                  fill="#004B8B" 
                  radius={[4, 4, 0, 0]} 
                  onClick={(d, i) => handleBarClick(d, i, 'Programadas')}
                  cursor="pointer"
                >
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-prog-${index}`} fill="#004B8B" opacity={(crossFilter?.source === 'BarChart' && (crossFilter.monthIndex !== index || crossFilter.statusKey !== 'Programadas')) ? 0.3 : 1} />
                  ))}
                </Bar>
                <Bar 
                  dataKey="Reprogramadas" 
                  fill="#f97316" 
                  radius={[4, 4, 0, 0]} 
                  onClick={(d, i) => handleBarClick(d, i, 'Reprogramadas')}
                  cursor="pointer"
                >
                  {monthlyData.map((entry, index) => (
                    <Cell key={`cell-reprog-${index}`} fill="#f97316" opacity={(crossFilter?.source === 'BarChart' && (crossFilter.monthIndex !== index || crossFilter.statusKey !== 'Reprogramadas')) ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Table: Cumplimiento del PAC por Tema */}
          <div className="card" style={{ padding: 0 }}>
            <h3 style={{ fontSize: '1rem', textAlign: 'center', color: 'white', background: '#0078D4', padding: '0.5rem', margin: 0, borderRadius: '4px 4px 0 0' }}>
              Cumplimiento del PAC por Tema
            </h3>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                  <tr>
                    <th>Tema a capacitar</th>
                    <th style={{ textAlign: 'center' }}>% Cumplimiento</th>
                    <th style={{ textAlign: 'center' }}>% Eficacia</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pacData.map(row => {
                    const isSelected = selectedTopic === row.topic;
                    return (
                      <tr 
                        key={row.topic} 
                        onClick={() => setSelectedTopic(isSelected ? 'Todos' : row.topic)}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          fontWeight: isSelected ? 'bold' : 'normal'
                        }}
                        title={isSelected ? 'Click para quitar filtro de tema' : `Click para filtrar gráfico por ${row.topic}`}
                      >
                        <td>
                          {isSelected && <span style={{ marginRight: '0.4rem', color: '#0078D4' }}>✓</span>}
                          {row.topic}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: row.cumPct >= 80 ? '#00CC6A' : row.cumPct >= 50 ? '#FFB900' : '#D83B01',
                            fontWeight: 'bold'
                          }}>
                            {row.cumPct}%
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                            ({row.realizadas}/{row.programadas})
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            color: row.eficPct >= 80 ? '#00CC6A' : row.eficPct >= 50 ? '#FFB900' : '#D83B01',
                            fontWeight: 'bold'
                          }}>
                            {row.eficPct}%
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                            ({row.eficaces}/{row.realizadas})
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{row.programadas}</td>
                      </tr>
                    );
                  })}
                  {pacData.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                        No hay capacitaciones programadas en los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
                {pacData.length > 0 && (
                  <tfoot style={{ position: 'sticky', bottom: 0, background: '#f1f5f9', fontWeight: 'bold' }}>
                    <tr>
                      <td>Total</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: pacTotals.cumPct >= 80 ? '#00CC6A' : '#D83B01' }}>
                          {pacTotals.cumPct}%
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                          ({pacTotals.realizadas}/{pacTotals.programadas})
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: pacTotals.eficPct >= 80 ? '#00CC6A' : '#D83B01' }}>
                          {pacTotals.eficPct}%
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                          ({pacTotals.eficaces}/{pacTotals.realizadas})
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{pacTotals.programadas}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Collapsible Details Table */}
          <details style={{ background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              Ver Detalle de Registros ({detailedData.length})
            </summary>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '0.5rem' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Sector</th>
                    <th>Sitio / Base</th>
                    <th>Puesto</th>
                    <th>Capacitación</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedData.map(d => (
                    <tr key={d.id}>
                      <td>{d.employeeName}</td>
                      <td>{d.sectorName}</td>
                      <td>{d.baseOperativa || '-'}</td>
                      <td>{d.profileTitle}</td>
                      <td>{d.trainingName}</td>
                      <td>
                        <span className={`badge ${
                          d.status === 'COMPLETED' ? 'badge-success' : 
                          d.status === 'IN_PLAN' ? (d.isRescheduled ? 'badge-warning' : 'badge-primary') : 'badge-danger'
                        }`}>
                          {d.status === 'COMPLETED' ? 'Realizada' : 
                           d.status === 'IN_PLAN' ? (d.isRescheduled ? 'Reprogramada' : 'Programada') : 'Brecha'}
                        </span>
                      </td>
                      <td>{d.date ? new Date(d.date).toLocaleDateString('es-AR') : '-'}</td>
                    </tr>
                  ))}
                  {detailedData.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center' }}>No se encontraron registros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>

        </div>

      </div>

    </div>
  );
}

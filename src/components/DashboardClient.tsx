"use client";

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

type DashboardData = {
  id: number;
  status: string;
  effectiveness: string | null;
  trainingName: string;
  date: string | null;
  employeeName: string;
  employeeId: number;
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
  source: 'BarChart' | 'PieChart';
  monthIndex?: number;
  statusKey?: string; // 'Realizadas' | 'Programadas'
  tema?: string;
};

const COLORS = ['#0078D4', '#00CC6A', '#FFB900', '#D83B01', '#E3008C', '#8E562E', '#004B8B', '#B4009E'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function DashboardClient({ data, sectors, profiles, isSector }: Props) {
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedSector, setSelectedSector] = useState<string>('Todos');
  const [selectedProfile, setSelectedProfile] = useState<string>('Todos');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('Todos');

  const [crossFilter, setCrossFilter] = useState<CrossFilter | null>(null);

  // Extract unique years and employees for filters
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    data.forEach(d => {
      if (d.date) years.add(new Date(d.date).getFullYear().toString());
    });
    return Array.from(years).sort().reverse();
  }, [data]);

  // Map specific Sectors to their Gerencia
  const getGerenciaForSector = (sectorName: string) => {
    const map: Record<string, string> = {
      'Asistencia Vial': 'Gerencia de Prevencion y Seguridad Integral',
      'Seguridad Patrimonial': 'Gerencia de Prevencion y Seguridad Integral',
      'CCM': 'Gerencia de Prevencion y Seguridad Integral',
      'SGI': 'Auditoría Interna y Control de Gestión', // Optional guess based on DB
    };
    return map[sectorName] || sectorName;
  };

  // Cascading logic for Profiles (depends on Sector)
  const availableProfiles = useMemo(() => {
    if (selectedSector === 'Todos') return profiles;
    
    const sectorObj = sectors.find(s => s.id.toString() === selectedSector);
    const sectorName = sectorObj?.name || "";
    const mappedGerencia = getGerenciaForSector(sectorName);
    
    const staticProfiles = profiles.filter(p => p.gerencia === mappedGerencia || p.gerencia === sectorName);
    if (staticProfiles.length > 0) return staticProfiles;
    
    // Fallback: If no static matches, use the data-driven approach
    const sectorProfileIds = new Set<number>();
    data.forEach(d => {
      if (d.sectorId.toString() === selectedSector && d.profileId) {
        sectorProfileIds.add(d.profileId);
      }
    });
    return profiles.filter(p => sectorProfileIds.has(p.id));
  }, [profiles, data, selectedSector, sectors]);

  // Cascading logic for Employees (depends on Sector and Profile)
  const availableEmployees = useMemo(() => {
    const emps = new Set<string>();
    data.forEach(d => {
      let pass = true;
      if (selectedSector !== 'Todos' && d.sectorId.toString() !== selectedSector) pass = false;
      if (selectedProfile !== 'Todos' && d.profileId?.toString() !== selectedProfile) pass = false;
      if (pass) emps.add(d.employeeName);
    });
    return Array.from(emps).sort();
  }, [data, selectedSector, selectedProfile]);

  // Reset dependent filters if they become invalid
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

  // Apply GLOBAL filters (Dropdowns)
  const filteredData = useMemo(() => {
    return data.filter(d => {
      let pass = true;
      if (selectedSector !== 'Todos' && d.sectorId.toString() !== selectedSector) pass = false;
      if (selectedProfile !== 'Todos' && d.profileId?.toString() !== selectedProfile) pass = false;
      if (selectedEmployee !== 'Todos' && d.employeeName !== selectedEmployee) pass = false;
      
      if (d.date) {
        const dObj = new Date(d.date);
        if (selectedYear !== 'Todos' && dObj.getFullYear().toString() !== selectedYear) pass = false;
        if (selectedMonth !== 'Todos' && dObj.getMonth().toString() !== selectedMonth) pass = false;
      } else {
        if (selectedYear !== 'Todos' || selectedMonth !== 'Todos') pass = false;
      }
      
      return pass;
    });
  }, [data, selectedYear, selectedMonth, selectedSector, selectedProfile, selectedEmployee]);

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
          if (crossFilter.statusKey === 'Programadas') return d.status === 'IN_PLAN' || d.status === 'COMPLETED';
          return true;
        });
      } else if (crossFilter.source === 'PieChart') {
        result = result.filter(d => d.trainingName === crossFilter.tema && d.status === 'COMPLETED');
      }
    }
    return result;
  }, [filteredData, crossFilter]);

  // Chart 1: Donut (Categorías/Temas de las Realizadas) -> Always use global filteredData so it doesn't disappear when clicked
  const donutData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.filter(d => d.status === 'COMPLETED').forEach(d => {
      counts[d.trainingName] = (counts[d.trainingName] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] })).sort((a,b) => b.value - a.value).slice(0, 8); // top 8
  }, [filteredData]);

  // Chart 2: Bar (Mensual) -> Always use global filteredData
  const monthlyData = useMemo(() => {
    const mData = MONTHS.map((m, i) => ({ name: m, Realizadas: 0, Programadas: 0 }));
    filteredData.forEach(d => {
      if (d.date) {
        const monthIndex = new Date(d.date).getMonth();
        if (d.status === 'COMPLETED') mData[monthIndex].Realizadas += 1;
        if (d.status === 'IN_PLAN' || d.status === 'COMPLETED') mData[monthIndex].Programadas += 1;
      }
    });
    return mData;
  }, [filteredData]);

  // KPIs -> React to cross filters!
  const realizadas = detailedData.filter(d => d.status === 'COMPLETED').length;
  const programadas = detailedData.filter(d => d.status === 'IN_PLAN' || d.status === 'COMPLETED').length;
  const pendientes = detailedData.filter(d => d.status === 'GAP').length;
  const totalGeneral = programadas + pendientes;
  const tasaCumplimiento = totalGeneral > 0 ? Math.round((realizadas / totalGeneral) * 100) : 0;
  
  const strokeDasharray = 125.6;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * tasaCumplimiento) / 100;

  // Table: Cumplimiento PAC por Tema -> React to cross filters
  const pacData = useMemo(() => {
    const stats: Record<string, { realizadas: number, programadas: number, eficaces: number, evaluadas: number }> = {};
    detailedData.forEach(d => {
      if (d.status === 'GAP') return; 
      if (!stats[d.trainingName]) {
        stats[d.trainingName] = { realizadas: 0, programadas: 0, eficaces: 0, evaluadas: 0 };
      }
      if (d.status === 'IN_PLAN' || d.status === 'COMPLETED') stats[d.trainingName].programadas += 1;
      if (d.status === 'COMPLETED') stats[d.trainingName].realizadas += 1;
      
      if (d.status === 'COMPLETED' && d.effectiveness && d.effectiveness !== 'PENDING') {
        stats[d.trainingName].evaluadas += 1;
        if (d.effectiveness === 'EFFECTIVE') {
          stats[d.trainingName].eficaces += 1;
        }
      }
    });
    return Object.keys(stats).map(key => {
      const s = stats[key];
      const cump = s.programadas > 0 ? (s.realizadas / s.programadas) * 100 : 0;
      const efic = s.evaluadas > 0 ? (s.eficaces / s.evaluadas) * 100 : 0;
      return { tema: key, cump, efic };
    }).sort((a,b) => b.cump - a.cump);
  }, [detailedData]);

  // Handlers
  const handleBarClick = (data: any, index: number, key: string) => {
    if (crossFilter?.source === 'BarChart' && crossFilter.monthIndex === index && crossFilter.statusKey === key) {
      setCrossFilter(null);
    } else {
      setCrossFilter({ source: 'BarChart', monthIndex: index, statusKey: key });
    }
  };

  const handlePieClick = (data: any) => {
    if (crossFilter?.source === 'PieChart' && crossFilter.tema === data.name) {
      setCrossFilter(null);
    } else {
      setCrossFilter({ source: 'PieChart', tema: data.name });
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
      </div>

      {/* Main Filters & Content Grid */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        
        {/* Left Sidebar Filters */}
        <div className="card" style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isSector && (
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>Gerencia / Sector</label>
              <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)} className="form-input">
                <option value="Todos">Todas</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>Perfil de Puesto</label>
            <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="form-input">
              <option value="Todos">Todos</option>
              {availableProfiles.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>Nombre y Apellido</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="form-input">
              <option value="Todos">Todos</option>
              {availableEmployees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, textAlign: 'center', background: '#0078D4', color: 'white', padding: '0.5rem', borderRadius: '4px', opacity: crossFilter?.statusKey === 'Programadas' ? 0.5 : 1 }}>
              <div style={{ fontSize: '0.75rem' }}>Cap. Realizadas</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{realizadas}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: '#004B8B', color: 'white', padding: '0.5rem', borderRadius: '4px', opacity: crossFilter?.statusKey === 'Realizadas' ? 0.5 : 1 }}>
              <div style={{ fontSize: '0.75rem' }}>Cap. Programadas</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{programadas}</div>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={(crossFilter?.source === 'PieChart' && crossFilter.tema !== entry.name) ? 0.3 : 1} />
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
          
          {/* Top Bar Chart */}
          <div className="card" style={{ height: '300px' }}>
            <h3 style={{ fontSize: '1rem', textAlign: 'center', color: 'white', background: '#0078D4', padding: '0.25rem', marginTop: '-1rem', marginLeft: '-1rem', marginRight: '-1rem', marginBottom: '1rem', borderRadius: '4px 4px 0 0' }}>
              Capacitaciones Realizadas / Programadas Mensualmente (Click para filtrar)
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
                    <Cell key={`cell-${index}`} fill="#0078D4" opacity={(crossFilter?.source === 'BarChart' && (crossFilter.monthIndex !== index || crossFilter.statusKey !== 'Realizadas')) ? 0.3 : 1} />
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
                    <Cell key={`cell-${index}`} fill="#004B8B" opacity={(crossFilter?.source === 'BarChart' && (crossFilter.monthIndex !== index || crossFilter.statusKey !== 'Programadas')) ? 0.3 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Table Cumplimiento */}
            <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1rem', textAlign: 'center', color: 'white', background: '#0078D4', padding: '0.25rem', margin: 0 }}>
                Cumplimiento del PAC por Tema
              </h3>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Tema a capacitar</th>
                      <th style={{ position: 'sticky', top: 0, background: '#f8fafc', textAlign: 'center' }}>% Cump.</th>
                      <th style={{ position: 'sticky', top: 0, background: '#f8fafc', textAlign: 'center' }}>% Efic.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacData.map((r, i) => (
                      <tr key={i}>
                        <td>{r.tema}</td>
                        <td style={{ textAlign: 'center', background: r.cump >= 80 ? '#dcfce7' : (r.cump > 0 ? '#fef9c3' : '#fee2e2') }}>
                          {r.cump.toFixed(1)}%
                        </td>
                        <td style={{ textAlign: 'center', background: r.efic >= 80 ? '#dcfce7' : (r.efic > 0 ? '#fef9c3' : '#fee2e2') }}>
                          {r.efic.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                    {pacData.length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center' }}>Sin datos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Detailed Records Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: crossFilter ? '4px solid var(--secondary-color)' : 'none' }}>
            <h3 style={{ fontSize: '1rem', textAlign: 'center', color: 'white', background: '#004B8B', padding: '0.25rem', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ paddingLeft: '1rem' }}>Listado de Empleados (Impactado por Filtros Gráficos)</span>
              <span style={{ paddingRight: '1rem', fontSize: '0.75rem', background: '#ffffff33', padding: '2px 8px', borderRadius: '10px' }}>
                {detailedData.length} registros
              </span>
            </h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="data-table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Fecha</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Empleado</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Sector</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Tema</th>
                    <th style={{ position: 'sticky', top: 0, background: '#f8fafc' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedData.slice(0, 100).map(d => (
                    <tr key={d.id}>
                      <td>{d.date ? new Date(d.date).toLocaleDateString('es-AR') : '-'}</td>
                      <td style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{d.employeeName}</td>
                      <td>{d.sectorName}</td>
                      <td>{d.trainingName}</td>
                      <td>
                        {d.status === 'COMPLETED' ? <span className="badge badge-success">Realizada</span> : 
                         d.status === 'IN_PLAN' ? <span className="badge badge-warning">Programada</span> : 
                         <span className="badge">Brecha</span>}
                      </td>
                    </tr>
                  ))}
                  {detailedData.length > 100 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Mostrando los primeros 100 resultados... Usa los filtros superiores para refinar.
                      </td>
                    </tr>
                  )}
                  {detailedData.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                        No hay registros para la selección actual.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export function RoleSelector({ currentRole, sectors }: { currentRole: string, sectors: { id: number, name: string }[] }) {
  const router = useRouter();

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    document.cookie = `activeRole=${newRole}; path=/`;
    router.refresh();
  };

  return (
    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
        Simular Usuario (Auth)
      </label>
      <select 
        value={currentRole} 
        onChange={handleRoleChange}
        style={{ width: '100%', padding: '0.5rem', backgroundColor: '#f1f5f9', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.875rem' }}
      >
        <option value="ADMIN" style={{ color: 'black' }}>Administrador</option>
        <option value="RRHH" style={{ color: 'black' }}>Recursos Humanos</option>
        <optgroup label="Responsables de Sector" style={{ color: 'black' }}>
          {sectors.map(s => (
            <option key={s.id} value={`SECTOR_${s.id}`} style={{ color: 'black' }}>
              Responsable: {s.name}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}

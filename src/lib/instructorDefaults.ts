/**
 * Reglas de instructores y responsables por sector para la emisión de planillas de asistencia y registros
 */

export interface SectorInstructorInfo {
  name: string;
  title: string;
  legajo?: string;
}

export function getDefaultInstructorForSector(sectorName?: string | null): SectorInstructorInfo {
  const norm = (sectorName || "").toLowerCase().trim();

  // 1. Reglas específicas solicitadas:
  if (norm.includes("comercial")) {
    return {
      name: "David Ceballos",
      title: "Responsable — Gerencia Comercial",
      legajo: "11410"
    };
  }

  if (norm.includes("operaciones")) {
    return {
      name: "Horacio San Martin",
      title: "Responsable — Gerencia de Operaciones",
      legajo: "13023"
    };
  }

  // 2. Rango superior por sector:
  if (norm.includes("asistencia vial")) {
    return {
      name: "Juan Olmos",
      title: "Jefe de Asistencia Vial",
      legajo: "40100"
    };
  }

  if (norm.includes("ccm") || norm.includes("control y monitoreo")) {
    return {
      name: "Ezequiel Tosso",
      title: "Jefe del Centro de Control y Monitoreo",
      legajo: "11660"
    };
  }

  if (norm.includes("taller")) {
    return {
      name: "Alvaro Gabriel Zeron",
      title: "Jefe de Taller Mecánico",
      legajo: "40112"
    };
  }

  if (norm.includes("seguridad e higiene") || norm.includes("higiene")) {
    return {
      name: "Federico Morales",
      title: "Responsable de Seguridad e Higiene",
      legajo: "13013"
    };
  }

  if (norm.includes("asuntos legales") || norm.includes("legales")) {
    return {
      name: "Alfredo Domínguez",
      title: "Gerente de Asuntos Legales",
      legajo: "14309"
    };
  }

  if (norm.includes("compras")) {
    return {
      name: "Pablo Fernandez Fayolle",
      title: "Gerente de Compras",
      legajo: "32981"
    };
  }

  if (norm.includes("sistemas")) {
    return {
      name: "Emmanuel Benitez",
      title: "Jefe de Operaciones - Sistemas",
      legajo: "40085"
    };
  }

  if (norm.includes("recursos humanos") || norm.includes("rrhh")) {
    return {
      name: "Candela Cuevas",
      title: "Gerente de Recursos Humanos",
      legajo: "40097"
    };
  }

  if (norm.includes("relaciones institucionales") || norm.includes("institucionales")) {
    return {
      name: "Eduardo Rodríguez",
      title: "Subgerente de Relaciones Institucionales",
      legajo: "40076"
    };
  }

  if (norm.includes("sgi")) {
    return {
      name: "Montes Sergio",
      title: "Jefe de Departamento del SGI",
      legajo: "11739"
    };
  }

  return {
    name: "Responsable de Sector",
    title: "Rango Superior del Sector"
  };
}

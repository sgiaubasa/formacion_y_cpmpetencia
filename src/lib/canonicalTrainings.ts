/**
 * Mapa de canónicos para unificar variantes de nombres de capacitación
 * que tengan puntuación, acentos, mayúsculas, sufijo de sede o typos,
 * evitando que aparezcan duplicados en los desplegables de Dashboard y Plan Anual.
 */

function stripAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Normaliza y devuelve el nombre canónico oficial de la capacitación.
 */
export function getCanonicalTrainingName(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const clean = stripAccents(trimmed);

  // 1. Identificación de riesgos, estimación de peligros...
  if (
    clean.includes("identificacion de riesgos") &&
    clean.includes("peligros") &&
    clean.includes("proteccion personal")
  ) {
    return "Identificación de riesgos, estimación de peligros y su impacto a la salud. Prevención de accidentes y enfermedades profesionales. Elementos de protección personal.";
  }

  // 2. Sistema de autoprotección...
  if (
    clean.includes("sistema de autoproteccion") &&
    clean.includes("focos igneos")
  ) {
    return "Sistema de autoprotección. Prevención y extinción de focos ígneos. Plan de acción ante emergencias.";
  }

  // 3. Riesgo eléctrico mantenimiento y trabajos en altura
  if (
    clean.includes("riesgo electrico mantenimiento") ||
    clean.includes("riesgos electricos mantenimiento")
  ) {
    return "Riesgo eléctrico mantenimiento y trabajos en altura";
  }

  // 4. Riesgo eléctrico en oficinas / Riesgos eléctricos oficina
  if (
    clean.includes("riesgo electrico en oficinas") ||
    clean.includes("riesgos electricos oficina") ||
    clean.includes("riesgo electrico oficinas") ||
    clean.includes("riego electrico oficinas")
  ) {
    return "Riesgo eléctrico en oficinas";
  }

  // 5. Manejo manual de cargas y ergonomía
  if (
    clean.includes("manejo manual de carga") ||
    clean.includes("manejo manual de cargas")
  ) {
    return "Manejo manual de cargas y ergonomía";
  }

  // 6. Manejo seguro y responsable. Accidentes in itinere
  if (
    clean.includes("manejo seguro") &&
    clean.includes("itinere")
  ) {
    return "Manejo seguro y responsable. Accidentes in itinere";
  }

  // 7. Accidentes In Itinere y vía pública
  if (
    clean.includes("accidentes initinere") ||
    clean.includes("accidentes in itinere y via")
  ) {
    return "Accidentes In Itinere y vía pública";
  }

  // 8. Funciones y Responsabilidades del personal de Maestranza (con sedes)
  if (clean.includes("funciones y responsabilidades del personal de maestranza")) {
    return "Funciones y Responsabilidades del personal de Maestranza";
  }

  // 9. Funciones y Responsabilidades del personal de Servicios Generales (con sedes)
  if (clean.includes("funciones y responsabilidades del personal de servicios generales")) {
    return "Funciones y Responsabilidades del personal de Servicios Generales";
  }

  // 10. Reglamento del usuario (La Huella, Maipú, Contrato de Concesión...)
  if (clean.startsWith("reglamento del usuario") || clean.startsWith("reglamento de usuario")) {
    if (clean.includes("contrato de concesion")) {
      return "Reglamento del Usuario y Contrato de Concesión";
    }
    return "Reglamento del Usuario";
  }

  // 11. Uso del Sistema de Gestión de Competencia y Formación — AUBASA
  if (
    clean.includes("gestion de competencia y formacion") ||
    clean.includes("sgcysv")
  ) {
    return "Uso del Sistema de Gestión de Competencia y Formación — AUBASA";
  }

  // 12. ITAU 04/05 Gestión de Seguridad Vial
  if (clean.includes("itau 04/05") && clean.includes("seguridad vial")) {
    return "ITAU 04/05 Gestión de Seguridad Vial";
  }

  // 13. ITAU-04/04 Detección de alertas y atención de contingencias
  if (clean.includes("itau-04/04") || clean.includes("itau 04/04") || clean.includes("deteccion de alertas")) {
    return "ITAU-04/04 Detección de alertas y atención de contingencias";
  }

  // 14. ITAU-04/06 Gestión de la Asistencia Vial
  if (clean.includes("itau-04/06") || clean.includes("itau 04/06") || clean.includes("gestion de la asistencia vial")) {
    return "ITAU-04/06 Gestión de la Asistencia Vial";
  }

  // 15. ITAU-04/08 Gestión del Sistema de Percepción de Peaje Dock Sud
  if (clean.includes("itau-04/08") || clean.includes("itau 04/08") || clean.includes("itau/04/08") || clean.includes("peaje dock sud")) {
    return "ITAU-04/08 Gestión del Sistema de Percepción de Peaje Dock Sud";
  }

  // 16. ITAU-04/09 Gestión del Sistema de Percepción de Peaje Hudson
  if (clean.includes("itau-04/09") || clean.includes("itau 04/09") || clean.includes("peaje hudson")) {
    return "ITAU-04/09 Gestión del Sistema de Percepción de Peaje Hudson";
  }

  // 17. ITAU-04/10 Gestión del Sistema de Percepción de Peaje Bernal - Quilmes - Berazategui
  if (clean.includes("itau-04/10") || clean.includes("itau 04/10") || clean.includes("bernal - quilmes")) {
    return "ITAU-04/10 Gestión del Sistema de Percepción de Peaje Bernal - Quilmes - Berazategui";
  }

  // 18. Ley Nacional de Tránsito N° 24449
  if (clean.includes("ley nacional de transito") || clean.includes("ley 24449") || clean.includes("ley nacional de transito 24449")) {
    return "Ley Nacional de Tránsito N° 24449";
  }

  // 19. Evaluación del Desempeño PAU/07
  if (clean.includes("evaluacion del desempeno pau_07") || clean.includes("evaluacion del desempeno pau/07")) {
    return "Evaluación del Desempeño PAU/07 — Anexo 3 y Anexo 4";
  }

  // 20. Auditor Interno Iso 9001-39001
  if (clean.includes("auditor interno") && (clean.includes("iso") || clean.includes("39001") || clean.includes("9001"))) {
    return "Auditor Interno ISO 9001 / ISO 39001";
  }

  // 21. Si termina con punto final aislado que genera duplicado con la versión sin punto:
  // e.g. "Texto." vs "Texto" -> quitamos el punto final redundante si la mayoría no lo lleva
  if (trimmed.endsWith(".") && !trimmed.endsWith("..")) {
    const withoutDot = trimmed.slice(0, -1).trim();
    if (withoutDot.length > 5) {
      // mantenemos consistente
      return withoutDot;
    }
  }

  return trimmed;
}

/**
 * Normaliza un array de temas para filtros, eliminando repetidos
 * y ordenando alfabéticamente.
 */
export function getUniqueCanonicalTopics(topics: string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const t of topics) {
    if (!t) continue;
    const can = getCanonicalTrainingName(t);
    if (can && !seen.has(can)) {
      seen.add(can);
      list.push(can);
    }
  }
  return list.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

"use client";

import React from "react";

export default function ManualDeUsoPage() {
  return (
    <div style={{ maxWidth: "980px", margin: "0 auto", paddingBottom: "3rem" }}>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem"
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              backgroundColor: "#dbeafe",
              color: "#1e40af",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              marginBottom: "0.5rem"
            }}
          >
            Guía Práctica del Sistema — SGCySV / RRHH
          </span>
          <h1 className="page-title" style={{ margin: 0 }}>
            📖 Manual de Uso: Gestión de Competencia y Formación
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.35rem" }}>
            Instructivo paso a paso sobre el funcionamiento de la plataforma, planificación, carga de capacitaciones, registro de firmas y evaluación de eficacia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          🖨️ Imprimir / Guardar en PDF
        </button>
      </div>

      {/* 1. DE QUÉ SE TRATA LA APLICACIÓN */}
      <div className="card" style={{ marginBottom: "1.5rem", lineHeight: 1.65 }}>
        <h2 style={{ color: "var(--primary-color)", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.25rem" }}>
          1. ¿De qué se trata esta nueva aplicación?
        </h2>
        <p style={{ color: "#334155", marginBottom: "0.75rem" }}>
          El <strong>Sistema de Gestión de Competencia y Formación</strong> es la plataforma digital de <strong>AUBASA</strong> diseñada para gestionar de punta a punta la capacitación, el desarrollo de competencias y la trazabilidad documental del personal, alineada con los requisitos del <strong>Sistema de Gestión Integrado (SGI)</strong> y <strong>Recursos Humanos (RRHH)</strong>.
        </p>
        <p style={{ color: "#334155", marginBottom: "1rem" }}>
          Su objetivo es centralizar en un único lugar todo el ciclo formativo de cada colaborador: desde la detección de necesidades según su puesto de trabajo y la planificación anual, hasta la constancia de realización (con fecha, nota y firmas digitales o documentos adjuntos) y la posterior evaluación de eficacia en su tarea diaria.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1rem"
          }}
        >
          {[
            { step: "1. Planificar", desc: "Por Sector, Puesto o Persona en el Plan Anual" },
            { step: "2. Objetivo", desc: "Definir qué se busca lograr con la capacitación" },
            { step: "3. Realización", desc: "Cargar Fecha, Nota (0 a 10) e Instructor" },
            { step: "4. Firmas / Evidencia", desc: "Adjunto, Firma en Pantalla o Link WhatsApp/Mail" },
            { step: "5. Eficacia", desc: "Evaluar en el puesto si cumple con el objetivo" }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "10px",
                padding: "0.85rem",
                textAlign: "center"
              }}
            >
              <div style={{ fontWeight: 700, color: "#1e40af", fontSize: "0.92rem", marginBottom: "0.25rem" }}>
                {item.step}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: "#f8fafc",
            borderLeft: "4px solid #0284c7",
            padding: "0.85rem 1rem",
            borderRadius: "0 8px 8px 0",
            fontSize: "0.9rem",
            color: "#334155"
          }}
        >
          <strong>🔒 Visibilidad por Sector:</strong> Cada referente o responsable de sector visualiza únicamente el personal, los perfiles, los temas y las capacitaciones correspondientes a su propio sector/gerencia. Las áreas de <strong>RRHH</strong> y <strong>SGI</strong> cuentan con visibilidad global de toda la compañía.
        </div>
      </div>

      {/* 2. CÓMO PLANIFICAR */}
      <div className="card" style={{ marginBottom: "1.5rem", lineHeight: 1.65 }}>
        <h2 style={{ color: "var(--primary-color)", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.25rem" }}>
          2. ¿Cómo planificar capacitaciones en el Plan Anual?
        </h2>
        <p style={{ color: "#334155", marginBottom: "1rem" }}>
          Ingresando a la pestaña <strong>📅 Plan Anual</strong> en el menú izquierdo, encontrarás el panel <strong>&ldquo;Programar Capacitación / Agregar al Plan&rdquo;</strong>. Allí podés planificar eligiendo una de las <strong>tres modalidades de alcance</strong>:
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}
        >
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem", backgroundColor: "#fff" }}>
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem", color: "#0f3d7a" }}>🏢 A. Planificar por Sector</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#475569" }}>
              Seleccioná la opción <strong>Sector</strong> cuando una capacitación o charla aplique a toda un área o gerencia completa. El sistema asignará automáticamente la capacitación a todas las personas activas de ese sector.
            </p>
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem", backgroundColor: "#fff" }}>
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem", color: "#0f3d7a" }}>💼 B. Planificar por Puesto</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#475569" }}>
              Seleccioná la opción <strong>Puesto</strong> cuando la formación sea específica para una función determinada (ej. <em>Peajista</em>, <em>Supervisor</em>, <em>Operador</em>). Se programará para todos los colaboradores que ocupen ese puesto.
            </p>
          </div>

          <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "1rem", backgroundColor: "#fff" }}>
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem", color: "#0f3d7a" }}>👤 C. Planificar por Persona</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#475569" }}>
              Seleccioná la opción <strong>Empleado</strong> cuando necesites capacitar a una persona en particular. Podés filtrar por sector y buscar por <strong>Nombre o Legajo</strong> para asignarla individualmente.
            </p>
          </div>
        </div>

        <h3 style={{ fontSize: "1.05rem", color: "#1e293b", marginBottom: "0.5rem" }}>
          Datos a completar al programar:
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#334155", fontSize: "0.93rem" }}>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>Tema de Capacitación:</strong> Seleccioná el tema del desplegable correspondiente a tu sector.
          </li>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>Objetivo de la Capacitación (Muy importante):</strong> Redactá qué buscás lograr con esta capacitación (por ejemplo: <em>que conozca la norma</em>, <em>que trabaje alineado a la Política del Sistema de Gestión Integrado</em> o <em>que aplique correctamente un procedimiento específico de su puesto</em>). Este objetivo será la base para evaluar luego la eficacia.
          </li>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>Fecha Programada:</strong> Indicá la fecha prevista. La capacitación quedará registrada en estado <strong>Programado (En Plan)</strong>.
          </li>
          <li>
            <strong>Material de Capacitación (Opcional):</strong> Podés adjuntar el documento o presentación que se dictará para que quede disponible como consulta.
          </li>
        </ul>
      </div>

      {/* 3. CARGA DE CAPACITACIÓN Y 3 FORMAS DE FIRMA */}
      <div className="card" style={{ marginBottom: "1.5rem", lineHeight: 1.65 }}>
        <h2 style={{ color: "var(--primary-color)", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.25rem" }}>
          3. Carga de la Capacitación Realizada y las 3 Modalidades de Registro de Firmas
        </h2>
        <p style={{ color: "#334155", marginBottom: "1rem" }}>
          Una vez dictada la capacitación, desde la gestión del <strong>Plan Anual</strong> debés registrar la <strong>Fecha de realización</strong>, la <strong>Nota / Calificación (de 0 a 10)</strong> y el <strong>Nombre del Instructor</strong> (además de tildar si requiere o no medir eficacia, opción que por defecto viene sin tildar). Para dejar constancia de las firmas y pasar el estado de <strong>Programado</strong> a <strong>Realizado</strong>, contás con <strong>tres opciones</strong>:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "#0f3d7a" }}>
              📎 Opción 1: Adjuntar un Documento / Planilla con el Registro de Firmas
            </h3>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155" }}>
              Si la capacitación se realizó con una planilla física en papel o examen firmado, ingresá en la solapa de carga de la capacitación, colocá la <strong>Fecha</strong>, la <strong>Nota</strong> y el <strong>Instructor</strong>, y <strong>adjuntá el documento escaneado o foto (PDF/imagen)</strong> donde conste el registro de firmas de la capacitación realizada. Al guardar, pasa automáticamente a <strong>Realizado</strong>.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "#0f3d7a" }}>
              ✍️ Opción 2: Firma Presencial con la Aplicación Abierta (Celular o Computadora)
            </h3>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155" }}>
              Si el instructor y la persona capacitada están presentes con la aplicación abierta (ya sea en un <strong>teléfono celular, tablet o computadora</strong>), pueden abrir la ventana de registro, colocar la <strong>Fecha</strong> y la <strong>Nota</strong>, y <strong>firmar directamente en la pantalla</strong> tanto el <strong>Instructor</strong> como la <strong>Persona capacitada</strong>. Al confirmar, quedan guardadas ambas firmas digitales y pasa a <strong>Realizado</strong>.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "#0f3d7a" }}>
              📲 Opción 3: Envío de Enlace (Link) por Mail o WhatsApp al Instructor y al Capacitado
            </h3>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155" }}>
              Si las personas se encuentran en distintas bases, estaciones o turnos, podés generar el <strong>enlace único de firma</strong> desde la fila de la capacitación y enviarlo por <strong>WhatsApp o Correo Electrónico</strong> al <strong>Instructor</strong> y a la <strong>Persona que realizó la capacitación</strong>. Al abrir el link desde su celular y firmar, el estado cambia automáticamente de <strong>Programado</strong> a <strong>Realizado</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 4. EVALUACIÓN DE EFICACIA Y OBJETIVO */}
      <div className="card" style={{ lineHeight: 1.65 }}>
        <h2 style={{ color: "var(--primary-color)", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.25rem" }}>
          4. Evaluación de la Eficacia: Relación directa con el Objetivo
        </h2>
        <p style={{ color: "#334155", marginBottom: "0.75rem" }}>
          Una vez que la capacitación figura como <strong>Realizada</strong> (y tiene habilitada la medición de eficacia), se cuenta con el tiempo de seguimiento (hasta <strong>2 meses / 60 días</strong>) para evaluar en la práctica si la capacitación fue eficaz.
        </p>

        <h3 style={{ fontSize: "1.05rem", color: "#1e293b", marginBottom: "0.5rem" }}>
          ¿Cómo debe evaluarse la eficacia respecto al Objetivo?
        </h3>
        <p style={{ color: "#334155", marginBottom: "0.75rem" }}>
          La evaluación de eficacia tiene que tener <strong>relación directa con el Objetivo</strong> que se definió para esa capacitación:
        </p>
        <ul style={{ margin: "0 0 1rem 0", paddingLeft: "1.25rem", color: "#334155", fontSize: "0.93rem" }}>
          <li style={{ marginBottom: "0.45rem" }}>
            <strong>¿Qué pusimos en el Objetivo?</strong> Cuando cargamos un objetivo, indicamos <em>qué buscamos lograr con esa capacitación</em>: por ejemplo, que la persona tenga conocimiento de la norma, que lleve adelante su tarea a través de la Política del Sistema de Gestión Integrado, o que aplique un procedimiento particular relacionado con su trabajo.
          </li>
          <li style={{ marginBottom: "0.45rem" }}>
            <strong>¿Qué debemos verificar al evaluar la Eficacia?</strong> Debemos observar si la persona <strong>cumple o no con esos objetivos</strong> de la capacitación realizada: es decir, si adquirió los conocimientos y si <strong>lleva adelante el trabajo como lo debe llevar</strong>.
          </li>
          <li>
            <strong>¿Cómo se registra en el sistema?</strong> Si la persona lo lleva adelante correctamente, se escribe una <strong>breve descripción</strong> dejando constancia de que cuenta con los conocimientos o realiza el trabajo acorde al objetivo buscado, y se marca como <strong>✅ Eficaz</strong> (o <strong>❌ No Eficaz</strong> si aún no alcanza el objetivo y requiere recapacitación).
          </li>
        </ul>

        <div
          style={{
            backgroundColor: "#dcfce7",
            borderLeft: "4px solid #15803d",
            padding: "0.95rem 1.15rem",
            borderRadius: "0 8px 8px 0",
            fontSize: "0.92rem",
            color: "#14532d"
          }}
        >
          <strong>💡 Ejemplo de Evaluación de Eficacia bien redactada:</strong>
          <div style={{ marginTop: "0.35rem" }}>
            • <strong>Objetivo de la capacitación:</strong> <em>&ldquo;Que la persona conozca la norma y lleve adelante sus tareas operativas aplicando la Política del Sistema de Gestión Integrado.&rdquo;</em>
          </div>
          <div style={{ marginTop: "0.25rem" }}>
            • <strong>Descripción al evaluar eficacia:</strong> <em>&ldquo;El colaborador demuestra tener los conocimientos requeridos y lleva adelante su trabajo diario cumpliendo adecuadamente con los lineamientos de la norma y la política de gestión integrada.&rdquo;</em> → Resultado: <strong>EFICAZ</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

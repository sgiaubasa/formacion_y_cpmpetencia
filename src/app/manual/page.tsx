"use client";

import React from "react";

export default function ManualDeUsoPage() {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* ENCABEZADO INSTITUCIONAL AUBASA */}
      <div
        className="card"
        style={{
          marginBottom: "1.75rem",
          borderTop: "5px solid #0d8383",
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdfa 65%, #e0f2fe 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
          padding: "1.75rem 2rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", flex: "1 1 520px" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "0.75rem 1.1rem",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 2px 6px rgba(13, 131, 131, 0.08)"
            }}
          >
            <img
              src="/logo.png"
              alt="Logo AUBASA"
              style={{ width: "165px", height: "auto", objectFit: "contain", display: "block" }}
            />
          </div>

          <div style={{ flex: "1 1 320px" }}>
            <span
              style={{
                display: "inline-block",
                backgroundColor: "#0d8383",
                color: "#ffffff",
                fontSize: "0.74rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "0.28rem 0.8rem",
                borderRadius: "999px",
                marginBottom: "0.5rem"
              }}
            >
              Manual Oficial de Usuario — SGCySV &amp; RRHH
            </span>
            <h1
              style={{
                margin: 0,
                fontSize: "1.65rem",
                color: "#1b365d",
                fontWeight: 800,
                lineHeight: 1.25
              }}
            >
              Sistema de Gestión de Competencia y Formación
            </h1>
            <p style={{ color: "#475569", marginTop: "0.4rem", marginBottom: 0, fontSize: "0.95rem" }}>
              Guía integral de uso: Evaluación Inicial y Transferencias, Planificación Anual, Carga de Capacitaciones, Registro de Firmas y Evaluación de la Eficacia.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn"
          style={{
            backgroundColor: "#1b365d",
            color: "#ffffff",
            padding: "0.65rem 1.25rem",
            borderRadius: "8px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "0 2px 6px rgba(27, 54, 93, 0.2)"
          }}
        >
          🖨️ Imprimir / Guardar en PDF
        </button>
      </div>

      {/* 1. DE QUÉ SE TRATA LA APLICACIÓN */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          lineHeight: 1.65,
          borderLeft: "5px solid #0d8383"
        }}
      >
        <h2 style={{ color: "#1b365d", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.3rem" }}>
          1. ¿De qué se trata esta nueva aplicación?
        </h2>
        <p style={{ color: "#334155", marginBottom: "0.75rem" }}>
          El <strong>Sistema de Gestión de Competencia y Formación</strong> es la plataforma digital de <strong>AUBASA</strong> creada para gestionar de manera simple, ordenada y trazable toda la formación y el desarrollo de competencias de las personas que integran la empresa, en cumplimiento con los lineamientos del <strong>Sistema de Gestión Integrado (SGI)</strong> y <strong>Recursos Humanos (RRHH)</strong>.
        </p>
        <p style={{ color: "#334155", marginBottom: "1.1rem" }}>
          Esta aplicación permite que cada Gerencia y Sector acompañe la evolución de su personal en todas las instancias: desde que una persona ingresa o cambia de puesto (<strong>Evaluación Inicial</strong>), pasando por la <strong>Planificación Anual</strong> de capacitaciones, el <strong>registro de realización con nota y firmas digitales</strong>, hasta la verificación en el puesto de trabajo mediante la <strong>Evaluación de la Eficacia</strong>.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.1rem"
          }}
        >
          {[
            {
              step: "1. Evaluación Inicial",
              desc: "Recepción por cambio de puesto/transferencia y programación a 90 días"
            },
            {
              step: "2. Planificación",
              desc: "Programación en el Plan Anual por Sector, Puesto o Persona con su Objetivo"
            },
            {
              step: "3. Realización",
              desc: "Carga de Fecha, Calificación (Nota) e Instructor"
            },
            {
              step: "4. Registro de Firmas",
              desc: "Documento adjunto, Firma en Pantalla o Link por Mail/WhatsApp"
            },
            {
              step: "5. Eficacia",
              desc: "Evaluación a los 60 días verificando el cumplimiento del Objetivo"
            }
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#f0fdfa",
                border: "1px solid #99f6e4",
                borderTop: "3px solid #0d8383",
                borderRadius: "10px",
                padding: "0.85rem",
                textAlign: "center"
              }}
            >
              <div style={{ fontWeight: 700, color: "#0d8383", fontSize: "0.9rem", marginBottom: "0.3rem" }}>
                {item.step}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569" }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: "#f0f9ff",
            borderLeft: "4px solid #63b5e5",
            padding: "0.85rem 1rem",
            borderRadius: "0 8px 8px 0",
            fontSize: "0.9rem",
            color: "#1b365d"
          }}
        >
          <strong>🔒 Alcance y Permisos por Sector:</strong> Cada responsable o referente visualiza en la plataforma únicamente la dotación, los perfiles de puesto, los temas y las capacitaciones pertenecientes a su propio sector o gerencia. Las áreas de <strong>RRHH</strong> y <strong>SGI</strong> cuentan con visualización integral de todos los sectores para acompañamiento y auditoría.
        </div>
      </div>

      {/* 2. EVALUACIÓN INICIAL, CAMBIO DE PUESTO Y TRANSFERENCIAS */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          lineHeight: 1.65,
          borderLeft: "5px solid #63b5e5"
        }}
      >
        <h2 style={{ color: "#1b365d", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.3rem" }}>
          2. Evaluación Inicial y Transferencias: ¿Qué llega, cómo llega y qué se debe hacer?
        </h2>
        <p style={{ color: "#334155", marginBottom: "0.9rem" }}>
          Cuando un colaborador cambia de puesto o es transferido a un nuevo sector, <strong>Recursos Humanos (RRHH)</strong> realiza en el sistema su <strong>Evaluación Inicial</strong> comparando las capacitaciones que la persona ya posee contra los requisitos exigidos por su <strong>nuevo Perfil de Puesto</strong>.
        </p>

        <h3 style={{ fontSize: "1.05rem", color: "#0d8383", marginBottom: "0.5rem" }}>
          📬 ¿Qué le llega al responsable del sector y cómo le llega?
        </h3>
        <p style={{ color: "#334155", marginBottom: "0.75rem" }}>
          Al confirmarse la Evaluación Inicial, el responsable del sector receptor recibe automáticamente:
        </p>
        <ol style={{ margin: "0 0 1.1rem 0", paddingLeft: "1.35rem", color: "#334155", fontSize: "0.93rem" }}>
          <li style={{ marginBottom: "0.45rem" }}>
            <strong>Un Correo Electrónico de notificación</strong> con el asunto <em>&ldquo;Comunicación de Cambio de Puesto: [Nombre y Apellido] (Legajo)&rdquo;</em>, indicando el nuevo puesto asignado, el sector destino y el detalle de las <strong>brechas detectadas</strong> (es decir, las capacitaciones que le faltan realizar para cumplir con el nuevo perfil).
          </li>
          <li>
            <strong>Una solicitud en la pestaña &ldquo;⇄ Transferencias&rdquo; dentro de la aplicación:</strong> Allí aparecerá el colaborador en el listado de <em>Transferencias Pendientes de Aprobación</em> con el botón <strong>Revisar y Confirmar</strong>.
          </li>
        </ol>

        <h3 style={{ fontSize: "1.05rem", color: "#0d8383", marginBottom: "0.5rem" }}>
          🛠️ ¿Qué debe hacer el sector cuando recibe esta notificación?
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            marginBottom: "1.15rem"
          }}
        >
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderTop: "4px solid #0d8383",
              borderRadius: "10px",
              padding: "1rem 1.15rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <strong style={{ color: "#1b365d", display: "block", marginBottom: "0.4rem" }}>
              Caso 1: Empleado CON Brechas de Capacitación
            </strong>
            <ol style={{ margin: 0, paddingLeft: "1.15rem", fontSize: "0.89rem", color: "#334155" }}>
              <li style={{ marginBottom: "0.3rem" }}>
                Ingresar a la solapa <strong>⇄ Transferencias</strong> y hacer clic en <strong>Revisar y Confirmar</strong>.
              </li>
              <li style={{ marginBottom: "0.3rem" }}>
                El sistema mostrará todas las <strong>Capacitaciones Faltantes (Brechas)</strong> detectadas en la evaluación inicial.
              </li>
              <li style={{ marginBottom: "0.3rem" }}>
                <strong>Programar obligatoriamente una fecha para cada capacitación faltante</strong> (el sistema exige que la fecha programada no supere los <strong>90 días / 3 meses</strong>).
              </li>
              <li>
                Hacer clic en <strong>&ldquo;Confirmar Pase y Fechas&rdquo;</strong>. Automáticamente el empleado se incorpora al sector y todas esas capacitaciones quedan agendadas en el <strong>📅 Plan Anual</strong> en estado <strong>Programado</strong>.
              </li>
            </ol>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderTop: "4px solid #10b981",
              borderRadius: "10px",
              padding: "1rem 1.15rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <strong style={{ color: "#1b365d", display: "block", marginBottom: "0.4rem" }}>
              Caso 2: Empleado SIN Brechas (100% Apto)
            </strong>
            <p style={{ margin: 0, fontSize: "0.89rem", color: "#334155" }}>
              Si en la Evaluación Inicial la persona ya cuenta con todas las capacitaciones exigidas por el nuevo puesto, el correo informará que <strong>no presenta brechas</strong>. El responsable solo debe ingresar a <strong>⇄ Transferencias → Revisar y Confirmar</strong> y aceptar el pase, quedando la persona inmediatamente <strong>liberada al puesto</strong>.
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderLeft: "5px solid #ef4444",
            padding: "0.95rem 1.15rem",
            borderRadius: "8px",
            fontSize: "0.92rem",
            color: "#991b1b"
          }}
        >
          <strong>⏱️ Plazo máximo de 90 días (3 meses) para liberar a la persona al puesto:</strong>
          <div style={{ marginTop: "0.3rem", color: "#7f1d1d" }}>
            Desde que se aprueba la Evaluación Inicial, el sector cuenta con un <strong>tiempo máximo de 90 días corridos</strong> para dictar las capacitaciones programadas, registrar su realización con sus firmas y completar su correspondiente <strong>Evaluación de Eficacia</strong>. Una vez cumplidas y evaluadas como eficaces todas las brechas iniciales, el colaborador queda formalmente <strong>liberado al nuevo puesto de trabajo</strong>.
          </div>
        </div>
      </div>

      {/* 3. CÓMO PLANIFICAR EN EL PLAN ANUAL */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          lineHeight: 1.65,
          borderLeft: "5px solid #0d8383"
        }}
      >
        <h2 style={{ color: "#1b365d", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.3rem" }}>
          3. ¿Cómo planificar capacitaciones por Sector, por Puesto y por Persona?
        </h2>
        <p style={{ color: "#334155", marginBottom: "1rem" }}>
          Además de las capacitaciones que surgen de una Evaluación Inicial, en la solapa <strong>📅 Plan Anual</strong> podés planificar en cualquier momento nuevas capacitaciones desde el panel <strong>&ldquo;Programar Capacitación / Agregar al Plan&rdquo;</strong> eligiendo entre <strong>tres modalidades</strong>:
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
            marginBottom: "1.25rem"
          }}
        >
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "1rem", backgroundColor: "#fff" }}>
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem", color: "#0d8383" }}>🏢 1. Planificar por Sector</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#475569" }}>
              Elegí la opción <strong>Sector</strong> cuando quieras programar una capacitación general para toda un área o gerencia. El sistema se la asignará automáticamente a todas las personas activas de ese sector.
            </p>
          </div>

          <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "1rem", backgroundColor: "#fff" }}>
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem", color: "#0d8383" }}>💼 2. Planificar por Puesto</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#475569" }}>
              Elegí la opción <strong>Puesto</strong> cuando la capacitación esté dirigida a una función específica (por ejemplo: <em>Peajista</em>, <em>Supervisor</em>, <em>Operador</em>). Se asignará a todos los colaboradores que tengan ese perfil.
            </p>
          </div>

          <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", padding: "1rem", backgroundColor: "#fff" }}>
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1rem", color: "#0d8383" }}>👤 3. Planificar por Persona</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#475569" }}>
              Elegí la opción <strong>Empleado</strong> cuando necesites programar la capacitación para una persona en particular. Podés filtrar por sector y buscarla por <strong>Nombre o Legajo</strong>.
            </p>
          </div>
        </div>

        <h3 style={{ fontSize: "1.05rem", color: "#1b365d", marginBottom: "0.5rem" }}>
          Datos que debés completar al programar:
        </h3>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#334155", fontSize: "0.93rem" }}>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>Tema de Capacitación:</strong> Seleccioná el tema del listado desplegable de tu sector.
          </li>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>Objetivo de la Capacitación (Fundamental):</strong> Escribí claramente <em>qué buscás lograr con esta capacitación</em> (por ejemplo: que la persona conozca la norma, que lleve adelante su tarea a través de la Política del Sistema de Gestión Integrado o que aplique un procedimiento específico relacionado con su trabajo).
          </li>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>Fecha Programada:</strong> Indicá la fecha prevista de dictado para que quede registrada en estado <strong>Programado (En Plan)</strong>.
          </li>
          <li>
            <strong>Material de Capacitación (Opcional):</strong> Podés adjuntar la presentación, instructivo o manual utilizado.
          </li>
        </ul>
      </div>

      {/* 4. CARGA DE LA CAPACITACIÓN REALIZADA Y LAS 3 FORMAS DE FIRMA */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          lineHeight: 1.65,
          borderLeft: "5px solid #63b5e5"
        }}
      >
        <h2 style={{ color: "#1b365d", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.3rem" }}>
          4. Carga de la Capacitación Realizada, Fecha, Nota y Modalidades de Registro de Firmas
        </h2>
        <p style={{ color: "#334155", marginBottom: "1rem" }}>
          Una vez que la capacitación se llevó adelante, desde la gestión del <strong>📅 Plan Anual</strong> se debe registrar su cierre colocando la <strong>Fecha de realización</strong>, la <strong>Nota / Calificación (de 0 a 10)</strong> y el <strong>Nombre del Instructor</strong>. Para dejar asentado el registro de firmas y cambiar el estado de <strong>Programado</strong> a <strong>Realizado</strong>, el sistema ofrece las siguientes modalidades:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.15rem" }}>
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderLeft: "4px solid #0d8383",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "#1b365d" }}>
              📎 Modalidad 1: Adjuntar un Documento en la Solapa de Registro de Firma / Evidencia
            </h3>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155" }}>
              Cuando la capacitación cuenta con una planilla de asistencia firmada en papel o un examen físico, se ingresa a la solapa de carga documental de la capacitación, se completa la <strong>Fecha</strong> y la <strong>Nota</strong>, y se <strong>adjunta el documento escaneado o foto (PDF/imagen)</strong> correspondiente al registro de firma de la capacitación realizada. Al guardar, el estado pasa a <strong>Realizado</strong>.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderLeft: "4px solid #0d8383",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "#1b365d" }}>
              ✍️ Modalidad 2: Con la Aplicación Abierta en Celular o Computadora (Firma en el Momento)
            </h3>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155" }}>
              Cuando el instructor y la persona capacitada se encuentran presentes con la aplicación abierta —ya sea desde un <strong>celular, tablet o computadora</strong>—, se ingresa a la opción de firma en pantalla, se coloca la <strong>Fecha</strong> y la <strong>Nota</strong>, y <strong>firman directamente en la pantalla tanto el Instructor como la Persona capacitada</strong>. Al confirmar, ambas firmas digitales quedan estampadas y pasa a <strong>Realizado</strong>.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderLeft: "4px solid #0d8383",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              backgroundColor: "#f8fafc"
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "#1b365d" }}>
              📲 Modalidad 3: A través de un Enlace (Link) por Mail o WhatsApp al Instructor y al Capacitado
            </h3>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155" }}>
              Cuando la carga se gestiona a distancia, desde la fila de la capacitación se genera el <strong>enlace único (link)</strong> y se envía por <strong>Correo Electrónico o WhatsApp</strong> tanto al <strong>Instructor</strong> como a la <strong>Persona que realizó la capacitación</strong>. Cada uno abre el enlace desde su dispositivo, registra su firma digital y el estado cambia automáticamente de <strong>Programado</strong> a <strong>Realizado</strong>.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #cbd5e1",
              borderLeft: "4px solid #1b365d",
              borderRadius: "10px",
              padding: "1.1rem 1.25rem",
              backgroundColor: "#f0f9ff"
            }}
          >
            <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", color: "#1b365d" }}>
              📝 Modalidad 4: Formulario Online de la Aplicación o Carga de Excel de Microsoft Forms
            </h3>
            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.92rem", color: "#334155" }}>
              Para evaluaciones múltiples o masivas, también se puede registrar la capacitación y las firmas digitales de dos maneras automatizadas:
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.9rem", color: "#334155" }}>
              <li style={{ marginBottom: "0.35rem" }}>
                <strong>Formulario Online propio de la Aplicación (solapa 📝 Formularios Online):</strong> Cada sector puede generar un cuestionario online vinculado al tema de capacitación y compartir su link por Mail o WhatsApp. Al abrirlo, el participante ve únicamente el formulario limpio (sin menú lateral ni acceso al resto del sistema), selecciona su <strong>Apellido y Nombre / Legajo</strong> de la lista, responde las preguntas y presta conformidad, quedando registrada en el acto su <strong>Nota</strong>, la <strong>Firma del Participante</strong> y la <strong>Firma del Instructor</strong>.
              </li>
              <li>
                <strong>Carga / Actualización de Excel de Microsoft Forms (en 📅 Plan Anual):</strong> Todos los sectores pueden descargar el Excel de respuestas de Microsoft Forms y subirlo en el botón <em>&ldquo;Subir / Actualizar Excel de Forms&rdquo;</em>. El sistema genera la firma digital del capacitado y del instructor con esos datos y pasa las capacitaciones a <strong>Realizado</strong> (pudiendo volver a subir el mismo Excel con nuevas cargas sin que se dupliquen las anteriores).
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fde68a",
            borderLeft: "5px solid #f59e0b",
            padding: "0.95rem 1.15rem",
            borderRadius: "8px",
            fontSize: "0.91rem",
            color: "#92400e"
          }}
        >
          <strong>⚠️ Importante para la detección automática (Nombre del Tema y de la Persona):</strong>
          <div style={{ marginTop: "0.3rem", color: "#78350f" }}>
            Tanto al crear un formulario como al subir un Excel de Microsoft Forms, es fundamental que el <strong>nombre del Tema a Capacitar</strong> (en el título del formulario o selector) y el <strong>Apellido y Nombre / Legajo de la persona</strong> estén escritos <strong>igual a como figuran en la aplicación</strong> (en <em>Temas a Capacitar</em> y en <em>Personal / Legajos</em>). De esa manera, el sistema identifica automáticamente la capacitación programada y a la persona, estampando las firmas y cerrándola sin errores.
          </div>
        </div>
      </div>

      {/* 5. EVALUACIÓN DE LA EFICACIA */}
      <div
        className="card"
        style={{
          lineHeight: 1.65,
          borderLeft: "5px solid #0d8383"
        }}
      >
        <h2 style={{ color: "#1b365d", marginTop: 0, marginBottom: "0.75rem", fontSize: "1.3rem" }}>
          5. Evaluación de la Eficacia: Relación directa con el Objetivo de la Capacitación
        </h2>
        <p style={{ color: "#334155", marginBottom: "0.75rem" }}>
          Una vez que la capacitación fue realizada y registrada con sus firmas, se evalúa siempre su <strong>Eficacia</strong> contando con el tiempo de seguimiento correspondiente (hasta <strong>2 meses / 60 días</strong> desde la realización) para observar el desempeño de la persona en su puesto.
        </p>

        <h3 style={{ fontSize: "1.05rem", color: "#0d8383", marginBottom: "0.5rem" }}>
          🎯 ¿Cómo se relaciona el Objetivo con la Evaluación de Eficacia?
        </h3>
        <p style={{ color: "#334155", marginBottom: "0.75rem" }}>
          En la evaluación de la eficacia lo que se debe hacer es verificar, respecto al <strong>Objetivo de la capacitación</strong>, si la persona <strong>cumple o no con esos objetivos</strong> de la capacitación que se realizó:
        </p>
        <ul style={{ margin: "0 0 1.1rem 0", paddingLeft: "1.25rem", color: "#334155", fontSize: "0.93rem" }}>
          <li style={{ marginBottom: "0.45rem" }}>
            <strong>1. ¿Qué significa poner el Objetivo?</strong> Cuando definís el objetivo de la capacitación, debés indicar <em>qué buscás con esa capacitación</em>: por ejemplo, que la persona tenga conocimiento de la norma, que la persona lleve adelante su tarea a través de la Política del Sistema de Gestión Integrado, o particularmente lo que se relaciona con su trabajo diario.
          </li>
          <li style={{ marginBottom: "0.45rem" }}>
            <strong>2. ¿Qué se verifica al evaluar la Eficacia?</strong> Se evalúa si la persona efectivamente lo lleva adelante o no en su puesto de trabajo, manteniendo siempre relación directa entre la eficacia y aquel objetivo planteado.
          </li>
          <li>
            <strong>3. ¿Cómo se completa el registro?</strong> Si la persona lo lleva adelante, debés escribir una <strong>breve descripción</strong> indicando si la persona tiene los conocimientos o lleva adelante el trabajo como lo debe llevar, y allí marcar que la capacitación fue <strong>✅ Eficaz</strong> (o <strong>❌ No Eficaz</strong> en caso de que no alcance el objetivo y requiera volver a capacitarse).
          </li>
        </ul>

        <div
          style={{
            backgroundColor: "#f0fdfa",
            border: "1px solid #99f6e4",
            borderLeft: "5px solid #0d8383",
            padding: "1rem 1.2rem",
            borderRadius: "8px",
            fontSize: "0.92rem",
            color: "#134e4a"
          }}
        >
          <strong>💡 Ejemplo práctico de relación Objetivo ↔ Eficacia:</strong>
          <div style={{ marginTop: "0.4rem" }}>
            • <strong>Objetivo cargado:</strong> <em>&ldquo;Que la persona adquiera conocimiento de la norma y lleve adelante sus tareas operativas aplicando la Política del Sistema de Gestión Integrado en su puesto de trabajo.&rdquo;</em>
          </div>
          <div style={{ marginTop: "0.3rem" }}>
            • <strong>Evaluación de Eficacia (Breve descripción):</strong> <em>&ldquo;Se verifica que el colaborador posee los conocimientos sobre la norma y lleva adelante su trabajo diario como corresponde, cumpliendo con el procedimiento operativo y la política de gestión integrada.&rdquo;</em> → Calificación: <strong>EFICAZ</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

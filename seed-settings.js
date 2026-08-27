const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultTemplate = `<p>Hola, RRHH ha propuesto a <strong>{{nombre}}</strong> para el puesto de <strong>{{puesto}}</strong> en su sector.</p>
<p>Para que este cambio se haga efectivo, usted <strong>DEBE ingresar al sistema (sección Transferencias) y CONFIRMAR la recepción</strong>.</p>
<p>Al momento de confirmar, será obligatorio que programe las fechas para las siguientes capacitaciones faltantes.</p>
<p style="color: red; font-weight: bold;">IMPORTANTE: Cuenta con un plazo de 90 días como máximo para programar y completar estas capacitaciones, de manera que se cumpla con la evaluación inicial obligatoria.</p>
<h3>Detalles:</h3>
<ul>
  <li><strong>Empleado:</strong> {{nombre}} (Legajo: {{legajo}})</li>
  <li><strong>Nuevo Puesto:</strong> {{puesto}}</li>
</ul>
<h3>Capacitaciones a Planificar:</h3>
<ul>
  {{brechas}}
</ul>
<p>Por favor, ingrese al sistema para confirmar el cambio.</p>`;

async function main() {
  await prisma.appSetting.upsert({
    where: { id: 'email_template_transferencia' },
    update: {},
    create: {
      id: 'email_template_transferencia',
      value: defaultTemplate,
      description: 'Plantilla del correo enviado al proponer una transferencia/cambio de puesto.'
    }
  });
  console.log("Seed done.");
}
main().finally(() => prisma.$disconnect());

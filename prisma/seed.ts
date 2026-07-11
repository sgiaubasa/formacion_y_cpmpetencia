import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const sectors = [
    { id: 1, name: 'Compras', password: '1111', role: 'GCO', mail: null },
    { id: 2, name: 'Recursos Humanos', password: '2222', role: 'RRHH', mail: 'diego.gomez@aubasa.com.ar' },
    { id: 3, name: 'Sistemas', password: '3333', role: 'GS', mail: 'ariel.perez@aubasa.com.ar' },
    { id: 4, name: 'Operaciones', password: '4444', role: 'GO', mail: 'horacio.sanmartin@aubasa.com.ar' },
    { id: 5, name: 'Comercial', password: '5555', role: 'GC', mail: 'sgcysv.gc@aubasa.com.ar' },
    { id: 6, name: 'Centro de Monitoreo', password: '6666', role: 'CCM', mail: 'fabian.aguirre@aubasa.com.ar' },
    { id: 7, name: 'Asistencia Vial', password: '7777', role: 'AV', mail: 'administrativo.av@aubasa.com.ar' },
    { id: 8, name: 'Seguridad Patrimonial', password: '8888', role: 'SP', mail: null },
    { id: 9, name: 'Legales', password: '9999', role: 'GAL', mail: null },
    { id: 10, name: 'RRII', password: '1010', role: 'RRI', mail: null },
    { id: 11, name: 'Taller Mecanico', password: '2020', role: 'TM', mail: 'nahuel.cucharello@aubasa.com.ar' },
    { id: 12, name: 'Mantenimiento', password: '3030', role: 'GM', mail: null },
    { id: 13, name: 'SGI', password: '4040', role: 'GAU', mail: 'cesar.lachaise@aubasa.com.ar' },
    { id: 14, name: 'SVIA Operaciones', password: '5050', role: 'SVO', mail: 'Elizabeth.Wallace@aubasa.com.ar' }
  ]

  for (const sector of sectors) {
    await prisma.sector.upsert({
      where: { id: sector.id },
      update: sector,
      create: sector,
    })
  }
  
  console.log('Seeded database with historical sectors data from Google Sheets.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

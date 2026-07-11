import { prisma } from './src/lib/prisma';
async function run() {
  const s = await prisma.sector.findMany({select:{id:true, name:true, role:true}});
  console.log('SECTORES:', s);
  
  const p = await prisma.jobProfile.findMany({select:{id:true, title:true, gerencia:true}, where:{isActive:true}});
  console.log('PERFILES_TOTAL:', p.length);
  
  // See what unique gerencias we have
  const uniqueGerencias = [...new Set(p.map(x => x.gerencia))];
  console.log('GERENCIAS EN PERFILES:', uniqueGerencias);
}
run();

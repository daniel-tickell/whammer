const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const minis = await prisma.miniature.findMany();
  console.log(`Migrating ${minis.length} records...`);
  
  for (const mini of minis) {
    // If all granular fields are 0, it means it hasn't been migrated yet
    if (mini.unassembled === 0 && mini.assembled === 0 && mini.primed === 0 && mini.painted === 0 && mini.finished === 0) {
      await prisma.miniature.update({
        where: { id: mini.id },
        data: {
          unassembled: mini.qty
        }
      });
    }
  }
  
  console.log('Migration complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

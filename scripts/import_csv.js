const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(__dirname, '..', 'Warhammer 40,000 Unit Inventory Spreadsheet V3 - Warhammer 40,000 Unit Inventory Spreadsheet V3.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const factions = new Set();
  const items = [];
  
  for (const line of dataLines) {
    // Handle possible commas in quotes if necessary, but simple split for now
    const parts = line.split(',');
    if (parts.length < 3) continue;
    
    const faction = parts[0].trim();
    const unitName = parts[1].trim();
    const quantity = parseInt(parts[2].trim()) || 1;
    
    if (!faction || !unitName) continue;
    
    factions.add(faction);
    items.push({
      faction,
      unitName,
      quantity
    });
  }
  
  console.log(`Found ${factions.size} factions and ${items.length} units.`);
  
  // Create a top-level category for all imported data
  const mainCategory = await prisma.category.upsert({
    where: { name: 'My Armies' },
    update: {},
    create: { name: 'My Armies' }
  });

  for (const factionName of factions) {
    console.log(`Importing ${factionName}...`);
    
    // Create Collection for each faction
    const collection = await prisma.collection.upsert({
      where: { name: factionName },
      update: {},
      create: { 
        name: factionName,
        categoryId: mainCategory.id
      }
    });
    
    // Add miniatures
    const factionItems = items.filter(i => i.faction === factionName);
    for (const item of factionItems) {
      await prisma.miniature.create({
        data: {
          kitName: item.unitName,
          qty: item.quantity,
          unassembled: item.quantity,
          collectionId: collection.id,
          state: 'Unassembled'
        }
      });
    }
  }
  
  console.log('Import complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

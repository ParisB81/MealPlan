import axios from 'axios';

async function main() {
  // Test: Recipe with sourceUrl but no source site tag
  const recipe = {
    title: 'Chicken Souvlaki',
    description: 'Classic Greek chicken souvlaki on skewers',
    servings: 4,
    prepTime: 20,
    cookTime: 15,
    sourceUrl: 'https://akispetretzikis.com/recipe/chicken-souvlaki',
    instructions: ['Marinate chicken', 'Thread onto skewers', 'Grill until done'],
    tags: ['Greek'],
    ingredients: [
      { name: 'chicken breast', quantity: 500, unit: 'g', notes: '' },
      { name: 'olive oil', quantity: 3, unit: 'tbsp', notes: '' },
      { name: 'lemon', quantity: 1, unit: 'piece', notes: '' },
      { name: 'oregano', quantity: 1, unit: 'tsp', notes: '' },
    ],
  };

  console.log('=== Test: sourceUrl auto-tagging ===');
  console.log('Input tags:', recipe.tags);
  console.log('Source URL:', recipe.sourceUrl);

  await new Promise(r => setTimeout(r, 4000)); // wait for server

  const { data } = await axios.post('http://localhost:3000/api/recipes', recipe);
  const created = data.data;
  console.log('\nOutput tags:', created.tags);

  // Check source tag was added
  const hasSourceTag = created.tags.includes('Akis Petretzikis');
  console.log('Has "Akis Petretzikis" tag:', hasSourceTag);

  // Cleanup
  await axios.delete(`http://localhost:3000/api/recipes/${created.id}`);
  await axios.delete(`http://localhost:3000/api/recipes/${created.id}/permanent`);
  console.log('Cleaned up.\n');

  // Test 2: Recipe that already has source tag — should not duplicate
  const recipe2 = {
    title: 'Pastitsio',
    description: 'Greek baked pasta',
    servings: 8,
    prepTime: 30,
    cookTime: 60,
    sourceUrl: 'https://akispetretzikis.com/recipe/pastitsio',
    instructions: ['Cook pasta', 'Make meat sauce', 'Layer and bake'],
    tags: ['Akis Petretzikis', 'Greek'],
    ingredients: [
      { name: 'ground beef', quantity: 500, unit: 'g', notes: '' },
      { name: 'pasta', quantity: 500, unit: 'g', notes: '' },
    ],
  };

  console.log('=== Test 2: Source tag already present ===');
  console.log('Input tags:', recipe2.tags);

  const { data: data2 } = await axios.post('http://localhost:3000/api/recipes', recipe2);
  const akisCount = data2.data.tags.filter((t: string) => t === 'Akis Petretzikis').length;
  console.log('Output tags:', data2.data.tags);
  console.log('"Akis Petretzikis" count:', akisCount, akisCount === 1 ? '(no duplicate)' : '(DUPLICATE!)');

  await axios.delete(`http://localhost:3000/api/recipes/${data2.data.id}`);
  await axios.delete(`http://localhost:3000/api/recipes/${data2.data.id}/permanent`);
  console.log('Cleaned up.');
}

main().catch(console.error);

import axios from 'axios';

async function main() {
  // Test 2: Greek lentil soup
  const recipe = {
    title: 'Fakes - Greek Lentil Soup',
    description: 'Traditional Greek lentil soup, a hearty and nutritious dish',
    servings: 6,
    prepTime: 10,
    cookTime: 50,
    instructions: ['Sauté onions', 'Add lentils and water', 'Simmer until tender'],
    tags: ['Greek', 'Vegan'],
    ingredients: [
      { name: 'brown lentils', quantity: 400, unit: 'g', notes: '' },
      { name: 'onion', quantity: 1, unit: 'piece', notes: '' },
      { name: 'carrot', quantity: 2, unit: 'piece', notes: '' },
      { name: 'tomato paste', quantity: 2, unit: 'tbsp', notes: '' },
      { name: 'olive oil', quantity: 3, unit: 'tbsp', notes: '' },
      { name: 'bay leaf', quantity: 2, unit: 'piece', notes: '' },
    ],
  };

  console.log('=== Test 2: Greek Lentil Soup ===');
  console.log('Input tags:', recipe.tags);

  const { data } = await axios.post('http://localhost:3000/api/recipes', recipe);
  const created = data.data;
  console.log('Output tags:', created.tags);

  await axios.delete(`http://localhost:3000/api/recipes/${created.id}`);
  await axios.delete(`http://localhost:3000/api/recipes/${created.id}/permanent`);
  console.log('Cleaned up.\n');

  // Test 3: Already fully tagged recipe (should add nothing)
  const recipe3 = {
    title: 'Simple Pasta',
    description: 'Quick pasta dish',
    servings: 2,
    prepTime: 5,
    cookTime: 10,
    instructions: ['Boil pasta', 'Add sauce'],
    tags: ['Main Dishes', 'Pasta', 'Under 15 minutes', 'Italian', 'Leftovers-friendly', 'Boiled'],
    ingredients: [
      { name: 'spaghetti', quantity: 200, unit: 'g', notes: '' },
      { name: 'tomato sauce', quantity: 200, unit: 'ml', notes: '' },
    ],
  };

  console.log('=== Test 3: Fully tagged recipe ===');
  console.log('Input tags:', recipe3.tags);

  const { data: data3 } = await axios.post('http://localhost:3000/api/recipes', recipe3);
  console.log('Output tags:', data3.data.tags);
  console.log('Tags added:', data3.data.tags.length - recipe3.tags.length);

  await axios.delete(`http://localhost:3000/api/recipes/${data3.data.id}`);
  await axios.delete(`http://localhost:3000/api/recipes/${data3.data.id}/permanent`);
  console.log('Cleaned up.');
}

main().catch(console.error);

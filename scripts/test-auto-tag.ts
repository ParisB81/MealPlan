import axios from 'axios';

async function main() {
  const recipe = {
    title: 'Test Grilled Chicken Salad',
    description: 'A fresh and healthy grilled chicken salad with Mediterranean flavors',
    servings: 2,
    prepTime: 10,
    cookTime: 15,
    instructions: ['Grill the chicken', 'Toss with vegetables', 'Serve with dressing'],
    tags: ['Easy'],
    ingredients: [
      { name: 'chicken breast', quantity: 2, unit: 'piece', notes: '' },
      { name: 'lettuce', quantity: 1, unit: 'head', notes: '' },
      { name: 'tomato', quantity: 2, unit: 'piece', notes: '' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp', notes: '' },
      { name: 'feta cheese', quantity: 100, unit: 'g', notes: '' },
    ],
  };

  console.log('=== Creating recipe with only "Easy" tag ===');
  console.log('Input tags:', recipe.tags);
  console.log();

  const { data } = await axios.post('http://localhost:3000/api/recipes', recipe);
  const created = data.data;

  console.log('=== Result ===');
  console.log('Title:', created.title);
  console.log('Tags:', created.tags);
  console.log();

  // Now delete the test recipe
  await axios.delete(`http://localhost:3000/api/recipes/${created.id}`);
  await axios.delete(`http://localhost:3000/api/recipes/${created.id}/permanent`);
  console.log('Test recipe cleaned up.');
}

main().catch(console.error);

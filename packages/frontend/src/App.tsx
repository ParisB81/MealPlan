import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import RecipesPage from './pages/RecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import RecipeFormPage from './pages/RecipeFormPage';
import MealPlansPage from './pages/MealPlansPage';
import MealPlanDetailPage from './pages/MealPlanDetailPage';
import IngredientsPage from './pages/IngredientsPage';
import ShoppingListsPage from './pages/ShoppingListsPage';
import ShoppingListPage from './pages/ShoppingListPage';
import UrlImportPage from './pages/UrlImportPage';
import CookingPlansPage from './pages/CookingPlansPage';
import CookingPlanPage from './pages/CookingPlanPage';
import DeveloperPage from './pages/DeveloperPage';
import AssetsLibraryPage from './pages/AssetsLibraryPage';
import TagManagerPage from './pages/TagManagerPage';
import IngredientRefinementPage from './pages/IngredientRefinementPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/recipes/new" element={<RecipeFormPage />} />
          <Route path="/recipes/import-urls" element={<UrlImportPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recipes/:id/edit" element={<RecipeFormPage />} />
          <Route path="/meal-plans" element={<MealPlansPage />} />
          <Route path="/meal-plans/:id" element={<MealPlanDetailPage />} />
          <Route path="/ingredients" element={<IngredientsPage />} />
          <Route path="/shopping-lists" element={<ShoppingListsPage />} />
          <Route path="/shopping-lists/:id" element={<ShoppingListPage />} />
          <Route path="/meal-plans/:mealPlanId/shopping" element={<ShoppingListPage />} />
          <Route path="/cooking-plans" element={<CookingPlansPage />} />
          <Route path="/cooking-plan/new" element={<CookingPlanPage />} />
          <Route path="/cooking-plans/:id" element={<CookingPlanPage />} />
          <Route path="/developer" element={<DeveloperPage />} />
          <Route path="/developer/assets" element={<AssetsLibraryPage />} />
          <Route path="/developer/tags" element={<TagManagerPage />} />
          <Route path="/developer/ingredients" element={<IngredientRefinementPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

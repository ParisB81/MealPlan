import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Navigation from './components/Navigation';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './pages/LoginPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
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
import AIMealPlanWizardPage from './pages/AIMealPlanWizardPage';
import AIRecipeGeneratorPage from './pages/AIRecipeGeneratorPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import PreferencesPage from './pages/PreferencesPage';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="text-text-muted text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <ScrollToTop />
      <Navigation />
      <Toaster position="bottom-center" toastOptions={{ className: 'mb-safe' }} />
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
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:id" element={<CollectionDetailPage />} />
        <Route path="/cooking-plans" element={<CookingPlansPage />} />
        <Route path="/cooking-plan/new" element={<CookingPlanPage />} />
        <Route path="/cooking-plans/:id" element={<CookingPlanPage />} />
        <Route path="/ai-meal-plan" element={<AIMealPlanWizardPage />} />
        <Route path="/recipes/ai-generate" element={<AIRecipeGeneratorPage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route path="/developer/assets" element={<AssetsLibraryPage />} />
        <Route path="/developer/tags" element={<TagManagerPage />} />
        <Route path="/developer/ingredients" element={<IngredientRefinementPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

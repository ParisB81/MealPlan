import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  if (isHome) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-gray-700 hover:text-blue-600 font-medium flex items-center gap-2"
          >
            <span className="text-xl">🏠</span>
            Home
          </Link>
          <Link
            to="/meal-plans"
            className={`text-gray-700 hover:text-blue-600 font-medium ${
              location.pathname.startsWith('/meal-plans') ? 'text-blue-600' : ''
            }`}
          >
            Meal Plans
          </Link>
          <Link
            to="/shopping-lists"
            className={`text-gray-700 hover:text-blue-600 font-medium ${
              location.pathname.startsWith('/shopping-lists') ? 'text-blue-600' : ''
            }`}
          >
            Shopping Lists
          </Link>
          <Link
            to="/recipes"
            className={`text-gray-700 hover:text-blue-600 font-medium ${
              location.pathname.startsWith('/recipes') ? 'text-blue-600' : ''
            }`}
          >
            Recipes
          </Link>
          <Link
            to="/ingredients"
            className={`text-gray-700 hover:text-blue-600 font-medium ${
              location.pathname.startsWith('/ingredients') ? 'text-blue-600' : ''
            }`}
          >
            Ingredients
          </Link>
          <Link
            to="/cooking-plans"
            className={`text-gray-700 hover:text-blue-600 font-medium ${
              location.pathname.startsWith('/cooking-plan') ? 'text-blue-600' : ''
            }`}
          >
            Cooking Plans
          </Link>
          <Link
            to="/developer"
            className={`text-gray-700 hover:text-blue-600 font-medium ${
              location.pathname.startsWith('/developer') ? 'text-blue-600' : ''
            }`}
          >
            Developer
          </Link>
        </div>
      </div>
    </nav>
  );
}

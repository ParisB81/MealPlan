import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Developer Tools</h1>
          <p className="text-lg text-gray-600">
            Inspect and review site design features, components, and patterns.
          </p>
        </header>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Link to="/developer/assets">
            <Card hoverable className="h-full">
              <div className="text-4xl mb-3">🎨</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Assets Library</h2>
              <p className="text-gray-600">
                Browse all UI components — buttons, cards, inputs, modals, badges, alerts, and more — with every variant, size, and state rendered live.
              </p>
            </Card>
          </Link>

          <Link to="/developer/tags">
            <Card hoverable className="h-full">
              <div className="text-4xl mb-3">🏷️</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tag Manager</h2>
              <p className="text-gray-600">
                Drag and drop predefined tags onto recipes. Browse tags by category and filter recipes by existing tags.
              </p>
            </Card>
          </Link>

          <Link to="/developer/ingredients">
            <Card hoverable className="h-full">
              <div className="text-4xl mb-3">🧹</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ingredient Refinement</h2>
              <p className="text-gray-600">
                Documentation for cleaning up ingredient data — fixing units, merging duplicates, translating non-English names, and resolving vague ingredients.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

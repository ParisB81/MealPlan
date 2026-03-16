import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../components/ui';
import { usePreferences, useDeletePreference } from '../hooks/useMealPlanPreferences';
import type { MealPlanPreference } from '../types/mealPlanPreference';
import { Sparkles, Trash2, Edit, Plus, Copy } from 'lucide-react';
import { format } from 'date-fns';

export default function PreferencesPage() {
  const { data: preferences = [], isLoading } = usePreferences();
  const deletePref = useDeletePreference();
  const navigate = useNavigate();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete preference profile "${name}"?`)) return;
    deletePref.mutate(id);
  };

  const handleDuplicate = (pref: MealPlanPreference) => {
    navigate('/preferences/new', {
      state: {
        prefill: {
          name: `${pref.name} (copy)`,
          recipeSource: pref.recipeSource,
          sourceCollectionId: pref.sourceCollectionId,
          dietaryRestrictions: pref.dietaryRestrictions,
          cuisinePreferences: pref.cuisinePreferences,
          allergies: pref.allergies,
          ingredientLikes: pref.ingredientLikes,
          ingredientDislikes: pref.ingredientDislikes,
          weekdayMaxPrep: pref.weekdayMaxPrep,
          weekdayMaxCook: pref.weekdayMaxCook,
          weekendMaxPrep: pref.weekendMaxPrep,
          weekendMaxCook: pref.weekendMaxCook,
          caloriesMin: pref.caloriesMin,
          caloriesMax: pref.caloriesMax,
          proteinPercent: pref.proteinPercent,
          carbsPercent: pref.carbsPercent,
          fatPercent: pref.fatPercent,
          cookDaysPerWeek: pref.cookDaysPerWeek,
          cookingFreeDays: pref.cookingFreeDays,
          quickMealMaxMinutes: pref.quickMealMaxMinutes,
          defaultServings: pref.defaultServings,
          durationWeeks: pref.durationWeeks,
          durationDays: pref.durationDays,
          repeatWeekly: pref.repeatWeekly,
          mealVariety: pref.mealVariety,
          includedMeals: pref.includedMeals,
          preferredMethods: pref.preferredMethods,
        },
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-sec-prefs" />
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            Preference Profiles
          </h1>
        </div>
        <Link to="/preferences/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-1.5" />
            New Profile
          </Button>
        </Link>
      </div>

      {isLoading && (
        <p className="text-text-muted text-center py-8">Loading...</p>
      )}

      {!isLoading && preferences.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <Sparkles className="w-10 h-10 text-sec-prefs mx-auto mb-3 opacity-50" />
            <p className="text-text-secondary mb-3">No preference profiles yet</p>
            <Link to="/preferences/new">
              <Button variant="primary">
                Create your first preference profile
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {preferences.map(pref => (
          <Card key={pref.id} padding="sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary">{pref.name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant={pref.recipeSource === 'library_and_ai' ? 'purple' : pref.recipeSource === 'collection_only' ? 'orange' : 'blue'} size="sm">
                    {pref.recipeSource === 'library_and_ai' ? 'Library + AI' : pref.recipeSource === 'collection_only' ? 'Collection' : 'Library only'}
                  </Badge>
                  {pref.dietaryRestrictions.map((r: string) => (
                    <Badge key={r} variant="green" size="sm">{r}</Badge>
                  ))}
                  {pref.cuisinePreferences.slice(0, 3).map((c: string) => (
                    <Badge key={c} variant="purple" size="sm">{c}</Badge>
                  ))}
                  {pref.cuisinePreferences.length > 3 && (
                    <Badge variant="purple" size="sm">+{pref.cuisinePreferences.length - 3}</Badge>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Updated {format(new Date(pref.updatedAt), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicate(pref)}
                  title="Duplicate profile"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Link to={`/preferences/${pref.id}`}>
                  <Button variant="ghost" size="sm" title="Edit profile">
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(pref.id, pref.name)}
                  title="Delete profile"
                >
                  <Trash2 className="w-4 h-4 text-btn-danger" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

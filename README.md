# MealPlan - Meal Planning & Cooking Application

A full-stack web application for meal planning and cooking with recipe management, weekly meal planning, shopping list generation, and nutritional tracking.

## Technology Stack

### Backend
- **Express.js** - Node.js web framework
- **SQLite** - Lightweight relational database
- **Prisma** - Modern ORM with TypeScript support
- **TypeScript** - Type safety and better DX
- **Zod** - Runtime validation

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool
- **TanStack Query (React Query)** - Server state management
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Routing
- **Axios** - HTTP client

## Project Structure

```
MealPlan/
├── packages/
│   ├── backend/           # Express API server
│   │   ├── src/
│   │   └── prisma/
│   ├── frontend/          # React application
│   │   └── src/
│   └── shared/            # Shared types & utilities
│       └── src/
├── package.json           # Root workspace config
└── tsconfig.base.json     # Base TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm (tested with Node v24.12.0, npm v11.6.2)
- SQLite (no installation needed - database file created automatically)

### Installation

1. **Clone the repository** (or you're already here!)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the backend environment**
   ```bash
   cd packages/backend
   cp .env.example .env
   ```

   Edit `.env` and configure the SQLite database (default):
   ```
   DATABASE_URL="file:./dev.db"
   PORT=3000
   ```

4. **Create and migrate the database**
   ```bash
   npm run prisma:migrate
   ```

5. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

6. **(Optional) Seed the database with sample data**
   ```bash
   cd packages/backend
   npm run seed
   ```

### Development

Start both frontend and backend in development mode:

```bash
# From the root directory
npm run dev
```

Or start them individually:

```bash
# Backend only (runs on http://localhost:3000)
npm run dev:backend

# Frontend only (runs on http://localhost:5173)
npm run dev:frontend
```

### Database Management

```bash
# Run migrations
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Generate Prisma Client after schema changes
npm run prisma:generate
```

## Features

### Phase 0: Project Setup ✅
- [x] Monorepo structure with npm workspaces
- [x] TypeScript configuration
- [x] Express server with health check
- [x] React app with routing
- [x] Prisma schema with all models (9 models)
- [x] SQLite database setup

### Phase 1: Recipe Management ✅
- [x] Recipe CRUD operations (Create, Read, Update, Delete)
- [x] Recipe search and filtering
- [x] Ingredient management with quantity precision (2 decimal places)
- [x] Recipe cards and detail views
- [x] Recipe form with field-specific validation
- [x] "Start from existing recipe" feature - create recipe variations easily
- [x] Nutrition tracking integration

### Phase 2: Nutritional Information ✅
- [x] Add nutrition tracking to recipes
- [x] Per-serving calculations
- [x] Nutrition display components

### Phase 3: Weekly Meal Planning ✅
- [x] Create and manage meal plans
- [x] Week-based planning
- [x] Assign recipes to dates and meal types
- [x] Nutrition aggregation for meal plans
- [x] API endpoints for meal plan management

### Phase 4: Shopping List Generation (Next)
- [ ] Auto-generate from meal plans
- [ ] Ingredient aggregation
- [ ] Category grouping
- [ ] Check/uncheck items

### Phase 5: Polish & Enhancement
- [ ] Image upload for recipes
- [ ] Advanced search filters
- [ ] Drag-and-drop interface for meal planning
- [ ] Mobile responsive design improvements
- [ ] Recipe import from URLs

### Phase 6: Testing & Documentation
- [ ] Unit and integration tests
- [ ] E2E tests
- [ ] API documentation

## API Endpoints

### Health Check
- `GET /api/health` - Server and database health status

### Recipes
- `GET /api/recipes` - List all recipes (with search and pagination)
- `GET /api/recipes/:id` - Get a single recipe by ID
- `POST /api/recipes` - Create a new recipe
- `PUT /api/recipes/:id` - Update an existing recipe
- `DELETE /api/recipes/:id` - Delete a recipe

### Meal Plans
- `GET /api/meal-plans` - List all meal plans
- `GET /api/meal-plans/:id` - Get a single meal plan with all meals
- `POST /api/meal-plans` - Create a new meal plan
- `PUT /api/meal-plans/:id` - Update a meal plan
- `DELETE /api/meal-plans/:id` - Delete a meal plan
- `POST /api/meal-plans/:id/recipes` - Add a recipe to a meal plan
- `PUT /api/meal-plans/:id/recipes/:recipeId` - Update a meal in the plan
- `DELETE /api/meal-plans/:id/recipes/:recipeId` - Remove a recipe from the plan
- `GET /api/meal-plans/:id/nutrition` - Get nutrition summary for a meal plan

### Ingredients
- `GET /api/ingredients` - List all ingredients
- `GET /api/ingredients/:id` - Get a single ingredient by ID

### Shopping Lists (Coming Soon)
- Shopping list endpoints in development

## Recent Updates

### January 14, 2026

**Recipe Management Enhancements:**
- ✨ Added ingredient quantity precision control (limited to 2 decimal places)
- ✨ Implemented "Start from existing recipe" feature for easy recipe variations
- 🐛 Improved form validation with field-specific error messages
- 🐛 Fixed validation errors to show exactly which field has issues
- 💅 Enhanced user experience with clear, actionable error messages

**Technical Improvements:**
- Frontend auto-rounds ingredient quantities to 2 decimals
- Backend validator enforces 2-decimal precision
- Service layer ensures data consistency with rounding
- RecipePicker modal component for selecting existing recipes

## Key Features Highlight

### Recipe Creation
- **Simple Form Interface**: Intuitive form for adding recipes with ingredients, instructions, and nutrition
- **Field Validation**: Real-time validation with specific error messages
- **Quantity Precision**: Ingredient quantities limited to 2 decimal places for consistency
- **Recipe Variations**: "Start from existing recipe" button creates new recipes based on existing ones

### Meal Planning
- **Weekly View**: Plan meals for the entire week
- **Flexible Scheduling**: Assign recipes to specific dates and meal types
- **Nutrition Tracking**: Automatic calculation of nutritional information across your meal plan

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT

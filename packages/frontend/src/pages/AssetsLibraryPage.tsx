import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input, TextArea, Modal, Badge, Select, Alert } from '../components/ui';
import CustomThemeEditor from '../components/CustomThemeEditor';

export default function AssetsLibraryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismissAlert = (key: string) => {
    setDismissedAlerts(prev => new Set(prev).add(key));
  };

  const resetAlerts = () => setDismissedAlerts(new Set());

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        {/* Back Link */}
        <Link
          to="/developer"
          className="inline-flex items-center text-accent hover:text-accent-hover mb-6"
        >
          ← Back to Developer Tools
        </Link>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">Assets Library</h1>
          <p className="text-lg text-text-secondary">
            Every UI component with all variants, sizes, and states.
          </p>
        </header>

        <div className="space-y-10">

          {/* ========== CUSTOM THEMES ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Custom Themes</h2>
            <p className="text-sm text-text-muted mb-4">
              Create up to 3 custom themes by picking 6 key colors. All other colors are derived automatically.
              Custom themes appear in the theme picker alongside the 5 preset themes.
            </p>

            <Card>
              <CustomThemeEditor />
            </Card>
          </section>

          {/* ========== BUTTON ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Button</h2>
            <p className="text-sm text-text-muted mb-4">
              7 variants &middot; 3 sizes &middot; loading &amp; disabled states &middot; fullWidth option
            </p>

            <Card>
              {/* Variants */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3 mb-6">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>

              {/* Sizes */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button size="sm">Small</Button>
                <Button size="md">Medium (default)</Button>
                <Button size="lg">Large</Button>
              </div>

              {/* States */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">States</h3>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button variant="danger" loading>Danger Loading</Button>
                <Button variant="ghost" disabled>Ghost Disabled</Button>
              </div>

              {/* Placeholder / Inactive */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">Placeholder / Inactive</h3>
              <p className="text-sm text-text-muted mb-3">
                Non-clickable placeholders for future features. Use a <code className="px-1 py-0.5 bg-hover-bg rounded text-xs">&lt;span&gt;</code> instead of a button to prevent interaction.
              </p>
              <div className="flex flex-wrap gap-3 mb-6">
                <span className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-border-default text-text-muted cursor-default">
                  Placeholder
                </span>
                <span className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-border-default text-text-muted cursor-default">
                  Export Data
                </span>
                <span className="inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-border-default text-text-muted cursor-default">
                  Import Excel
                </span>
              </div>

              {/* Full Width */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">Full Width</h3>
              <div className="max-w-md">
                <Button fullWidth variant="primary">Full Width Button</Button>
              </div>
            </Card>
          </section>

          {/* ========== CARD ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Card</h2>
            <p className="text-sm text-text-muted mb-4">
              4 padding options &middot; hoverable option &middot; colored backgrounds
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <Card padding="none">
                <div className="p-4 border-b border-border-default">
                  <span className="text-xs font-mono text-text-muted">padding="none"</span>
                </div>
                <div className="p-4">Content sits flush — you control the padding.</div>
              </Card>
              <Card padding="sm">
                <span className="text-xs font-mono text-text-muted">padding="sm"</span>
                <p className="mt-1">Small padding (p-4).</p>
              </Card>
              <Card padding="md">
                <span className="text-xs font-mono text-text-muted">padding="md" (default)</span>
                <p className="mt-1">Medium padding (p-6).</p>
              </Card>
              <Card padding="lg">
                <span className="text-xs font-mono text-text-muted">padding="lg"</span>
                <p className="mt-1">Large padding (p-8).</p>
              </Card>
              <Card hoverable>
                <span className="text-xs font-mono text-text-muted">hoverable</span>
                <p className="mt-1">Hover over me for a shadow lift effect.</p>
              </Card>
              <Card>
                <span className="text-xs font-mono text-text-muted">default (not hoverable)</span>
                <p className="mt-1">Static card — no hover effect.</p>
              </Card>
            </div>

            <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Colored Cards</h3>
            <p className="text-sm text-text-muted mb-3">
              Pass color classes via <code className="px-1 py-0.5 bg-hover-bg rounded text-xs">className</code> for themed section cards.
            </p>

            <h4 className="text-sm font-semibold text-text-secondary mb-2">Hero (landing page)</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card hoverable className="bg-hero-recipes border border-hero-recipes-border">
                <span className="text-xs font-mono text-white/60">bg-hero-recipes</span>
                <p className="mt-1 text-white">Recipes</p>
              </Card>
              <Card hoverable className="bg-hero-mealplans border border-hero-mealplans-border">
                <span className="text-xs font-mono text-white/60">bg-hero-mealplans</span>
                <p className="mt-1 text-white">Meal Plans</p>
              </Card>
              <Card hoverable className="bg-hero-shopping border border-hero-shopping-border">
                <span className="text-xs font-mono text-white/60">bg-hero-shopping</span>
                <p className="mt-1 text-white">Shopping Lists</p>
              </Card>
              <Card hoverable className="bg-hero-cooking border border-hero-cooking-border">
                <span className="text-xs font-mono text-white/60">bg-hero-cooking</span>
                <p className="mt-1 text-white">Cooking Plans</p>
              </Card>
            </div>

            <h4 className="text-sm font-semibold text-text-secondary mb-2">Light (list pages)</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card hoverable className="bg-card-recipes border border-card-recipes-border">
                <span className="text-xs font-mono text-text-muted">bg-card-recipes</span>
                <p className="mt-1">Recipes list</p>
              </Card>
              <Card hoverable className="bg-card-mealplans border border-card-mealplans-border">
                <span className="text-xs font-mono text-text-muted">bg-card-mealplans</span>
                <p className="mt-1">Meal Plans list</p>
              </Card>
              <Card hoverable className="bg-card-shopping border border-card-shopping-border">
                <span className="text-xs font-mono text-text-muted">bg-card-shopping</span>
                <p className="mt-1">Shopping Lists list</p>
              </Card>
              <Card hoverable className="bg-card-cooking border border-card-cooking-border">
                <span className="text-xs font-mono text-text-muted">bg-card-cooking</span>
                <p className="mt-1">Cooking Plans list</p>
              </Card>
            </div>

            <h4 className="text-sm font-semibold text-text-secondary mb-2">Subdued (secondary)</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card hoverable className="bg-page-bg border border-border-default">
                <span className="text-xs font-mono text-text-muted">bg-page-bg</span>
                <p className="mt-1">Ingredients / Dev Tools</p>
              </Card>
            </div>
          </section>

          {/* ========== INPUT ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Input</h2>
            <p className="text-sm text-text-muted mb-4">
              Label &middot; error state &middot; disabled &middot; placeholder
            </p>

            <Card>
              <div className="grid md:grid-cols-2 gap-6">
                <Input placeholder="Default input" />
                <Input label="With Label" placeholder="Type something..." />
                <Input label="With Error" error="This field is required" placeholder="Invalid input" />
                <Input label="Disabled" placeholder="Can't edit this" disabled />
              </div>
            </Card>
          </section>

          {/* ========== TEXTAREA ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">TextArea</h2>
            <p className="text-sm text-text-muted mb-4">
              Same API as Input &middot; multi-line
            </p>

            <Card>
              <div className="grid md:grid-cols-2 gap-6">
                <TextArea label="Default" placeholder="Write something..." rows={3} />
                <TextArea label="With Error" error="Must be at least 10 characters" placeholder="Too short" rows={3} />
              </div>
            </Card>
          </section>

          {/* ========== MODAL ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Modal</h2>
            <p className="text-sm text-text-muted mb-4">
              4 sizes (sm / md / lg / xl) &middot; optional title &amp; footer &middot; closes on Escape or backdrop click
            </p>

            <Card>
              <div className="flex flex-wrap items-center gap-3">
                {(['sm', 'md', 'lg', 'xl'] as const).map(size => (
                  <Button
                    key={size}
                    variant="primary"
                    onClick={() => { setModalSize(size); setModalOpen(true); }}
                  >
                    Open {size.toUpperCase()} Modal
                  </Button>
                ))}
              </div>

              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={`Modal — size "${modalSize}"`}
                size={modalSize}
                footer={
                  <div className="flex gap-3">
                    <Button variant="ghost" fullWidth onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" fullWidth onClick={() => setModalOpen(false)}>Confirm</Button>
                  </div>
                }
              >
                <p className="text-text-primary mb-4">
                  This is a <strong>{modalSize}</strong> modal. It supports a title bar, scrollable body content, and an optional footer with action buttons.
                </p>
                <p className="text-text-muted text-sm">
                  Press <kbd className="px-1.5 py-0.5 bg-hover-bg border rounded text-xs">Esc</kbd> or click the backdrop to close.
                </p>
              </Modal>
            </Card>
          </section>

          {/* ========== BADGE ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Badge</h2>
            <p className="text-sm text-text-muted mb-4">
              7 color variants &middot; 2 sizes &middot; removable option
            </p>

            <Card>
              {/* Variants — sm */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">Small (default)</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="blue">Blue</Badge>
                <Badge variant="gray">Gray</Badge>
                <Badge variant="green">Green</Badge>
                <Badge variant="red">Red</Badge>
                <Badge variant="yellow">Yellow</Badge>
                <Badge variant="orange">Orange</Badge>
                <Badge variant="purple">Purple</Badge>
              </div>

              {/* Variants — md */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">Medium</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge variant="blue" size="md">Blue</Badge>
                <Badge variant="gray" size="md">Gray</Badge>
                <Badge variant="green" size="md">Green</Badge>
                <Badge variant="red" size="md">Red</Badge>
                <Badge variant="yellow" size="md">Yellow</Badge>
                <Badge variant="orange" size="md">Orange</Badge>
                <Badge variant="purple" size="md">Purple</Badge>
              </div>

              {/* Removable */}
              <h3 className="text-lg font-semibold text-text-primary mb-3">Removable</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="blue" size="md" removable onRemove={() => {}}>Removable</Badge>
                <Badge variant="red" size="md" removable onRemove={() => {}}>Click ×</Badge>
                <Badge variant="green" size="md" removable onRemove={() => {}}>Dismiss</Badge>
              </div>
            </Card>
          </section>

          {/* ========== SELECT ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Select</h2>
            <p className="text-sm text-text-muted mb-4">
              Same API as Input &middot; dropdown
            </p>

            <Card>
              <div className="grid md:grid-cols-2 gap-6">
                <Select>
                  <option value="">Default select</option>
                  <option value="1">Option 1</option>
                  <option value="2">Option 2</option>
                  <option value="3">Option 3</option>
                </Select>
                <Select label="With Label">
                  <option value="">Choose an option...</option>
                  <option value="a">Alpha</option>
                  <option value="b">Beta</option>
                </Select>
                <Select label="With Error" error="Please select a value">
                  <option value="">Nothing selected</option>
                  <option value="x">X</option>
                </Select>
                <Select label="Disabled" disabled>
                  <option>Can't change this</option>
                </Select>
              </div>
            </Card>
          </section>

          {/* ========== ALERT ========== */}
          <section>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Alert</h2>
            <p className="text-sm text-text-muted mb-4">
              4 variants &middot; optional title &middot; dismissible
            </p>

            <Card>
              <div className="space-y-4">
                <Alert variant="info">
                  <strong>Info:</strong> This is an informational alert.
                </Alert>
                <Alert variant="success" title="Success">
                  Operation completed successfully.
                </Alert>
                <Alert variant="warning" title="Warning">
                  Please check your input before proceeding.
                </Alert>
                <Alert variant="error">
                  <strong>Error:</strong> Something went wrong. Please try again.
                </Alert>

                {/* Dismissible demos */}
                <h3 className="text-lg font-semibold text-text-primary mt-6 mb-2">Dismissible</h3>
                {!dismissedAlerts.has('dismiss-info') && (
                  <Alert variant="info" onDismiss={() => handleDismissAlert('dismiss-info')}>
                    Click the × to dismiss this alert.
                  </Alert>
                )}
                {!dismissedAlerts.has('dismiss-success') && (
                  <Alert variant="success" title="Dismissible Success" onDismiss={() => handleDismissAlert('dismiss-success')}>
                    This one has a title too.
                  </Alert>
                )}
                {dismissedAlerts.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetAlerts}>
                    Reset dismissed alerts
                  </Button>
                )}
              </div>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input, TextArea, Modal, Badge, Select, Alert } from '../components/ui';

export default function AssetsLibraryPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismissAlert = (key: string) => {
    setDismissedAlerts(prev => new Set(prev).add(key));
  };

  const resetAlerts = () => setDismissedAlerts(new Set());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Link */}
        <Link
          to="/developer"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          ← Back to Developer Tools
        </Link>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Assets Library</h1>
          <p className="text-lg text-gray-600">
            Every UI component with all variants, sizes, and states.
          </p>
        </header>

        <div className="space-y-10">

          {/* ========== BUTTON ========== */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Button</h2>
            <p className="text-sm text-gray-500 mb-4">
              7 variants &middot; 3 sizes &middot; loading &amp; disabled states &middot; fullWidth option
            </p>

            <Card>
              {/* Variants */}
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Variants</h3>
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
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button size="sm">Small</Button>
                <Button size="md">Medium (default)</Button>
                <Button size="lg">Large</Button>
              </div>

              {/* States */}
              <h3 className="text-lg font-semibold text-gray-800 mb-3">States</h3>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button variant="danger" loading>Danger Loading</Button>
                <Button variant="ghost" disabled>Ghost Disabled</Button>
              </div>

              {/* Full Width */}
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Full Width</h3>
              <div className="max-w-md">
                <Button fullWidth variant="primary">Full Width Button</Button>
              </div>
            </Card>
          </section>

          {/* ========== CARD ========== */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Card</h2>
            <p className="text-sm text-gray-500 mb-4">
              4 padding options &middot; hoverable option
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <Card padding="none">
                <div className="p-4 border-b border-gray-100">
                  <span className="text-xs font-mono text-gray-400">padding="none"</span>
                </div>
                <div className="p-4">Content sits flush — you control the padding.</div>
              </Card>
              <Card padding="sm">
                <span className="text-xs font-mono text-gray-400">padding="sm"</span>
                <p className="mt-1">Small padding (p-4).</p>
              </Card>
              <Card padding="md">
                <span className="text-xs font-mono text-gray-400">padding="md" (default)</span>
                <p className="mt-1">Medium padding (p-6).</p>
              </Card>
              <Card padding="lg">
                <span className="text-xs font-mono text-gray-400">padding="lg"</span>
                <p className="mt-1">Large padding (p-8).</p>
              </Card>
              <Card hoverable>
                <span className="text-xs font-mono text-gray-400">hoverable</span>
                <p className="mt-1">Hover over me for a shadow lift effect.</p>
              </Card>
              <Card>
                <span className="text-xs font-mono text-gray-400">default (not hoverable)</span>
                <p className="mt-1">Static card — no hover effect.</p>
              </Card>
            </div>
          </section>

          {/* ========== INPUT ========== */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Input</h2>
            <p className="text-sm text-gray-500 mb-4">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">TextArea</h2>
            <p className="text-sm text-gray-500 mb-4">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Modal</h2>
            <p className="text-sm text-gray-500 mb-4">
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
                <p className="text-gray-700 mb-4">
                  This is a <strong>{modalSize}</strong> modal. It supports a title bar, scrollable body content, and an optional footer with action buttons.
                </p>
                <p className="text-gray-500 text-sm">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs">Esc</kbd> or click the backdrop to close.
                </p>
              </Modal>
            </Card>
          </section>

          {/* ========== BADGE ========== */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Badge</h2>
            <p className="text-sm text-gray-500 mb-4">
              7 color variants &middot; 2 sizes &middot; removable option
            </p>

            <Card>
              {/* Variants — sm */}
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Small (default)</h3>
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
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Medium</h3>
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
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Removable</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="blue" size="md" removable onRemove={() => {}}>Removable</Badge>
                <Badge variant="red" size="md" removable onRemove={() => {}}>Click ×</Badge>
                <Badge variant="green" size="md" removable onRemove={() => {}}>Dismiss</Badge>
              </div>
            </Card>
          </section>

          {/* ========== SELECT ========== */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Select</h2>
            <p className="text-sm text-gray-500 mb-4">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Alert</h2>
            <p className="text-sm text-gray-500 mb-4">
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
                <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-2">Dismissible</h3>
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

/**
 * Página de inspección del Design System.
 *
 * Abre http://localhost:3000/design-system para ver todos los componentes
 * juntos. Cambia entre light/dark con tu ThemeProvider y comprueba que se
 * ve bien antes de empezar a sustituir.
 *
 * Esta página NO depende de ningún store, API, auth o módulo. Es 100% segura.
 * Bórrala (o muévela detrás de un flag de admin) cuando termines.
 */
'use client'

import * as React from 'react'
import {
  Button,
  Card,
  Badge,
  StatusPill,
  Input,
  Select,
  Textarea,
  Modal,
  Spinner,
  Kbd,
  Checkbox,
} from '../ui/components'

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-bg text-fg p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Hero */}
        <header>
          <div className="text-xs uppercase tracking-wider text-fg-subtle mb-2">
            Four-Points · UI Kit
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Design System</h1>
          <p className="text-fg-muted mt-1">
            Componentes basados en los tokens del Paso 1. Usa el toggle de tema de tu app para ver
            light / dark.
          </p>
        </header>

        {/* Tokens */}
        <Section title="Tokens · Surfaces & Text">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Swatch className="bg-bg" label="bg" />
            <Swatch className="bg-surface" label="surface" />
            <Swatch className="bg-surface-hover" label="surface-hover" />
            <Swatch className="bg-surface-sunken" label="surface-sunken" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <TextSwatch className="text-fg" label="fg" />
            <TextSwatch className="text-fg-muted" label="fg-muted" />
            <TextSwatch className="text-fg-subtle" label="fg-subtle" />
          </div>
        </Section>

        <Section title="Tokens · Semantic">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SemanticSwatch tone="accent" />
            <SemanticSwatch tone="success" />
            <SemanticSwatch tone="warning" />
            <SemanticSwatch tone="danger" />
            <SemanticSwatch tone="info" />
          </div>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Default</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Loading…</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Cards">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="text-fg-subtle text-xs uppercase tracking-wider">Ingresos hoy</div>
              <div className="text-2xl font-semibold tracking-tight mt-1 fp-tnum">€4.182,50</div>
              <div className="text-fg-muted text-xs mt-1">12 transacciones</div>
            </Card>

            <Card hover>
              <div className="text-fg-subtle text-xs uppercase tracking-wider">Hoverable</div>
              <div className="text-fg mt-1">Pasa el ratón por encima</div>
            </Card>

            <Card variant="elevated">
              <div className="text-fg-subtle text-xs uppercase tracking-wider">Elevated</div>
              <div className="text-fg mt-1">Sombra de modal</div>
            </Card>
          </div>

          <div className="mt-4">
            <Card padding="none">
              <Card.Header
                title="Habitación 204"
                subtitle="2 noches · Check-out hoy"
                actions={
                  <>
                    <Button size="sm" variant="ghost">
                      Editar
                    </Button>
                    <Button size="sm" variant="accent">
                      Check-out
                    </Button>
                  </>
                }
              />
              <Card.Body>
                <p className="text-fg-muted text-sm">
                  Contenido del cuerpo. Compón Header + Body + Footer cuando necesites una cabecera
                  con acciones.
                </p>
              </Card.Body>
              <Card.Footer>
                <span className="text-xs text-fg-subtle">Última actualización: hace 4 min</span>
              </Card.Footer>
            </Card>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badges & Status Pills">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">Limpia</Badge>
            <Badge tone="warning">Pendiente</Badge>
            <Badge tone="danger">Bloqueada</Badge>
            <Badge tone="info">Reservada</Badge>
            <Badge tone="accent">VIP</Badge>
            <Badge tone="neutral">Borrador</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <StatusPill tone="success">Activa</StatusPill>
            <StatusPill tone="warning">En limpieza</StatusPill>
            <StatusPill tone="danger">Fuera de servicio</StatusPill>
            <StatusPill tone="info">Llega hoy</StatusPill>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Inputs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Input label="Nombre del huésped" placeholder="John Doe" />
            <Input label="Habitación" placeholder="204" mono hint="Sólo números" />
            <Input label="Email" type="email" placeholder="huesped@ejemplo.com" required />
            <Input label="DNI" placeholder="00000000A" error="Formato inválido" />
          </div>
        </Section>

        {/* Select */}
        <Section title="Select">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Select
              label="Turno"
              placeholder="Selecciona un turno"
              options={[
                { value: 'morning', label: 'Mañana' },
                { value: 'afternoon', label: 'Tarde' },
                { value: 'night', label: 'Noche' },
              ]}
            />
            <Select
              label="Estado"
              options={[
                { value: 'active', label: 'Activo' },
                { value: 'inactive', label: 'Inactivo' },
              ]}
              error="Campo obligatorio"
            />
          </div>
        </Section>

        {/* Textarea */}
        <Section title="Textarea">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <Textarea label="Notas" placeholder="Escribe aquí..." hint="Máximo 500 caracteres" />
            <Textarea
              label="Observaciones"
              placeholder="Error de ejemplo"
              error="Este campo es obligatorio"
            />
          </div>
        </Section>

        {/* Checkbox */}
        <Section title="Checkbox">
          <div className="flex flex-col gap-2">
            <Checkbox label="Opción sin marcar" />
            <Checkbox label="Opción marcada" defaultChecked />
            <Checkbox label="Opción deshabilitada" disabled />
            <Checkbox label="Tachado al marcar (por defecto)" defaultChecked strikeOnCheck />
          </div>
        </Section>

        {/* Spinner */}
        <Section title="Spinner">
          <div className="flex items-center gap-6">
            <Spinner size="xs" />
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
            <Spinner size="md" tone="fg" />
            <Spinner size="md" tone="current" className="text-warning" />
          </div>
        </Section>

        {/* Modal */}
        <Section title="Modal">
          <ModalDemo />
        </Section>

        {/* Kbd */}
        <Section title="Keyboard hints">
          <div className="text-fg-muted text-sm">
            Pulsa <Kbd>⌘</Kbd> + <Kbd>K</Kbd> para abrir el buscador, o <Kbd>Esc</Kbd> para cerrar.
          </div>
        </Section>

        <footer className="text-fg-subtle text-xs pt-6 border-t border-border">
          Four-Points PMS · Design System v0.3 · <span className="fp-mono">/app/ui/components</span>
        </footer>
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-fg uppercase tracking-wider">{title}</h2>
      <div>{children}</div>
    </section>
  )
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="rounded-fp-md border border-border overflow-hidden">
      <div className={`${className} h-16`} />
      <div className="px-3 py-2 text-xs text-fg-muted font-mono bg-surface">{label}</div>
    </div>
  )
}

function TextSwatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="rounded-fp-md border border-border bg-surface p-4">
      <div className={`${className} text-lg`}>Aa Bb Cc 0123</div>
      <div className="text-xs text-fg-subtle font-mono mt-1">{label}</div>
    </div>
  )
}

function ModalDemo() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)}>
        Abrir modal
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Modal de ejemplo"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="accent" onClick={() => setOpen(false)}>
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Contenido del modal. Usa <code className="fp-mono text-accent">footer</code> para
          acciones. El botón ✕ siempre está presente en el header.
        </p>
      </Modal>
    </>
  )
}

function SemanticSwatch({ tone }: { tone: 'accent' | 'success' | 'warning' | 'danger' | 'info' }) {
  const map = {
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  }
  return (
    <div className="rounded-fp-md border border-border overflow-hidden">
      <div className={`${map[tone]} h-16`} />
      <div className="px-3 py-2 text-xs text-fg-muted font-mono bg-surface">{tone}</div>
    </div>
  )
}

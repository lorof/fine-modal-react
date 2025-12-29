# Fine Modal React

Typed, promise-based modals for React 19+ with two mounting strategies: a global host or colocated modal components.

## Installation

```bash
npm install fine-modal-react
# or
pnpm add fine-modal-react
```

Peer deps: `react` and `react-dom` (19.x).

## Quickstart (checklist)

1) Install the package.  
2) Define your modal with `FineModal.define`.  
3) Aggregate modals in `modals.ts` and augment `Register` for typed `open`.  
4) Choose mounting strategy:  
   - Global host: create `ModalHost = FineModal.createHost({ modals })` near root.  
   - Local: render the modal component where you need it.  
5) Call `open` (typed both ways):
   - `FineModal.open('ModalId', props?)` uses registered ids/props/result from `modals`.
   - `SomeModal.open(props?)` uses the component’s props/result.
   Both resolve to the `onConfirm` value, or `null` on `onCancel/close`.

## Define a modal (shared for both strategies)

`ConfirmInviteModal.tsx`

```tsx
import { FineModal } from 'fine-modal-react'

interface ConfirmInviteModalProps {
  initialProps: { email: string }
  onConfirm: (value: 'sent') => void
  onCancel: () => void
}

const ConfirmInvite = ({
  initialProps,
  onConfirm,
  onCancel,
}: ConfirmInviteModalProps) => (
  <section>
    <p>Send an invite to {initialProps.email}?</p>
    <div>
      <button type="button" onClick={() => onConfirm('sent')}>Send</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  </section>
)

export const ConfirmInviteModal = FineModal.define({
  id: 'ConfirmInviteModal',
  component: ConfirmInvite,
})
```

`modals.ts`

```ts
import { ConfirmInviteModal } from './ConfirmInviteModal'

// Collect all modals in one place for the host and typed open()
export const modals = [ConfirmInviteModal] as const

// Module augmentation kept here for convenience; required for typed open()
declare module 'fine-modal-react' {
  interface Register {
    readonly modals?: typeof modals
  }
}
```

## Option A: Global host (central place for all modals)

Use a single `ModalHost` near the app root. Open modals anywhere via their string id.

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FineModal } from 'fine-modal-react'
import App from './app'
import { modals } from './modals'

const ModalHost = FineModal.createHost({ modals })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ModalHost />
  </StrictMode>
)
```

```tsx
// anywhere in the tree
import { FineModal } from 'fine-modal-react'

export function App() {
  const handleInvite = async () => {
    const result = await FineModal.open('ConfirmInviteModal', {
      email: 'teammate@company.com',
    })

    if (result === 'sent') {
      console.log('Invite sent')
    } else {
      console.log('Invite cancelled')
    }
  }

  return <button onClick={handleInvite}>Invite teammate</button>
}
```

## Type safety (global & local)

```ts
// Global host: ids/props/result inferred from registered modals
const result = await FineModal.open('ConfirmInviteModal', { email: 'team@org.com' })
//    ^? result is "sent" | null

// TS error: missing required prop "email"
FineModal.open('ConfirmInviteModal')

// TS error: unknown modal id
FineModal.open('UnknownModal')
```

```ts
// Local modal: props/result inferred from component definition
const result = await ConfirmInviteModal.open({ email: 'new.user@org.com' })
//    ^? result is "sent" | null

// TS error: email must be a string
ConfirmInviteModal.open({ email: 42 })
```

## Option B: Local modal component (colocated scope)

Render the modal component where you need it; open it via its static API. This avoids a global host if you only need the modal in one subtree.

```tsx
import { ConfirmInviteModal } from './ConfirmInviteModal'

export function App() {
  const handleInvite = async () => {
    const result = await ConfirmInviteModal.open({ email: 'new.user@org.com' })
    if (result === 'sent') {
      console.log('Invite sent')
    }
  }

  return (
    <>
      <button onClick={handleInvite}>Invite teammate</button>
      <ConfirmInviteModal />
    </>
  )
}
```

## Modal authoring notes

- `onConfirm(value)` resolves the promise returned by `open` with `value`.
- `onCancel()` resolves the promise with `null` and closes the modal.
- If your modal needs initial props, add an `initialProps` field to the component props; `open` will require/accept that shape. If not needed, omit `initialProps` and `open()` will take no args.
- `FineModal.open` automatically closes an existing modal with the same id before opening a new one.
- Keep the module augmentation file (`modals.ts` in the example) included in `tsconfig` so TypeScript picks up the `Register` interface extension.

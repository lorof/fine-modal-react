# Fine Modal React

Typed, promise-based modals for React 19+ with two mounting strategies: a global host or colocated modal components.

## Installation

```bash
npm install fine-modal-react
# or
pnpm add fine-modal-react
```

Peer deps: `react` and `react-dom` (19.x).

## Define a modal (shared for both strategies)

```tsx
import { FineModal } from 'fine-modal-react'

export const ConfirmInviteModal = FineModal.define({
  id: 'ConfirmInviteModal',
  component: ({ initialProps, onConfirm, onCancel }: {
    initialProps: { email: string }
    onConfirm: (value: 'sent') => void
    onCancel: () => void
  }) => (
    <section>
      <p>Send an invite to {initialProps.email}?</p>
      <div>
        <button type="button" onClick={() => onConfirm('sent')}>Send</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  ),
})

export const modals = [ConfirmInviteModal] as const
```

### TypeScript registration for typed `open` (required for typing)

```ts
import type { modals } from './modals'

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
- If your modal needs initial props, add an `initialProps` field to the component props; `open` will require/accept that shape.
- `FineModal.open` automatically closes an existing modal with the same id before opening a new one.

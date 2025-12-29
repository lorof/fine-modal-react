import React, { useCallback, useMemo, useSyncExternalStore } from 'react'

type Callback = (value?: unknown) => void

interface ModalStatics<Id extends string, InitialProps, Result> {
  id: Id
  open: (
    ...args: [InitialProps] extends [void]
      ? []
      : [InitialProps] extends [undefined]
        ? []
        : [props: InitialProps]
  ) => Promise<Result | null>
  close: () => void
}

type ExtractInitialProps<C> =
  C extends React.ComponentType<infer P>
    ? P extends { initialProps: infer IP }
      ? IP
      : never
    : never

type ExtractResult<C> =
  C extends React.ComponentType<infer P>
    ? P extends { onConfirm: (value: infer R) => any }
      ? R
      : never
    : never

export interface Register {}

const createStore = () => {
  let listeners: Callback[] = []

  const store = {
    modals: {} as Record<string, object>,

    subscribe: (cb: Callback) => {
      listeners.push(cb)

      return () => {
        listeners = listeners.filter((listener) => listener !== cb)
      }
    },

    getSnapshot: () => store.modals,

    open: (id: string, props: object) => {
      store.modals = { ...store.modals, [id]: props }
      listeners.forEach((cb) => cb())
    },

    close: (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = store.modals
      store.modals = rest
      listeners.forEach((cb) => cb())
    },
  }

  return store
}

const store = createStore()
const resolves: Record<string, Callback> = {}

type GetProp<T, K extends PropertyKey> = K extends keyof T ? T[K] : never

type RegisteredModals =
  NonNullable<GetProp<Register, 'modals'>> extends readonly unknown[]
    ? NonNullable<GetProp<Register, 'modals'>>[number]
    : never

type ModalMap = {
  [M in RegisteredModals as M extends { id: infer N }
    ? N extends string
      ? N
      : never
    : never]: M
}

type RegisteredIds = keyof ModalMap

type PropsById<N extends RegisteredIds> = ModalMap[N] extends {
  open: (p: infer P) => any
}
  ? P
  : never

type ResultById<N extends RegisteredIds> = ModalMap[N] extends {
  open: (...a: any[]) => Promise<infer R>
}
  ? R
  : never

type PropsArg<N extends RegisteredIds> = [PropsById<N>] extends [never]
  ? []
  : [undefined] extends [PropsById<N>]
    ? []
    : [void] extends [PropsById<N>]
      ? []
      : [props: PropsById<N>]

type ValueArg<N extends RegisteredIds> = [value: ResultById<N> | null]

const FineModal = {
  open: (id: string, props: object) =>
    new Promise((r) => {
      if (resolves[id]) {
        FineModal.close(id, null)
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      resolves[id] = r
      store.open(id, props)
    }),

  close: (id: string, value: null = null) => {
    resolves[id]?.(value)
    store.close(id)
    delete resolves[id]
  },
} as {
  open<N extends RegisteredIds>(
    id: N,
    ...args: PropsArg<N>
  ): Promise<ResultById<N>>
  close<N extends RegisteredIds>(id: string, ...args: ValueArg<N>): void
}

const define = <
  const Id extends string,
  C extends React.ComponentType<any>,
>(options: {
  id: Id
  component: C
}) => {
  type InitialProps = ExtractInitialProps<C>
  type Result = ExtractResult<C>
  type OwnProps = Omit<
    React.ComponentProps<C>,
    'initialProps' | 'onConfirm' | 'onCancel'
  >

  const Modal = (props: OwnProps) => {
    const snap = useSyncExternalStore(store.subscribe, store.getSnapshot)
    const id = options.id
    const initialProps = snap[id] as unknown as InitialProps | undefined

    const handleConfirm = useCallback(
      (value: Result) => {
        FineModal.close(id, value)
      },
      [id]
    )

    const handleCancel = useCallback(() => {
      FineModal.close(id, null)
    }, [id])

    return (
      initialProps !== null && (
        <options.component
          {...(props as any)}
          initialProps={initialProps}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )
    )
  }

  return Object.assign(Modal, {
    id: options.id,

    open: (
      ...args: [InitialProps] extends [never]
        ? []
        : [undefined] extends [InitialProps]
          ? []
          : [void] extends [InitialProps]
            ? []
            : [props: InitialProps]
    ) =>
      FineModal.open(
        options.id as any,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        (args[0] ?? {}) as any
      ) as Promise<Result | null>,

    close: () => FineModal.close(options.id as any, null),
  }) as typeof Modal & ModalStatics<Id, InitialProps, Result>
}

type AnyModal = React.FC<any> & { id: string }

interface CreateHostOptions {
  modals: readonly AnyModal[]
}

const createHost = (options: CreateHostOptions) => {
  const modalsMap = options.modals.reduce(
    (acc, modal) => ({ ...acc, [modal.id]: modal }),
    {} as Record<string, CreateHostOptions['modals'][number]>
  )

  return function ModalHost() {
    const snap = useSyncExternalStore(store.subscribe, store.getSnapshot)

    const values = useMemo(
      () => Object.entries(snap).filter(([id]) => id in modalsMap),
      [snap]
    )

    return values.map(([id, props]) => {
      const Modal = modalsMap[id]
      return <Modal key={id} initialProps={props} />
    })
  }
}

const obj = Object.assign(FineModal, {
  define,
  createHost,
})

export { obj as FineModal }

# Add Provenance Tracking for a State

Add provenance tracking for a new shared state variable by following the established pattern across three files.

The user will provide:
- **State name** — e.g. `hoveredId`
- **State type** — e.g. `number | null`, `string`, `boolean`
- **Default value** — e.g. `null`, `''`, `false`
- **Which component** currently owns the local state (if any)

## Pattern Overview

Provenance tracking is split across three files:

### 1. `src/public/fairfuse/assets/types.ts`
Add the field to `ProvenanceStateModel`:
```ts
export interface ProvenanceStateModel {
  // existing fields...
  <stateName>: <StateType>;
}
```

### 2. `src/public/fairfuse/assets/useProvenance.ts`
Register a new trrack action and add the field to `initialState`:
```ts
const trrack<StateName> = reg.register('<stateName>', (state, d: <StateType>) => {
  state.<stateName> = d;
  return state;
});

// inside initializeTrrack initialState:
<stateName>: <defaultValue>,

// inside the returned actions object:
trrack<StateName>,
```

### 3. `src/public/fairfuse/assets/SharedStateContext.tsx`
Add to the `SharedState` interface, `useState`, the restore `useEffect`, a tracking `useEffect`, and the `useMemo` value:

```ts
// SharedState interface
<stateName>: <StateType>;
set<StateName>: React.Dispatch<React.SetStateAction<<StateType>>>;

// useState
const [<stateName>, set<StateName>] = useState<<StateType>>(<defaultValue>);

// restore useEffect (inside the existing provenanceState block)
set<StateName>(provenanceState.<stateName>);

// tracking useEffect
useEffect(() => {
  provenance.trrack.apply('<StateName>', provenance.actions.trrack<StateName>(<stateName>));
  setProvenance(provenance.trrack.graph.backend);
}, [<stateName>, provenance, setProvenance]);

// useMemo value and dependency array
<stateName>,
set<StateName>,
```

### 4. Source component (if lifting from local state)
- Remove the `useState` declaration for the variable
- Destructure `<stateName>` and `set<StateName>` from `useSharedState()` instead

---

Read the current state of all three files before making changes to avoid conflicts with existing fields. After editing, verify there are no TypeScript errors.

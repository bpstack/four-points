# Scheduling solver

How a month's roster is generated automatically. Part of the
[scheduling module](README.md).

## What it does

Given a month, its employees, their rules, the locked cells and the last days of
the previous month, the solver finds a full roster that meets every mandatory
rule and, among those, the one with the lowest penalty for unmet preferences. If
no roster can meet all the rules, it says which rules collide and suggests which
ones to relax.

It uses **Google OR-Tools CP-SAT**, a constraint-programming solver: the roster
is modelled as one yes/no variable per employee, day and shift, the rules become
constraints between those variables, and the preferences become the objective to
minimise.

## Where it runs

- **Python 3.11 with OR-Tools** in `backend/scheduling-solver/` (`daemon.py`,
  `model.py`, `schemas.py` and one file per rule in `constraints/`).
- It runs as a **persistent process** that the backend starts when it boots
  (`warmupSolver()`), because importing OR-Tools is slow. The backend talks to
  it through standard input and output (`services/scheduling/solver-client.ts`).
- **One request at a time**: a semaphore serialises the generations. If the
  process dies, the next request starts it again. Timeouts: 30 minutes to start
  (OR-Tools can take that long to import on Windows), 30 seconds for the solver
  itself and 60 seconds for the whole request.
- On deployment, the backend's build step creates the Python environment and
  installs `ortools` and `pydantic`.

## Input

Built by `backend/services/scheduling/build-solver-input.ts` from the database:

- **Employees** active in that month (by their start and end dates). Employees
  with a fixed `P` shift but no fixed weekdays are left out: the solver would
  not know when to place them.
- **Days**, with holidays.
- **Configuration**: staff per shift, day-off ranges, night block sizes, maximum
  consecutive working days…
- **Locked cells**, from three sources in this order, where an earlier source
  always wins:
  1. assignments that come from approved constraints;
  2. approved requests, expanded over their dates (vacation → `V`, compensated
     holiday → `B`, long sick leave → `IT`);
  3. fixed-weekday rules (e.g. Monday to Friday): the work shift on those days,
     `L` on the rest.
- **Previous month's tail**: the last 7 days, used as "virtual" days so the
  rules hold across the change of month.
- **Night history** of past published months, to spread nights fairly.

## Rules and preferences

The rules the solver enforces (one file per rule in `constraints/`) and the
preferences it minimises, with their weights, are in
[`constraints.md`](constraints.md): the catalogue in §2–§3 and what the solver
actually implements in §11.

## Output

- **`ok`**: the roster, the total penalty and a breakdown per preference. In one
  transaction, the backend deletes every cell of the month that does not come
  from an approved constraint and writes the new roster, except the cells the
  solver received as locked: those from fixed weekdays or approved requests are
  therefore left empty.
- **`infeasible`**: the colliding rules and suggested relaxations; the backend
  answers `422` and the month is left untouched.
- **`error`**: an error code; the backend answers `500`.

Every run, whatever its result, is stored in `scheduling_solver_runs` with its
full input and output.

**The mandatory rules are always met, but the roster is not guaranteed to be
identical between two runs of the same month**: no random seed is passed and
CP-SAT searches in parallel, so it can reach different rosters with the same
penalty.

## Running it locally

- **Versions** are pinned: Python 3.11
  (`backend/scheduling-solver/.python-version`) and `ortools` and `pydantic` at
  exact versions in `requirements.txt`, which is what the deployment installs.
  To upgrade, edit `requirements.txt`; reverting the change restores the
  previous versions.
- **Setup, once**, from `backend/scheduling-solver/`:

  ```bash
  python -m venv venv
  venv/Scripts/pip install -r requirements.txt pytest   # Windows
  venv/bin/pip install -r requirements.txt pytest       # Linux/macOS
  ```

  `venv/` is ignored by Git.

- **Running**: starting the backend starts the solver process too. The first
  start on Windows can take minutes while Windows Defender scans OR-Tools;
  excluding `venv/` from Defender avoids it.
- **Standalone**: `venv/Scripts/python daemon.py` prints `{"status":"ready"}`
  once OR-Tools is loaded, then reads one `SolverInput` JSON per line from
  standard input and answers one line per request. `main.py` does the same for a
  single input and exits; production does not use it.
- **When a month is `infeasible`**: usually too many locked cells (vacations,
  leave) for the minimum coverage, a minimum staff too high for the available
  employees, or an unfinished night block from the previous month colliding with
  locked cells at the start of this one. The output lists the colliding rules,
  and every run's full input is in `scheduling_solver_runs`.

## How it is tested

- A shared corpus of cases (`backend/tests/scheduling-corpus/fixtures/`) run
  against the TypeScript validator (`corpus.test.ts`) and the solver
  (`test_corpus.py`).
- A parity test (`solver-parity.test.ts`): every roster the solver produces must
  pass the TypeScript validator with no errors.
- Stress and benchmark tests for the daemon (`test_daemon_stress.py`,
  `test_benchmark.py`).

```bash
# from backend/
pnpm run test:corpus                                # validator against the corpus
pnpm exec vitest run tests/scheduling/solver-parity.test.ts
# from backend/scheduling-solver/
venv/Scripts/python -m pytest tests/                # solver corpus and daemon
venv/Scripts/python -m pytest tests/test_benchmark.py --runbenchmark   # 30×31, off by default
```

All of them must pass after changing a rule.

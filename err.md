DYcLPPPSh

Preview
Ready
1m 17s
testing
e316584
Merge branch 'main' into testing
5m ago by bpstack
github/bpstack
AMzLTpxn4

Preview
Error
1m 10s
schedule
58bc1be
merge: resolve conflict, keep main version (tildes + payment_updated fix)
5m ago by bpstack
github/bpstack
9mppXFx2Y

Production
Current
Ready
1m 24s
main
79b92f3
chore: docs refactoring and some messages i18n fix
6m ago by bpstack
github/bpstack


 
     · optimizePackageImports
20:12:22.682 
20:12:22.722 
   Creating an optimized production build ...
20:13:01.125 
 ✓ Compiled successfully in 37.9s
20:13:01.128 
   Running TypeScript ...
20:13:23.392 
Failed to compile.
20:13:23.393 
20:13:23.394 
./app/components/scheduling/SchedulingConfigClient.tsx:421:54
20:13:23.394 
Type error: Type 'string | undefined' is not assignable to type 'string | number | Date'.
20:13:23.394 
  Type 'undefined' is not assignable to type 'string | number | Date'.
20:13:23.394 
20:13:23.395 
  419 |       setTestResult(result)
20:13:23.395 
  420 |       if (result.success) {
20:13:23.395 
> 421 |         toast.success(tToasts('connectionSuccess', { provider: result.provider }))
20:13:23.396 
      |                                                      ^
20:13:23.396 
  422 |       } else {
20:13:23.396 
  423 |         toast.error(result.error || tToasts('connectionError'))
20:13:23.396 
  424 |       }
20:13:23.456 
Next.js build worker exited with code: 1 and signal: null
20:13:23.493 
 ELIFECYCLE  Command failed with exit code 1.
20:13:23.519 
Error: Command "pnpm run build" exited with 1
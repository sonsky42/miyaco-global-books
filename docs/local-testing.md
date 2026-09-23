# Local testing (setup prepared; full runtime not yet verified)

This setup runs the actual Motoko backend, a development Internet Identity canister and the React interface. It is not a mock accounting database. It needs Linux/macOS; on this Windows PC, WSL/Ubuntu must first be installed. No Caffeine import or credits are used for local tests. Initial tool/package downloads need internet access.

## Windows prerequisite

Install Ubuntu using Microsoft's `wsl --install -d Ubuntu` in an administrator terminal. Windows may require a restart; save work and restart only when ready. Complete Ubuntu's first-run username/password setup yourself. Do not put these credentials in the project or chat.

Inside Ubuntu install Node.js LTS, pnpm 10.26.1, the official DFINITY dfx SDK and the `ic-mops` package manager. Use the official instructions at https://legacy.internetcomputer.org/docs/building-apps/getting-started/quickstart and https://docs.mops.one/quick-start . This project keeps Caffeine's moc 1.8.2 and core 2.5.0 pins through mops.toml; do not silently substitute another compiler.

Use a separate checkout in Ubuntu's Linux home directory so Windows and Linux do not share node_modules. The prepared changes must be committed/copied into that checkout before launching. The current Windows working copy is in a temporary directory; do not rely on that location for long-term storage.

## Start and stop

From the repository root in Ubuntu:

```sh
bash scripts/local-start.sh
```

Open http://localhost:5173 . Register a **new local test identity**, then create a book named `LOCAL TEST - disposable`. Do not enter real customer information. The script always specifies `--network local`; it never deploys to the Internet Computer mainnet. The local frontend refuses to start without local canister IDs and supplies a localhost-only backend configuration. Production env.json and Caffeine's Vite config are untouched.

Stop the frontend with Ctrl+C. Stop the backend with `dfx stop`. Local data is retained under .dfx; do not use `--clean`, reinstall, or delete .dfx unless you deliberately want to discard test data. This launch script has not yet been exercised end-to-end on this PC because WSL is missing. Internet Identity's development artifact currently follows its official latest release; pin a verified version after the first successful setup.

## Test workflow

1. Create a book and confirm Pending and Analytics open as the creator.
2. Add ten cartons with one unit per carton, unit cost NGN 50.
3. Sell one unit for NGN 60. Stock should be 9 and gross profit NGN 10.
4. Record a credit sale with a named dummy customer; check their history and debt.
5. Use a second local identity for staff approval testing: pending records must not change posted stock or profit; approval must update them once.
6. Test carton quantities and customer photos. Photos stored directly by this app work locally; features depending on Caffeine's external object-storage gateway are deliberately disabled, not silently sent to production.

The current accounting repair recognizes gross profit on approved credit sales; a cash-only profit policy and repayments need separate implementation. Do not treat this as complete bookkeeping certification. Import into Caffeine only at milestones, since its generated bindings and build checks still need platform testing.

## Import failure fixes

The storage dependency is now explicit. The customer photo input has an explicit label association and a semantic output status. Stable checking now points to `baselines/caffeine-export-v23.most`, copied unchanged from the original exported backend signature, instead of the absent ignored .old directory. This is an export baseline, NOT proof of the current live canister signature. Do not replace it with an empty actor or overwrite it with each new build. Verify the actual live signature before a production upgrade.

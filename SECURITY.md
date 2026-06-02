# Security Policy

Report security issues privately by opening a GitHub security advisory or emailing the maintainer address listed by the project owner.

EnvLint handles potentially sensitive project metadata. Please do not paste real secret values into public issues. Include minimal reproductions with placeholder values instead.

Security expectations:

- Real `.env` values are not read by default.
- Reports should never include raw secret values.
- Autofix should not modify real `.env` files unless a future explicit option documents that behavior.
- The GitHub Action should publish reports as artifacts only when requested by workflow configuration.


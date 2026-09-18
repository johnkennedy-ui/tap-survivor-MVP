# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the repository owner using GitHub's private
vulnerability reporting feature when it is enabled, or through the contact method published on the
repository profile. Do not include exploitable details in public issues.

If neither private route is available, a public issue may request a private reporting channel, but
must contain no exploit details, personal data, or live secrets.

Include affected commit or release, reproduction steps, impact, and any mitigations already
attempted. Maintainers will acknowledge reports, assess impact, and coordinate a fix before public
disclosure.

## Supported code

Security fixes are assessed against the default branch and the current Android debug build. This
repository does not publish signed releases or accept signing material in source control.

The shared web application, Android/Capacitor wrapper, dependencies, and build/deployment workflows
are in scope. An exposed credential must be revoked or rotated by its owner; deleting it from the
working tree or Git history does not invalidate it. Never include credential values in a report.

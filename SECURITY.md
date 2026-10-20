# Security Policy

## Supported Versions

Only the latest stable version of BookShop receives security updates.

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Please report security issues privately instead of opening a public issue.

Include:

- A description of the vulnerability
- Steps to reproduce it
- The affected endpoint, page, or component
- Potential impact
- Any proof-of-concept code or screenshots

Do not include real passwords, access tokens, or customer data.

## Response Process

- Initial acknowledgement: within 48 hours
- Assessment and remediation plan: within 7 business days
- Patch release: based on severity

You will be notified when a fix is available. Credit can be included in the advisory on request.

## Security Practices

- Keep `.env` files and production credentials out of version control.
- Rotate JWT, database, email, OAuth, and storage credentials if they are exposed.
- Use HTTPS in production.
- Restrict `CORS_ORIGIN` to the deployed frontend origin.
- Keep `ADMIN_EMAILS` limited to trusted accounts.
- Run dependency updates and security audits regularly.

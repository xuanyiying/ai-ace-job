# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of our software very seriously. If you have found a security vulnerability in the IntervAI, we encourage you to let us know right away. We will investigate all legitimate reports and do our best to quickly fix the problem.

### How to Report

Please do not report security vulnerabilities through public GitHub issues.

Instead, please report them via email to [INSERT SECURITY EMAIL].

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### Disclosure Policy

1. **Initial Report**: Please provide a detailed description of the vulnerability, including steps to reproduce it.
2. **Assessment**: We will assess the vulnerability and determine its impact.
3. **Fix**: We will work on a fix for the vulnerability.
4. **Disclosure**: Once the fix is released, we will publicly disclose the vulnerability.

We ask that you please give us a reasonable amount of time to fix the vulnerability before publicly disclosing it.

## Security Best Practices

When deploying this application in production, please ensure you follow these security best practices:

- Change all default passwords and secrets
- Use strong, unique passwords for all services (DB, Redis, etc.)
- Enable HTTPS/SSL for all public-facing endpoints
- Configure proper firewall rules
- Keep all dependencies up to date
- Monitor logs for suspicious activity

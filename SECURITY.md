# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: Yes |
| < 1.0   | :x: No                |

### How to Report a Vulnerability

**Please DO NOT create a public issue for security vulnerabilities.**

Instead:

1. **Send an email** to: **fox8911@gmail.com**
2. In the subject line, specify: `[SECURITY] Brief description of the vulnerability`
3. In the email, describe:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggestions for fixing (if any)

### What to Expect

- We will confirm receipt of the report
- We will keep you informed of the fix process
- After fixing, we will publish information about the vulnerability (if appropriate)

### Recognition

We value responsible disclosure. If you wish, we can mention you in the acknowledgments for helping ensure the project's security.

## Underlator Security Principles

Underlator is designed with privacy and security in mind:

- ✅ **Local LLMs only** - all processing happens on your computer
- ✅ **Local storage** - all data is stored only on your device
- ✅ **No internet required** - the application works completely autonomously (The Internet is only needed to get a list of models.)
- ✅ **No external requests** - your documents and messages never leave your computer
- ✅ **Open Source** - all code is open for security audit

## Known Limitations

- The application automatically checks if Ollama is running and, if not, installs and launches it automatically. Ollama is required to work with LLM models
- Some features may require significant system resources depending on the model used
- External requests are made only to the public API to retrieve the list of available models. No user data is sent in these requests

## Security Updates

All critical security updates will be published in [Releases](https://github.com/sengeer/underlator/releases) with the `[SECURITY]` label.

We recommend always using the latest version of the application for maximum security.

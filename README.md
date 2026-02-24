# Rocky Email Tool

Simple IMAP/SMTP email client for Node.js. Built for OpenClaw agent integration.

## Features

- Read unread emails via IMAP
- Send emails via SMTP
- GitHub-style credential management (auth-profiles.json)
- Designed for sandboxed execution

## Installation

```bash
npm install
```

## Configuration

Add to your `auth-profiles.json`:

```json
{
  "gmail:rockybot": {
    "provider": "gmail",
    "type": "password",
    "user": "your-email@gmail.com",
    "pass": "your-app-password"
  }
}
```

Requires Gmail App Password (not your regular password).

## Usage

```bash
# Check unread emails (default: 5)
node email.js check [limit]

# Send email
node email.js send <to> <subject> <text>
```

## Security

- OAuth/App Password support
- Credentials never hardcoded
- Designed for containerized/sandboxed execution

## License

MIT

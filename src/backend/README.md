# CenLearn Backend

Rust backend built with Axum and SQLite.

## Setup

1. Install Rust from `https://rustup.rs/`.
2. Copy `.env.example` to `.env`.
3. Fill in the required variables:

```env
DATABASE_URL=sqlite:cenlearn.db?mode=rwc
FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET=replace_with_at_least_32_random_characters
GEMINI_API_KEY=your_gemini_key_here

AZURE_CLIENT_ID=your_app_client_id
AZURE_CLIENT_SECRET=your_app_client_secret
AZURE_TENANT_ID=your_tenant_id
AZURE_REDIRECT_URI=http://localhost:3000/auth/callback

# Optional
AZURE_ALLOWED_EMAIL_DOMAIN=school.edu
SECURE_COOKIES=false
```

4. In Azure App Registration, add:
   - Redirect URI: `http://localhost:3000/auth/callback`
   - Delegated permissions: `openid`, `profile`, `email`, `User.Read`
5. Run the backend:

```bash
cargo run
```

The backend starts on `http://localhost:3000` and runs migrations automatically.

## Notes

- `JWT_SECRET` should be 32+ random characters.
- `SECURE_COOKIES=false` is only for local HTTP development.
- Content, resources, files, stats, and audit logs are scoped to the signed-in user.

## Testing

```bash
cargo check
cargo test
```

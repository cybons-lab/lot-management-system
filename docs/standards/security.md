# Security Standards

## Authentication & Authorization

### JWT Token Management

**Configuration:**
- Access Token: 1 hour expiry (STRICT)
- Refresh Token: 7 days, httpOnly cookie
- Algorithm: HS256
- Secret: Min 32 chars, random generated

**Implementation:**
```python
@router.post("/token")
async def login(credentials: OAuth2PasswordRequestForm):
    user = authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="認証に失敗しました")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}
```

**Forbidden:**
- Storing tokens in localStorage (XSS vulnerability)
- Tokens without expiration

### Role-Based Access Control

```
admin > manager > operator > viewer
```

| Role | Permissions |
|------|-------------|
| admin | Full access, user management |
| manager | Read/write, no user management |
| operator | Read/write operational data |
| viewer | Read-only |

### Password Policy

- Minimum: 12 characters
- Complexity: 3 of 4 (upper, lower, digit, special)
- Hashing: bcrypt, 12+ rounds

---

## Data Protection

### Sensitive Data Handling

| Level | Examples | Protection |
|-------|----------|------------|
| Critical | Passwords, tokens | Never log, bcrypt/encrypt |
| High | Email, phone | Mask in logs |
| Medium | Orders, inventory | Access control |

### Logging Rules

```python
# ✅ Allowed (masked)
logger.info("User created", extra={"email": "u***@example.com"})

# ❌ Forbidden
logger.error(f"Login failed for {password}")  # Never log passwords
logger.debug(f"Token: {access_token}")        # Never log tokens
```

---

## API Security

### Input Validation (Pydantic)

```python
class ProductCreate(BaseModel):
    product_code: constr(min_length=3, max_length=50, pattern=r'^[A-Z0-9-]+$')
    product_name: constr(min_length=1, max_length=200)
    unit_price: Decimal = Field(ge=0, le=9999999.99)
```

### Rate Limiting

- Authentication: 5 requests/minute per IP
- Mutations: 100 requests/hour per user
- Queries: 1000 requests/hour per user

### CORS Configuration

```python
origins = ["https://yourdomain.com"]
if settings.ENVIRONMENT == "development":
    origins.append("http://localhost:5173")

# NEVER use ["*"] in production
```

---

## Security Checklist

Before production:
- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] JWT tokens have expiration
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS enforced
- [ ] CORS with explicit origins
- [ ] No sensitive data in logs
- [ ] Input validation on all endpoints

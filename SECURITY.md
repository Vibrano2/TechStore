# Security

## Security Objectives
Protect:
- Customer accounts
- Personal data
- Orders
- Payments
- Admin functions
- Inventory
- Business data

## Baseline Controls
- HTTPS only
- Secure cookies
- CSRF protection
- XSS prevention
- SQL injection prevention
- Content Security Policy where practical
- Rate limiting
- Secure password hashing
- MFA for admin users
- Role-based permissions
- Audit logging
- Dependency scanning
- Automated backups

## Authentication
- Strong password policy
- Email verification
- Password reset tokens must expire
- Session invalidation after sensitive changes
- Optional customer MFA later
- Mandatory admin MFA

## Authorization
Roles:
- Customer
- Support
- Catalogue Manager
- Operations
- Finance
- Admin

Apply least privilege.

## Payments
- Never store CVV
- Avoid storing raw PAN
- Use payment provider tokenization
- Verify webhook signatures
- Make payment endpoints idempotent

## Personal Data
Follow GDPR principles:
- Data minimization
- Purpose limitation
- Consent where required
- Retention controls
- Access requests
- Deletion requests where legally applicable
- Data export

## Admin
- MFA required
- Sensitive actions logged
- Protect account changes
- Avoid shared admin accounts

## API
- Validate all inputs
- Rate limit public endpoints
- Use pagination
- Prevent mass assignment
- Enforce object-level authorization
- Never trust client-calculated totals

## File Uploads
- Restrict MIME types
- Restrict file size
- Rename uploaded files
- Scan where appropriate
- Store outside application source tree

## Secrets
Use environment variables or secret managers.

Never commit:
- API keys
- Database passwords
- Private keys
- Payment secrets
- SMTP credentials

## Security Testing
Include:
- Auth tests
- Permission tests
- Input validation tests
- Payment webhook tests
- Rate-limit tests
- Dependency checks

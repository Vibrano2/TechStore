# Code Style

## General
- Prefer clarity over cleverness.
- Keep functions focused.
- Use meaningful names.
- Avoid dead code.
- Avoid duplicated business logic.
- Add comments only where they explain intent or non-obvious behavior.

## TypeScript
- Use strict mode.
- Avoid `any`.
- Prefer explicit domain types.
- Use named exports for reusable modules.
- Keep UI components presentational where practical.

## React / Next.js
- Prefer server components where appropriate.
- Use client components only when interactivity requires them.
- Keep data fetching close to the server boundary.
- Avoid unnecessary global state.
- Build reusable product, price, badge and form components.

## Python / Django
- Follow PEP 8.
- Use type hints for service-layer code.
- Keep views thin.
- Put business logic in services/domain modules.
- Use serializers/forms for validation.
- Use database transactions for multi-step critical operations.

## Naming
### TypeScript
- Components: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE when truly constant

### Python
- Classes: PascalCase
- Functions: snake_case
- Constants: UPPER_SNAKE_CASE

## Money
Never use floating-point arithmetic for prices.

Use decimal-safe values.

## Dates
Store timestamps in UTC.
Render in user locale.

## Error Handling
- Show user-safe messages
- Log technical context server-side
- Never expose stack traces in production

## Imports
Group:
1. Standard library
2. Third-party
3. Internal modules

## Formatting
Use automated formatting and linting in CI.

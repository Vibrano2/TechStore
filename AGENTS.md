# Agents

## Purpose
Instructions for AI coding agents working on this project.

## General Rules
- Do not create a README.md unless explicitly requested.
- Follow the PRD as the product source of truth.
- Follow DESIGN_SYSTEM.md for all visual work.
- Follow ARCHITECTURE.md for structural decisions.
- Follow SECURITY.md for security-sensitive changes.
- Follow CODE_STYLE.md for implementation style.
- Follow TESTING.md before marking work complete.

## Product Rules
- Market is Germany.
- Primary UI language is German.
- Secondary language is English.
- Currency is EUR.
- Do not use FCFA or West African payment methods in this project.
- Do not present unverified e-mobility products as road legal in Germany.
- Do not invent warranties, delivery times or certifications.

## Development Rules
- Reuse existing components before creating duplicates.
- Prefer typed interfaces.
- Keep components small and composable.
- Do not hardcode secrets.
- Do not commit credentials.
- Keep business logic out of visual components.
- Use server-side validation for critical operations.

## UI Rules
- Maintain the approved navy, blue and neutral design system.
- Keep layouts clean and premium.
- Ensure mobile responsiveness.
- Do not introduce purple.
- Avoid unnecessary animations.
- Use consistent iconography.

## Data Rules
- Treat product specifications as structured data.
- Use stable IDs for entities.
- Preserve currency precision.
- Use decimal-safe calculations for money.

## Completion Standard
Before completing a task:
1. Build
2. Lint
3. Type-check
4. Test
5. Verify responsive UI
6. Verify accessibility basics
7. Confirm no secrets were introduced

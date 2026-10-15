# Testing

## Goal
Ensure the store is reliable before production release.

## Test Layers
- Unit tests
- Integration tests
- API tests
- Component tests
- End-to-end tests
- Accessibility checks
- Security tests
- Performance tests

## Critical User Flows
Must be covered end-to-end:
1. Browse category
2. Search product
3. Filter products
4. Open product
5. Add to cart
6. Update quantity
7. Checkout as guest
8. Checkout as customer
9. Complete payment
10. Receive order confirmation
11. Track order
12. Request return
13. Submit warranty claim

## Payment Testing
Test:
- Successful payment
- Declined payment
- Cancelled payment
- Duplicate webhook
- Delayed webhook
- Refund
- Partial refund if supported

## Inventory Testing
Test:
- Add to cart with stock
- Prevent purchase above stock
- Concurrent purchase
- Reservation release after failed checkout
- Out-of-stock display

## Product Testing
Verify:
- Correct price
- Correct VAT
- Correct stock
- Correct images
- Correct specifications
- Correct category
- Correct SEO metadata

## E-Mobility Testing
Verify:
- Road-legal status is visible
- ABE field is visible where relevant
- Insurance requirement is visible
- Registration requirement is visible
- No unverified compliance claims

## Responsive Testing
Test at:
- 375px
- 430px
- 768px
- 1024px
- 1440px+

## Browser Testing
Minimum:
- Chrome
- Safari
- Firefox
- Edge

## Accessibility
Check:
- Keyboard navigation
- Focus states
- Labels
- Alt text
- Contrast
- Semantic headings
- Form errors

## Performance
Monitor:
- Largest Contentful Paint
- Interaction to Next Paint
- Cumulative Layout Shift
- API latency
- Product image weight

## Release Gate
A release should not ship if:
- Checkout is broken
- Payment verification fails
- Critical security tests fail
- Inventory can oversell
- Order totals are incorrect
- Customer data leaks between accounts

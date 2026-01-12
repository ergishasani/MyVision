# Testing Guide

## Backend Testing

### Setup
1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up test database:
   - Create a separate test database
   - Set `TEST_DATABASE_URL` in `.env.test`

3. Run tests:
```bash
npm test
```

### Test Structure
- Unit tests for utilities (`src/__tests__/utils/`)
- Integration tests for routes (`src/__tests__/routes/`)
- Validation tests (`src/__tests__/validators/`)

### Test Coverage
- Password hashing and comparison
- Document calculations (totals, VAT)
- Document number generation
- SVG rendering
- Input validation

## Frontend Testing

### Setup
1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run tests:
```bash
npm test
```

### Test Structure
- Component tests (`src/__tests__/components/`)
- Page tests (`src/__tests__/pages/`)
- Utility tests (`src/__tests__/utils/`)

### Test Coverage
- Component rendering
- User interactions
- Form validation
- Route protection

## Manual Testing Checklist

### Authentication
- [ ] User can sign up
- [ ] User can log in
- [ ] User can log out
- [ ] Protected routes redirect to login
- [ ] JWT tokens are stored correctly

### Document Management
- [ ] Create document with basic info
- [ ] Create document with windows
- [ ] Create document with doors
- [ ] Create document with shutters
- [ ] Create document with line items
- [ ] Edit document
- [ ] Delete document
- [ ] View document
- [ ] Download PDF
- [ ] Send document via email

### Client Management
- [ ] Add client
- [ ] Edit client
- [ ] Delete client
- [ ] Search clients
- [ ] View client documents

### Dashboard
- [ ] Revenue calculations are correct
- [ ] Unpaid invoices are displayed
- [ ] VAT exposure is calculated
- [ ] Recent documents are shown
- [ ] Period filtering works

### SVG Rendering
- [ ] Windows render correctly
- [ ] Doors render correctly
- [ ] Shutters render correctly
- [ ] Live preview updates
- [ ] Different types render appropriately

### PDF Generation
- [ ] PDF includes all document data
- [ ] PDF includes line items
- [ ] PDF includes technical specs
- [ ] PDF has correct totals
- [ ] PDF is downloadable

### Email
- [ ] Email sends successfully
- [ ] PDF attachment is included
- [ ] Email template is correct
- [ ] Public viewing link works
- [ ] Audit log is created

### Subscription
- [ ] Plans are displayed
- [ ] Checkout session is created
- [ ] Trial period is set correctly
- [ ] Subscription status updates
- [ ] Billing portal works

## Edge Cases to Test

### Document Creation
- Empty line items
- Zero quantities
- Negative prices (should be rejected)
- Very large numbers
- Special characters in descriptions
- Missing required fields

### Calculations
- Zero VAT rate
- 100% VAT rate
- Very large amounts
- Decimal precision
- Multiple currencies

### SVG Rendering
- Zero dimensions
- Very large dimensions
- Missing optional fields
- Invalid types

### Authentication
- Expired tokens
- Invalid tokens
- Missing tokens
- Concurrent requests

## Performance Testing

- [ ] Document list loads quickly (< 1s)
- [ ] PDF generation completes (< 5s)
- [ ] SVG rendering is fast (< 500ms)
- [ ] Dashboard loads quickly (< 1s)
- [ ] Search is responsive

## Security Testing

- [ ] Users can only access their own data
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized
- [ ] CSRF protection is in place
- [ ] Passwords are hashed
- [ ] JWT tokens are secure

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

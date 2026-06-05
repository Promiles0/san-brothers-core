# Contributing to San Brothers

Thank you for your interest in contributing to the San Brothers project! This document provides guidelines and instructions for contributing code, documentation, and other improvements.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, professional, and constructive in all interactions.

## Getting Started

### 1. Fork and Clone the Repository

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/san-brothers-core.git
cd san-brothers-core

# Add upstream remote
git remote add upstream https://github.com/Promiles0/san-brothers-core.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
bun install

# Create a .env.local file with required variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 3. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

## Development Workflow

### Code Style and Standards

#### TypeScript

- Use strict mode: `strict: true` in `tsconfig.json`
- Always provide explicit type annotations for function parameters and return types
- Avoid `any` types; use `unknown` and type guards instead
- Use interfaces for object shapes, types for unions and primitives

```typescript
// Good
interface User {
  id: string;
  email: string;
  role: "admin" | "user";
}

function getUser(id: string): Promise<User | null> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

#### React Components

- Use functional components with hooks
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Use proper prop typing with TypeScript interfaces

```typescript
// Good
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}

export function Button({ onClick, children, variant = "primary" }: ButtonProps) {
  return (
    <button onClick={onClick} className={`btn btn-${variant}`}>
      {children}
    </button>
  );
}

// Avoid
export function Button(props: any) {
  return <button {...props}>{props.children}</button>;
}
```

#### Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`, `DashboardLayout.tsx`)
- **Functions/Variables**: camelCase (e.g., `getUserData()`, `isAuthenticated`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `API_TIMEOUT`)
- **Files**: kebab-case for utilities (e.g., `error-handler.ts`), PascalCase for components
- **Routes**: kebab-case (e.g., `dashboard.tsx`, `admin.settings.tsx`)

#### Styling

- Use TailwindCSS utility classes for styling
- Avoid inline styles
- Use CSS custom properties for theme values
- Keep custom CSS minimal; prefer Tailwind utilities

```typescript
// Good
<div className="flex items-center justify-between gap-4 rounded-lg bg-card p-4">
  <h2 className="text-lg font-semibold text-foreground">Title</h2>
  <button className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
    Action
  </button>
</div>

// Avoid
<div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
  <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Title</h2>
  <button style={{ backgroundColor: '#3b82f6', color: 'white' }}>Action</button>
</div>
```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit messages.

**Format**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, or tooling changes

**Scope** (optional): The area of the codebase affected (e.g., `auth`, `dashboard`, `payments`)

**Subject**: Clear, concise description in imperative mood (use "add" not "added")

**Examples**:
```
feat(auth): add two-factor authentication

fix(dashboard): resolve payment calculation bug

docs(readme): update setup instructions

refactor(components): simplify button component logic

perf(routes): implement lazy loading for dashboard routes
```

### Testing

Before submitting a pull request, ensure your code is well-tested:

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Check test coverage
bun run test:coverage
```

### Linting and Formatting

Maintain code quality with linting and formatting:

```bash
# Check for linting issues
bun run lint

# Fix linting issues automatically
bun run lint --fix

# Format code
bun run format

# Check formatting without making changes
bun run format --check
```

## Pull Request Process

### Before Submitting

1. **Update your branch** with the latest changes from `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks** locally:
   ```bash
   bun run lint
   bun run format --check
   bun run test
   bun run build
   ```

3. **Commit your changes** with meaningful messages:
   ```bash
   git add .
   git commit -m "feat(feature-name): description of changes"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

### Creating the Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill in the PR template with:
   - **Title**: Clear, descriptive title following commit convention
   - **Description**: Explain what changes you made and why
   - **Related Issues**: Link to any related issues (e.g., "Closes #123")
   - **Type of Change**: Mark the relevant type (feature, bugfix, documentation, etc.)

### PR Template Example

```markdown
## Description
Brief description of the changes and their purpose.

## Related Issues
Closes #123

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Performance improvement

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
Describe how you tested these changes.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [x] My code follows the style guidelines
- [x] I have performed a self-review
- [x] I have commented complex logic
- [x] I have updated documentation
- [x] My changes generate no new warnings
- [x] I have added tests for new features
- [x] All tests pass locally
```

### Review Process

1. **Automated Checks**: GitHub Actions will run linting, tests, and build checks
2. **Code Review**: Maintainers will review your code for quality, security, and alignment with project goals
3. **Feedback**: Address any feedback or requested changes
4. **Approval**: Once approved, your PR will be merged

## Reporting Issues

### Bug Reports

When reporting a bug, include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: Exact steps to reproduce the problem
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, browser, Node/Bun version
- **Screenshots**: If applicable

### Feature Requests

When requesting a feature, include:
- **Description**: Clear description of the desired feature
- **Use Case**: Why this feature is needed
- **Proposed Solution**: How you envision the feature working
- **Alternatives**: Any alternative approaches

## Documentation

Good documentation is crucial for project success. When contributing:

1. **Update README.md** if your changes affect setup, usage, or architecture
2. **Add inline comments** for complex logic or non-obvious implementations
3. **Update type definitions** with JSDoc comments for public APIs
4. **Create/update guides** in the `docs/` folder for significant features

### Documentation Example

```typescript
/**
 * Fetches user data from the database.
 * 
 * @param userId - The unique identifier of the user
 * @returns A promise that resolves to the user object, or null if not found
 * @throws Error if the database query fails
 * 
 * @example
 * const user = await getUser("user-123");
 * if (user) {
 *   console.log(user.email);
 * }
 */
export async function getUser(userId: string): Promise<User | null> {
  // Implementation
}
```

## Performance Guidelines

When contributing code, keep performance in mind:

- **Avoid unnecessary re-renders**: Use `React.memo`, `useMemo`, and `useCallback` appropriately
- **Optimize bundle size**: Avoid importing large libraries; consider alternatives
- **Lazy load components**: Use `React.lazy` for route components
- **Minimize API calls**: Implement caching and request deduplication
- **Use efficient data structures**: Choose appropriate data structures for your use case

## Security Guidelines

Security is a top priority. When contributing:

- **Never commit secrets**: Use environment variables for sensitive data
- **Validate inputs**: Always validate user inputs on both client and server
- **Sanitize outputs**: Prevent XSS attacks by properly escaping output
- **Use HTTPS**: All API calls should use HTTPS
- **Follow least privilege**: Only request necessary permissions and data
- **Report vulnerabilities responsibly**: Email security concerns to the maintainers privately

## Getting Help

If you need help or have questions:

1. **Check existing documentation**: Review README.md and docs folder
2. **Search issues**: Look for similar issues or discussions
3. **Ask in discussions**: Use GitHub Discussions for questions
4. **Contact maintainers**: Reach out to sanbrothersgroup@gmail.com for urgent matters

## Recognition

Contributors will be recognized in:
- The project's CONTRIBUTORS.md file
- Release notes for significant contributions
- GitHub's contributor graph

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (proprietary).

Thank you for contributing to San Brothers!

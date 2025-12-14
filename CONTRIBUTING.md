# Contributing Guide

Thank you for your interest in the Underlator project! We're excited that you want to contribute.

## How to Contribute

### Reporting Bugs

If you found a bug:

1. Check if it has already been reported in [Issues](https://github.com/sengeer/underlator/issues)
2. If the bug hasn't been reported, create a new issue with a detailed description:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Application version and operating system
   - Screenshots (if applicable)

### Suggesting New Features

We welcome suggestions for improvements:

1. Check if something similar has already been suggested
2. Create an issue describing:
   - The problem the feature would solve
   - Proposed solution
   - Alternative approaches (if any)

### Pull Requests

1. **Fork the repository** and create a branch for your feature (`git checkout -b feature/amazing-feature`)

2. **Follow code standards**:
   - New code should work in minimal time according to big-O notation
   - In this project, we follow SOLID principles. For React (front-end), SOLID principles are implemented through functional programming: pure functions, composition, algebraic types, HOF, currying, and partial application. For Electron (back-end), SOLID principles are followed through classes
   - For React (front-end), follow the Feature-Sliced Design (FSD) architectural methodology and strictly adhere to its rules
   - For Electron (back-end), follow the Service Layer Pattern architectural pattern
   - Added code should be testable and maintainable

3. **Commit your changes** following the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification:
   ```bash
   git commit -m "feat: add amazing feature"
   ```

   The project uses Conventional Commits standard. Commit messages should follow the format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `style:` for code style changes
   - `refactor:` for code refactoring
   - `perf:` for performance improvements
   - `test:` for adding or updating tests
   - `chore:` for maintenance tasks

   Example: `feat(chat): add message history persistence`

4. **Push your changes** to your fork:
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Create a Pull Request** with a detailed description of your changes

### Review Process

All Pull Requests go through code review. Please:

- Respond to reviewers' comments
- Make necessary changes
- Be patient - review may take time

### License

By contributing to the project, you agree that your contribution will be licensed under the same license as the project (BSD-3-Clause + Branding).

## Questions?

If you have questions, create an issue with the `question` label.

Thank you for your contribution! 🎉

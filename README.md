# Project Health Monitor Dashboard

A comprehensive dashboard for monitoring project health metrics, integrating GitLab, Flowlu, and Clockify services.

## Features

- **Release Tracking**

  - Track features and bugs per release
  - Compare releases to identify changes
  - Monitor development and QA time

- **Task Management**

  - Track task progress and completion
  - Monitor task estimates vs. actual time
  - Identify overdue tasks

- **Bug Tracking**

  - Monitor bug counts and severity
  - Track bug resolution times
  - Identify critical issues

- **Time Tracking**
  - Integration with Clockify for time tracking
  - Monitor development and QA time
  - Track task completion times

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- GitLab account with API access
- Flowlu account with API access
- Clockify account with API access

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/project-health-monitor

# GitLab Configuration
GITLAB_URL=https://gitlab.com/api/v4
GITLAB_PROJECT_ID=your-project-id
GITLAB_PRIVATE_TOKEN=your-private-token

# Flowlu Configuration
FLOWLU_API_KEY=your-api-key
FLOWLU_API_URL=https://aveosoftware.flowlu.com/api/v1/module

# Clockify Configuration
CLOCKIFY_API_KEY=your-api-key
CLOCKIFY_WORKSPACE_ID=your-workspace-id
CLOCKIFY_API_URL=https://api.clockify.me/api/v1
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/project-health-monitor.git
cd project-health-monitor
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
npm start
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running. It provides detailed information about all available endpoints and their usage.

### Available Endpoints

- `GET /api/dashboard/metrics` - Get comprehensive dashboard metrics
- `GET /api/dashboard/release-metrics` - Get release-specific metrics
- `GET /api/dashboard/task-metrics` - Get task-related metrics
- `GET /api/dashboard/bug-metrics` - Get bug-related metrics

## Development

### Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
├── app.ts           # Express application
└── server.ts        # Server entry point
```

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

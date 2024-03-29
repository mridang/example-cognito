# Birdlittle for GitHub

Birdlittle is a deployment gate for GitHub Enterprise that
blocks deploying changes to production if canaries have not passed.

I call it Birdlittle since it was the only name available. There's
a bird in the logo—that should suffice. 😉

Birdlittle is a low-overhead app.

### Installation

For details about the installation process, see the installation guide.
This guide also outlines the reasoning for the necessary scopes.

### Usage

For details about the usage and associated gotchas, see the installation
guide.

## Table of Contents

- [Architecture](#architecture)
- [Developing](#developing)
- [Contributing](#contributing)
- [License](#license)

## Architecture

The app is a NestJS application deployed on AWS Lambda and fronted by
CloudFront. All SSL certificates are managed automatically via Certificate
Manager (using DNS validation).

To manage the lock and unlock schedules, EventBridge Scheduler is used
which in turn invokes the Lambda. All credentials are stored in
Secrets Manager.

The application uses X-Ray for tracing and Cloudwatch for logging.

The application is designed to be stateless and does not have any sort
of persistence—this includes all ephemeral persistence, e.g. caches.

<img src="https://github.com/mridang/birdlittle/assets/327432/e795eceb-a9a1-4ae7-af22-fca190fa8b48">

## Developing

The app is built with Typescript 5.3 using the NestJS and requires
Node 20 to run.

After checking out the repository, run `npm install` to install all
the required dependencies.

To develop the application, you must have a GitHub app of your own.
Instructions on how to create a GitHub app are outside the scope of this
readme, but you can find more information here
https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app

You must set up a GitHub app prior to proceeding as you will need certain
secrets from the app. When setting up the GitHub app, you will be
prompted to provide the webhook URL and the OAuth callback URL—
provide some sample values as these can only be supplied once the app has
been deployed.

### Configure the local environment

Configure the `.env` file with the necessary information. This file should be set up
with example values for a template, but you'll need to replace them with actual data
relevant to your application. Here’s a detailed breakdown of each variable:

- `APP_ID`: The unique identifier assigned to your application by GitHub. It's crucial
  for authenticating your app with the GitHub API.

- `CLIENT_ID`: Used during the OAuth process to initiate user authentication. It's
  sent to GitHub to receive an authorization code for access token exchange.

- `CLIENT_SECRET`: A sensitive key used alongside the authorization code to securely
  obtain an access token from GitHub, enabling user-specific data access.

- `WEBHOOK_SECRET`: Ensures the integrity and authenticity of received webhook payloads
  by validating the signature sent with each event.

- `PRIVATE_KEY`: Allows your app to authenticate directly with the GitHub API for
  actions or queries under the app's own identity.

- `SENTRY_DSN`: Directs errors and performance data to Sentry for monitoring, aiding in
  quick identification and resolution of issues.

> [!NOTE]
> It is fine to add sensitive information to this file as this file only
> serves as a template and Git has been configured to not track any
> changes this file using `git update-index --assume-unchanged .env`

---

### Configure the GitHub environment

To ensure the smooth operation of GitHub Actions within this project, it's
essential to configure certain environment variables and secrets. These settings
are crucial for various deployment tasks and integrating with external services
like AWS and Sentry.

You need to set the following environment variables in the GitHub repository
settings:

- `AWS_REGION`: The AWS region where your services are deployed, e.g., `us-east-1`.
- `SENTRY_ORG`: Your organization name in Sentry, e.g., `mridang`, required for Sentry release
  tracking after deployments.
- `SENTRY_PROJECT`: The name of your project in Sentry, e.g., `myapp`, required for Sentry release
  tracking after deployments.

These variables are used by GitHub Actions workflows to configure the deployment
environment correctly.

Additionally, you must configure the following secrets in your GitHub repository.
These secrets are sensitive and provide access to external services essential for
deployments and monitoring:

- `AWS_ACCESS_KEY_ID`: Your AWS access key ID, used by Serverless for deployments.
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key, used by Serverless for deployments.
- `SENTRY_AUTH_TOKEN`: A Sentry authentication token, required for Sentry release
  tracking after deployments.

Please treat these secrets with the utmost care and never expose them publicly.

> [!IMPORTANT]
> Deployments will not work correctly if these environment variables and secrets
> are not configured properly. Ensure that you've entered the correct values
> corresponding to your AWS and Sentry accounts to avoid any deployment issues.

---

### Linting the code

Lint the code using `npm run lint`. This command runs ESLint and
lints all the files. To automatically fix any fixable lint errors, run
`npm run lint:fix`.

> [!NOTE]
> GitHub Actions has been configured to automatically fix all fixable
> lint errors on every commit and commit the changes back to the branch.

### Formatting the code

Reformat the code using `npm run format`. This runs Prettier and
reformats all the code.

> [!NOTE]
> GitHub Actions has been configured to automatically reformat all the
> code on every commit and commit the changes back to the branch.

### Deploying the app

The application is automatically deployed when a push is made to the
default branch. You can manually trigger the deployment workflow if
you need to deploy the latest changes.

It is not recommended to deploy from your local machine but if needed,
it can be deployed using `npm run deploy`.

> [!IMPORTANT]
> You'll need to ensure that you have the AWS credentials configured. Read the
> guide on how to configure the variables https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html

If you need to package the application without deploying it use
`npm run package`. This is handy when you need to introspect the contents
of the ZIP artifact.

### Running tests

Run the test suite using `npm run test`. Most tests are designed to use
Localstack when possible. Jest automatically starts the containers defined
in `docker-compose.yml`.

> [!NOTE]
> If you run into any issues while running the tests locally, ensure that
> no other services are currently listening on the same ports used by the
> services defined in `docker-compose.yml`.
> Run `docker ps` to list all currently running containers. Any containers
> listening on the required ports should be stopped prior to running the
> test suite again.

> On GitHub, these can simply be configured as environment variables
> https://docs.github.com/en/actions/learn-github-actions/variables

If configured correctly, you should be able to run all the tests from
your IDE.

Jest has been configured to automatically collect coverage from tests,
and these can be found in the `.out` directory.

If you need to debug hanging tests, you can use `npm run test:debug`
which is handy when the test suite does not exit gracefully or hangs.

### Running the app

To run the application locally, you can simply run `npx nest start`
which starts the NestJS application for local usage.

> [!IMPORTANT]
> It is important to keep in mind that the way application runs locally
> is different from how it runs on Lambda. This is due to shortcomings
> in the Serverless framework that make emulating a Lambda environment
> hard.

Assuming that you have followed the instructions and configured
everything correctly, you should be able to go to
`http://localhost:3000/health` to see a health-check page that
reads "OK". If you've managed to get here, it indicates that the
application has been able to correctly initialize itself.

## Contributing

If you have suggestions for how this app could be improved, or
want to report a bug, open an issue - we'd love all and any
contributions.

## License

Apache License 2.0 © 2024 Mridang Agarwalla

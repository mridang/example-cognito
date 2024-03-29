Birdlittle is a deployment gate for GitHub Enterprise that
blocks deploying changes to production if canaries have not passed.

I call it Birdlittle since it was the only name available. There's
a bird in the logo—that should suffice. 🐧

Birdlittle is a low-overhead app which once installed will prevent
deployments to production if the canaries have not passed.

For example, if you have two environments - staging and production, you can configure
a suite of Cypress tests to run against staging.
This means that any developer who promotes a staging release to production
will know that the sanity-checks have passed.

![](https://github.com/mridang/birdlittle/assets/327432/29a5eb2d-7306-40ef-8843-9520313dc456)

## Install

Go to the [Birdlittle](https://github.com/apps/birdlittle) page on
GitHub Marketplace and click the **Install** button. Select the account
for which you want to install the app and grant the necessary permissions.

#### Why do you need these permissions?

Railcross needs the following two permissions to function.

- "Read access to metadata and pull requests" is required for **all**
  GitHub apps and is in this case used for deducing the default branch
  of the repository.

![](https://github.com/mridang/railcross/assets/327432/273bb703-4725-40d0-8b7c-8cac55589991)

- " Read and write access to actions and deployments" is required to be
  able to listen for deployment notifications and trigger the canary workflow.
  It is also needed to fetch the workflow artifact.

Finally, choose the repositories where you want to install the app.

![](https://github.com/mridang/railcross/assets/327432/c4c4ecf8-40bc-4973-b9c4-ff84059d8518)

Once the app is installed, it is still dormant as you must configure a
production environment.

![](https://github.com/mridang/birdlittle/assets/327432/9207342b-6da4-463a-997d-82c09e5b2df1)

Inside the production environment, you must explicitly select "Birdlittl" as a
deployment protection gate for that environment.

![](https://github.com/mridang/birdlittle/assets/327432/91f1e1d9-6eb6-4065-b9cc-c3aa780a86d4)

You must also create a workflow in that repository named `cypress.yml` that
is structured like this.

```yaml
name: Run Canary

on: # Do not edit
  workflow_dispatch: # Do not edit
    inputs: # Do not edit
      release_identifier: # Do not edit
        description: 'Release identifier' # Do not edit
        required: true # Do not edit

defaults:
  run:
    working-directory: ./

jobs:
  run-canary:
    runs-on: ubuntu-latest

    steps:
      - name: Write inputs to file # Do not edit
        run: | # Do not edit
          echo "${{ github.event.inputs.release_identifier }}" > release.txt

      - name: Upload release identifier # Do not edit
        uses: actions/upload-artifact@v4 # Do not edit
        with: # Do not edit
          name: release # Do not edit
          path: release.txt # Do not edit

      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'

      - name: Cache node modules
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - name: Install Dependencies
        run: npm ci

      - name: Run Cypress Tests
        uses: cypress-io/github-action@v6
        with:
```

You may use that snippet as a template while ensuring that the lines marked
as no editable are left as such.

The workflow must have a workflow_dispatch trigger, so it can be triggered by
the app.

The workflow must save the value of the `release_identifier` parameter in a
file named `release.txt` and upload it as an artifact named `release`.
You can see a real example of this in this sample repository
https://github.com/mridang/testing/actions/workflows/cypress.yml

If you do not configure the workflow as such, the branch protection rule will
never pass.

What you do as a part of your canary is up to you. In the example above, the
canary is configured to run a suite of Cypress tests against the staging
environment.

If these canaries (or sanity checks) don't pass, the deployment protection
rule prevents the release from being promoted to production.

In the event that your workflow has flaked, and you wish to run it,
simply re-run the workflow, and Birdlittle will handle the result.

![](https://github.com/mridang/birdlittle/assets/327432/eb7f132f-aeb9-4feb-be4a-2dfea91cd50e)

## Gotchas

- The canary runs on whatever is deployed to staging and does not do any
  validation to ensure that the commit being deployed to production is the
  commit that is being tested against in staging.

- The app does not provide any notifications of any sort so it may be hard
  to figure to out why a deployment is marked as pending.

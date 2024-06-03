This is an example project to toy around with AWS Cognito.

Cognito just feels like a tier 2 offering and has rather cryptic documentation.
While it has been around for a few years, it is still as clunky to set up
as ever.

##### Caveats

**You can't change required attributes after you create a user pool.**
This means that if you've decided that every user must fill in their "gender",
you would need to recreate the entire user pool.
To circumvent this limitation, the user pool has enabled all fields but
marked them as not-required, barring the first name and last name.

Another gotcha is that **the MFA setting cannot be changed** at a later stage.
If you disable MFA, and later choose to enable it, you would need
to recreate the entire user pool.
The sample implementation makes the MFA setup optional.
Forcing users to sign in with their MFA, happens on the application side.
This is done by adding custom claim named `custom:mfa_enabled` to the JWT.

**The hosted UI provides rather limited customizability.**
The most notable limitation is lack of localisation.
A bit of digging around surfaced articles which had various approaches to
add localisation, but these had limited or no success.
If localisation is a priority, it is best that you rebuild the authentication
interface using Amplify's Authentication Components.

**There is no way to import users with their hashed passwords.** You can import
users, but they will need to confirm their email, set a new password and then
enable MFA all over again.
This makes migrating to Cognito a rather clumsy approach or an almost
prohibitive approach.

**A parent domain is required.** If you use auth.example.com as the domain
for the Hosted UI, the parent domain must have an `A` record that points
to something.
While this hasn't been an issue in this same project, it may become an
issue in larger deployments.
See https://stackoverflow.com/q/51249583/304151

**The link-based verifications don't work as expected**. When you use the
link-based verification, the email templates don't work as expected.
At a first glance it seems simple, but when you inject the `linkParameter`
variable in your email template, it often breaks as Cognito does some
buggy string replacement.
I've found examples where folks have attempted to avoid using that parameter
and instead rely on programmatically constructing the verification link, but
those don't seem to work as expected either.
https://dev.classmethod.jp/articles/cognito-user-pool-signup-customize/

To get around this, the same has switched over to using code-based
verifications.
It is a little clunkier than the link-based verification, but I can imagine
that it isn't a major blocker for adopting Cognito.

**There is no simple way to map users to tenants**. In a scenario where
one user may have access to multiple accounts, Cognito is rather unwieldy.
An initial look might suggest creating one group per account/tenant, but
there is a hard limit of 10,000 groups in Cognito.
This limitation mandates that you store the user to tenant/account mapping
in another system.

**There is no support for Disaster Recovery**. There is no way to back up
a Cognito Userpool.
In a worst case scenario, if the user pool were to be deleted, you are
dead in the water.
A way of circumventing this is to synchronize all data to a DynamoDB table
using Cognito Sync and periodically backing up that table.
In the event of a disaster, you will need to recreate the pool and import
all users again.
While this seems clunky, this should provide ample resilience, however,
users will need to set new passwords and enable MFA all over again.

**There is no support for password expiration policies** and there are
no workarounds either.

### Demo

To play around with Cognito, visit https://example-cognito.agarwal.la/ and
sign up.

The interface is rather awful, but it allows you to log in.

#### Domains.

There's a big gotcha with the domains. If you use auth.example.com then,
example.com must have an A record pointing to something.

https://stackoverflow.com/q/51249583/304151

#### Usernames

The usernames were case-sensitive and they have been made case-insensitive.

#### MFA

In order to configure MFA, there is a lambda that checks is the user has a
specific email address and then enables MFA.

This approach allows us to conditionally deduce who should have MFA.

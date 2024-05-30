This is an example project to toy around with AWS Cognito.

Cognito just feels like a tier 2 offering and has rather cryptic documentation.
While it has been around for a few years, it is still as clunky to set up
as ever.

You can't change required attributes after you create a user pool.

Mfa can't be changed,.

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

### Todo

- Enable WAF: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-waf.html
- TOTP-based MFA: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa-totp.html

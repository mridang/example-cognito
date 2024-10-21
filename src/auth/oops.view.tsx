import { FunctionalComponent, render } from '@mridang/nestjs-defaults';

const OopsView: FunctionalComponent = () => {
  return (
    <html lang="en">
      <head>
        <title>Oops!</title>
      </head>
      <body>
        <h1>You are not logged in!</h1>
        <a href="/login">Go to Login</a>
      </body>
    </html>
  );
};

export default () => render(<OopsView />);

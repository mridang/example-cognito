import { FunctionalComponent, render } from '@mridang/nestjs-defaults';

const IndexView: FunctionalComponent<{
  isLoggedIn: boolean;
  jwtData: string;
}> = ({ isLoggedIn, jwtData }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>JWT Info</title>
      </head>
      <body>
        {isLoggedIn ? (
          <>
            <p>JWT Decoded: {jwtData}</p>
            <a href="/logout">Logout</a>
          </>
        ) : (
          <>
            <p>No JWT found.</p>
            <a href="/login">Login</a>
          </>
        )}
      </body>
    </html>
  );
};

export default (isLoggedIn: boolean, jwtData: string) =>
  render(<IndexView isLoggedIn={isLoggedIn} jwtData={jwtData} />);

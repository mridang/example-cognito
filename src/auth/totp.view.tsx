import { FunctionalComponent, render } from '@mridang/nestjs-defaults';

const TotpView: FunctionalComponent<{ qrcode: string; message: string }> = ({
  qrcode,
  message,
}) => {
  return (
    <html lang="en">
      <head>
        <title>MFA Setup</title>
      </head>
      <body>
        {qrcode ? (
          <>
            <h1>Set Up MFA</h1>
            <img src={qrcode} alt="QR Code" />
            <form method="post" action="/totp/verify">
              <label htmlFor="code">
                Enter the code from your authenticator app:
              </label>
              <input name="code" type="text" required />
              <button type="submit">Verify</button>
            </form>
          </>
        ) : (
          <h1>{message}</h1>
        )}
      </body>
    </html>
  );
};

export default (qrcode: string, message: string) =>
  render(<TotpView qrcode={qrcode} message={message} />);

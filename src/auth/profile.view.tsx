import { FunctionalComponent, render } from '@mridang/nestjs-defaults';

const ProfileView: FunctionalComponent<{
  profileAttributes?: { Name: string; Value: string }[];
}> = ({ profileAttributes }) => {
  const attributes: { [key: string]: string } =
    profileAttributes?.reduce(
      (acc, { Name, Value }) => (Name ? { ...acc, [Name]: Value } : acc),
      {},
    ) || {};

  return (
    <html lang="en">
      <head>
        <title>Update Profile</title>
      </head>
      <body>
        <h1>Update Profile</h1>
        <form id="updateForm" method="post" action="/profile">
          <label htmlFor="given_name">First Name:</label>
          <input
            type="text"
            id="given_name"
            name="given_name"
            defaultValue={attributes['given_name'] || ''}
            required
          />
          <br />
          <br />

          <label htmlFor="family_name">Last Name:</label>
          <input
            type="text"
            id="family_name"
            name="family_name"
            defaultValue={attributes['family_name'] || ''}
            required
          />
          <br />
          <br />

          <input type="submit" value="Update" />
        </form>
      </body>
    </html>
  );
};

export default (profileAttributes: { Name: string; Value: string }[]) =>
  render(<ProfileView profileAttributes={profileAttributes} />);

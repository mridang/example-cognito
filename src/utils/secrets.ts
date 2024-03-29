import {
  GetSecretValueCommand,
  GetSecretValueResponse,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const decoder = new TextDecoder('utf8');

export default async function getSecret(
  name: string,
  client: SecretsManagerClient,
) {
  const command: GetSecretValueCommand = new GetSecretValueCommand({
    SecretId: name,
  });

  const data: GetSecretValueResponse = (await client.send(
    command,
  )) as GetSecretValueResponse;
  if (data.SecretString) {
    return data.SecretString;
  } else {
    if (data.SecretBinary) {
      const buff = decoder.decode(data.SecretBinary);
      return buff.toString();
    } else {
      throw new Error();
    }
  }
}

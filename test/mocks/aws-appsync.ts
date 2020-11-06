/**
 * 
 */
const mutateMock = jest.fn().mockImplementation(
  (data) => {
    console.log("mutating");
    return Promise.resolve({
      data: {
        disconnected: {
          id: data.variables.id,
          status: "offline"
        }
      }
    });
  }
);

enum AUTH_TYPE {
  AWS_IAM = "AWS_IAM"
}

export class AwsAppSyncClient {
  mutate = mutateMock
}

export default AwsAppSyncClient

export {
  AUTH_TYPE
}
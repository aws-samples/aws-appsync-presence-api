/**
 * 
 */
const mutateMock = jest.fn().mockImplementation(
  (data) => {
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

export class AppSyncClient {
  mutate = mutateMock
}

export default AppSyncClient

export {
  AUTH_TYPE
}
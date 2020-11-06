/**
 * 
 */
const putEventsMock = jest.fn().mockImplementation((event) => {
  const entries = (event.Entries || []).map(() => {EventId: 'xxx'});
  return {
    promise: jest.fn().mockReturnValue(Promise.resolve({
      Entries: entries,
      FailedEntryCount: 0
    }))
  };
});

export class EventBridge {
  putEvents = putEventsMock;
}

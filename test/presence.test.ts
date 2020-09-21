import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Presence from '../lib/presence-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Presence.PresenceStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});

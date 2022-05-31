import {App} from '@slack/bolt';
import {Actions, Header, Message, Option, Section, StaticSelect} from 'slack-block-builder';
import {createSectionBlocks} from './util/slack';
import { signingSecret, token, port } from './config';


const app = new App({
    signingSecret,
    token
});

// /test
// Tests.
app.command('/test', async ({command, ack, respond}) => {
    await ack();
    await respond(
        Message()
            .blocks([
                Header({text: 'Test.'}),
                Section({text: 'This is a test. Do not panic.'})
            ])
            .buildToObject()
    );
});

;(async () => {
    await app.start(port);
    console.log(`Started on port ${port}`);
})();

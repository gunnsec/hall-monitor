import {App} from '@slack/bolt';
import {Actions, Header, Input, Message, Modal, Option, Section, StaticSelect, TextInput} from 'slack-block-builder';
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
            .blocks(
                Header({text: 'Test.'}),
                Section({text: 'This is a test. Do not panic.'})
            )
            .buildToObject()
    );
});

app.command('/modaltest', async ({command, ack, client, payload}) => {
    await ack();
    const modal = Modal({title: 'This is a modal.', submit: 'Submit', callbackId: 'test-modal'})
        .blocks(
            Section({text: 'Please input your personal information so that your data may be harvested.'}),
            Input({label: 'Name', blockId: 'name-input'})
                .element(TextInput({actionId: 'name-action', placeholder: 'John Doe'}))
                .optional(false),
            Input({label: 'Email address', blockId: 'email-input'})
                .element(TextInput({actionId: 'email-action', placeholder: 'example@gmail.com'}))
                .optional(false),
            Input({label: 'Phone number', blockId: 'phone-input'})
                .element(TextInput({actionId: 'phone-action', placeholder: '(650)-000-0000'}))
                .optional(true)
        )
        .buildToObject();
    await client.views.open({trigger_id: payload.trigger_id, view: modal});
});

app.view('test-modal', async ({ack, view}) => {
    await ack();
    const name = view.state.values['name-input']['name-action'].value;
    const email = view.state.values['email-input']['email-action'].value;
    const phone = view.state.values['phone-input']['phone-action'].value;
    console.log(`Received: name=${name} email=${email} phone=${phone}`)
});

;(async () => {
    await app.start(port);
    console.log(`Started on port ${port}`);
})();

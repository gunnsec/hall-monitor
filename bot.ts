import {App, UsersSelectAction} from '@slack/bolt';
import {WebClient} from '@slack/web-api';
import {Actions, Header, Input, Message, Modal, Section, TextInput, UserSelect} from 'slack-block-builder';
import {getInfo} from './util/sheets';
import {capitalize, parseCellPhone} from './util/parsing';
import { signingSecret, token, port } from './config';


const app = new App({
    signingSecret,
    token
});

// /info
// Gets contact info for a given user, or yourself if no user was provided.
app.command('/info', async ({command, ack, client, respond}) => {
    await ack();
    let user = command.user_id;

    // TODO: consider abstracting argument parsing
    // I don't think this application needs a massive and somewhat scary pattern-based argParser like what RBot has,
    // but perhaps some abstraction would be nice.
    const args = command.text.match(/("(?:[^"\\]|\\.)*")|\S+/g);
    if (args?.length) {
        const id = args[0].match(/^<@(.+)\|\w+>$/)?.[1];
        if (!id) return respond('The provided argument was not a valid user.');
        user = id;
    }

    const message = await infoResponse(client, user);
    await respond(message);
});

app.action('info-select', async ({ack, payload, client, respond}) => {
    await ack();
    const user = (payload as UsersSelectAction).selected_user;
    const message = await infoResponse(client, user);
    await respond(message);
});

async function infoResponse(client: WebClient, id: string) {
    const res = await client.users.info({ token, user: id });
    if (!res.user?.real_name) return Message()
        .blocks(
            Header({text: 'There was an error fetching your name.'}),
            Section({text: 'If this issue persists, please message <@U03GQC0A9MJ>.'})
        )
        .buildToObject()

    const info = await getInfo(res.user.real_name);
    if (!info) return Message()
        .blocks(
            Header({text: `${res.user.real_name} was not found on the contacts spreadsheet.`}),
            Section({text: 'If this is a mistake, please message <@U03GQC0A9MJ>.'}),
            Actions().elements(
                UserSelect({actionId: 'info-select', placeholder: 'Select a user', initialUser: id})
            )
        )
        .buildToObject()

    const [lastName, firstName, position, email, cell, home] = info;
    const fields = [`*Email:*\n${email}`];
    if (cell) fields.push(`*Cell phone:*\n${parseCellPhone(cell)}`);
    if (home) fields.push(`*Home phone:*\n${parseCellPhone(home)}`);

    return Message()
        .blocks(
            Header({text: `Contact info for ${capitalize(firstName)} ${capitalize(lastName)} (${position})`}),
            Section().fields(fields),
            Actions().elements(
                UserSelect({actionId: 'info-select', placeholder: 'Select a user', initialUser: id})
            )
        )
        .buildToObject()
}

// /test
// Tests.
app.command('/test', async ({ack, respond}) => {
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

app.command('/modaltest', async ({ack, client, payload}) => {
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

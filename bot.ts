import {App, MessageShortcut, UsersSelectAction} from '@slack/bolt';
import {WebClient} from '@slack/web-api';
import {Actions, BlockCollection, Header, Input, Message, Modal, Option, Section, StaticSelect, TextInput, UserSelect} from 'slack-block-builder';

// Utilities
import {getInfo} from './util/sheets';
import {capitalize, parseCellPhone} from './util/parsing';
import { signingSecret, token, port } from './config';


const app = new App({
    signingSecret,
    token
});

// /info @[user]?
// Gets the contact info of a given user, or yourself if no user was provided.
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

app.shortcut('info-shortcut', async ({ack, payload, client, shortcut}) => {
    await ack();
    const user = (shortcut as MessageShortcut).message.user;
    if (!user) return;
    const modal = await infoModal(client, user);
    await client.views.open({trigger_id: payload.trigger_id, view: modal});
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

// TODO: this can probably be abstracted further with the function above;
// a common function might return only the block kit blocks passed to `.blocks(...)`,
// but because the message has a dropdown and the modal does not this wouldn't quite work.
async function infoModal(client: WebClient, id: string) {
    const res = await client.users.info({ token, user: id });
    if (!res.user?.real_name) return Modal({title: 'SEC contact info'})
        .blocks(
            Header({text: 'There was an error fetching your name.'}),
            Section({text: 'If this issue persists, please message <@U03GQC0A9MJ>.'})
        )
        .buildToObject()

    const info = await getInfo(res.user.real_name);
    if (!info) return Modal({title: 'SEC contact info'})
        .blocks(
            Header({text: `${res.user.real_name} was not found on the contacts spreadsheet.`}),
            Section({text: 'If this is a mistake, please message <@U03GQC0A9MJ>.'})
        )
        .buildToObject()

    const [lastName, firstName, position, email, cell, home] = info;
    const fields = [`*Email:*\n${email}`];
    if (cell) fields.push(`*Cell phone:*\n${parseCellPhone(cell)}`);
    if (home) fields.push(`*Home phone:*\n${parseCellPhone(home)}`);

    return Modal({title: 'SEC contact info'})
        .blocks(
            Header({text: `Contact info for ${capitalize(firstName)} ${capitalize(lastName)} (${position})`}),
            Section().fields(fields)
        )
        .buildToObject()
}

// /help
// Sends info about other commands.
app.command('/help', async ({ack, respond}) => {
    await ack();
    await respond(
        Message()
            .blocks(
                Header({text: 'Help — Commands'}),
                Section({text: 'This bot is open sourced on GitHub! View the source code <https://github.com/ky28059/hall-monitor|here>.'}),
                Section().fields(
                    '*/help*\nSends info about other commands.',
                    '*/info @[user]?*\nGets the contact info of a given user.'
                ),
                Section().fields(
                    '*/submit-feedback*\nSubmits feedback about the slack bot.'
                )
            )
            .buildToObject()
    );
});

// /submit-feedback
// Submits feedback about the slack bot.
app.command('/submit-feedback', async ({ack, client, payload}) => {
    await ack();

    const feedbackTypes = [
        Option({text: 'Feature suggestion', value: 'feature_suggestion'}),
        Option({text: 'Feature feedback', value: 'feature_feedback'}),
        Option({text: 'Bug report', value: 'bug_report'})
    ];

    const modal = Modal({title: 'SEC Slack Bot Feedback', submit: 'Submit', callbackId: 'feedback-modal'})
        .blocks(
            Section({text: 'Please select what type of feedback to give, what feature your feedback concerns, and a brief description of your suggestion.'}),
            Input({label: 'Feedback type', blockId: 'type-select'})
                .element(StaticSelect({actionId: 'type-action', placeholder: 'Select a feedback type'})
                    .options(feedbackTypes)
                    .initialOption(feedbackTypes[0]))
                .optional(false),
            Input({label: 'Feature name', blockId: 'name-input'})
                .element(TextInput({actionId: 'name-action', placeholder: 'The feature your feedback concerns.'}))
                .optional(false),
            Input({label: 'Feedback description', blockId: 'desc-input'})
                .element(TextInput({actionId: 'desc-action', placeholder: 'A brief description of your feedback.'})
                    .multiline(true))
                .optional(false)
        )
        .buildToObject();
    await client.views.open({trigger_id: payload.trigger_id, view: modal});
});

app.view('feedback-modal', async ({ack, client, body, view}) => {
    // Update feedback modal with close message
    await ack({
        response_action: 'update',
        view: Modal({title: 'SEC Slack Bot Feedback'})
            .blocks(
                Header({text: 'Your feedback was successfully submitted.'}),
                Section({text: 'This modal can be safely closed. Have a nice day!'})
            )
            .buildToObject()
    });

    // Log feedback with relevant persons
    const type = view.state.values['type-select']['type-action'].selected_option?.value;
    const name = view.state.values['name-input']['name-action'].value;
    const desc = view.state.values['desc-input']['desc-action'].value;

    const users = ['U03GQC0A9MJ', 'U03GFNM1XA6']; // Kevin Yu, Ethan Liang
    const res = await client.conversations.open({users: users.join(',')});
    if (!res.ok || !res.channel?.id) return;

    const blocks = BlockCollection(
        Header({text: `${body.user.name} submitted a new ${type}`}),
        Section({text: `*Name:* ${name}`}),
        Section({text: `*Desc:* ${desc}`})
    );

    await client.chat.postMessage({
        channel: res.channel.id,
        blocks,
        text: `${body.user.name} submitted a new ${type}`
    });
});

;(async () => {
    await app.start(port);
    console.log(`Started on port ${port}`);
})();

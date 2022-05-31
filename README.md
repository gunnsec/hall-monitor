# hall monitor
Slack bot for Official SEC Business.

To run locally, create a `config.ts` in the root directory which exports your slack signing secret, bot user token, and port:
```ts
// config.ts
export const signingSecret = 'legitimate-slack-signing-secret';
export const token = 'xoxb-also-legitimate-slack-token';
export const port = 3000;
```
Install dependencies with `npm install` and run `npm start` to run the bot.

### Slack
When creating the Slack application, note that boltjs requires that all URLs are appended with `/slack/events`. If your
server is running at `13.00.255.255` on port `3000`, set the event subscription URL and request URL for all created slash 
commands to be `http://13.00.255.255:3000/slack/events`.

Guava bot requires the following scopes:
- `commands` to add and receive slash command interactions
- `chat:write` to send messages
- `users:read` to extract `user.real_name` from `command.user_id`

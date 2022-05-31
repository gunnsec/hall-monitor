import {App, StaticSelectAction} from '@slack/bolt';
import {Actions, Header, Message, Option, Section, StaticSelect} from 'slack-block-builder';
import {createSectionBlocks} from './util/slack';
import { signingSecret, token, port } from './config';


const app = new App({
    signingSecret,
    token
});

;(async () => {
    await app.start(port);
    console.log(`Started on port ${port}`);
})();

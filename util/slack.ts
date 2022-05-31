import {Section, SectionBuilder} from 'slack-block-builder';


// Creates an array of Block Kit section blocks from an object array by grouping elements into pairs
type Block = {title: string, desc: string};
export function createSectionBlocks(blocks: Block[]) {
    const sections: SectionBuilder[] = [];

    for (let i = 0; i < blocks.length; i += 2) {
        const fields = [createMarkdownBlock(blocks[i])];
        if (i + 1 < blocks.length) fields.push(createMarkdownBlock(blocks[i + 1]));
        sections.push(Section().fields(fields));
    }

    return sections;
}

function createMarkdownBlock(block: Block) {
    return `*${block.title}*\n${block.desc}`;
}

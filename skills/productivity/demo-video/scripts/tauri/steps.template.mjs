// Copy next to your work and fill in. Pull env var names, ports and accent colour from memory/notes — don't hardcode.
// Selectors are WebdriverIO strings: 'aria/Exact accessible name', CSS, or XPath ('//button[contains(., "Save")]').
// Pacing (SKILL.md): caption the CAUSE → act → pause → reveal the RESULT → hold ≥2s (≥3s on the hero beat).
export default async function script({ browser, $, caption, section, sleep, click, type, scrollTo }) {
  // Wait for the app's first real screen; a boot screen or splash can sit in front of it.
  await browser.waitUntil(() => $('aria/CHANGE_ME landing element').isExisting(), { timeout: 30000 });
  await caption('One line on what this demo shows');
  await sleep(1800);

  await section('first beat', async () => {
    await caption('Open the thing'); // say what the click will do before it happens
    await sleep(700);
    await click('aria/CHANGE_ME');
    await sleep(2200); // hold on the result
  });

  // await section('type', async () => {
  //   await caption('Type a question');
  //   await type('textarea', 'What is on my calendar today?');
  //   await click('aria/Send');
  //   await scrollTo('aria/CHANGE_ME result'); // keep the consequence in frame
  //   await sleep(2500);
  // });

  await caption(''); // clear the caption for a clean last frame
  await sleep(1000);
}

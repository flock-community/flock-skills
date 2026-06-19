// Pull login creds / ports / brand color from your agent's memory or notes, or ask the user — do not hardcode.
// Flatten flickery modal backdrops at record time (no code in here):
//   INJECT_CSS='.MuiBackdrop-root{background-color:#1b1b1b !important}.MuiDialog-paper{box-shadow:none !important}'

// Steps get natural-driving helpers: click/type place the visible pointer + click; scrollTo/pan
// bring a result into view. Prefer them over raw locator.click() so the take reads as a person.
export default async function script({
  page, caption, section, sleep, click, type, scrollTo, BASE,
}) {
  // In-app drawer/menu navigation (SPA): no reload flash, and any INJECT_CSS survives.
  const menuNav = async (itemRe) => {
    await click(page, page.getByRole('button', { name: 'Menu' }));
    await sleep(page, 700);
    await click(page, page.locator('.MuiDrawer-root').getByRole('button', { name: itemRe }));
    await page.waitForLoadState('networkidle');
  };

  await section('login', async () => {
    await page.goto(`${BASE}/auth`); // the one place a hard nav is fine — entering the app
    await page.waitForLoadState('networkidle');
    const user = page.getByLabel('Username');
    if (await user.isVisible().catch(() => false)) {
      await caption(page, 'Sign in');
      await type(page, user, 'CHANGE_ME@example.com');
      await type(page, page.getByLabel('Password'), 'CHANGE_ME');
      await click(page, page.getByRole('button', { name: 'Sign in' }));
    }
    await page.waitForLoadState('networkidle');
    await sleep(page, 800);
  });

  await section('feature', async () => {
    await menuNav(/^Your Feature$/); // SPA nav, not page.goto — no flash, keeps INJECT_CSS
    await caption(page, 'Narrate what this screen shows');
    await sleep(page, 1400);

    // Causality beat: caption the CAUSE → act → pause → reveal the RESULT → hold so it sinks in.
    // await caption(page, 'Click "Add" to create one');
    // await sleep(page, 700);
    // await click(page, page.getByRole('button', { name: 'Add' }).first());
    // await scrollTo(page, page.getByText('New row')); // keep the consequence in frame
    // await caption(page, 'Result lands — hold ≥2s on the settled state');
    // await sleep(page, 2200);
  });

  await caption(page, 'Closing / summary beat');
  await sleep(page, 2500);
}
